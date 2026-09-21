-- Partial payments: never equate "amount collected" with "amount billed".
--
-- Bug: process_visit_payment did `amount = v_amount` (the collected amount), marked
-- the payment 'paid' and closed the visit. Collecting 300 on an 850 bill left a paid
-- 300 row and no trace of the missing 550 (visit 878b1b52, 2026-09-20).
--
-- Model after this migration (one row per visit, as before):
--   payments.amount       = BILLED amount. Never overwritten by a collection.
--   payments.amount_paid  = cumulative COLLECTED amount.
--   reste                 = amount - amount_paid
--   status 'pending'      until amount_paid = amount, then 'paid'.
--   visit stays in 'billing' (i.e. stays in the cashier queue with its "Reste à
--   payer") until the payment is fully collected, and only then becomes 'completed'.
--
-- process_visit_payment now also takes p_partial (default false). A collection lower
-- than the remaining balance is rejected unless the caller passes p_partial => true,
-- so a stale UI default can no longer short-pay a visit by accident.

alter table public.payments
  add column if not exists amount_paid numeric not null default 0;

update public.payments set amount_paid = amount where status = 'paid' and amount_paid = 0;

alter table public.payments drop constraint if exists payments_amount_paid_check;
alter table public.payments
  add constraint payments_amount_paid_check check (amount_paid >= 0 and amount_paid <= amount);

-- Other writers (e.g. record_payment_guarded) insert 'paid' rows without knowing about
-- amount_paid; keep the invariant "paid => fully collected" for them.
create or replace function public.mm_payments_sync_amount_paid()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'paid' and new.amount_paid < new.amount then
    new.amount_paid := new.amount;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_payments_sync_amount_paid on public.payments;
create trigger trg_payments_sync_amount_paid
  before insert or update of status, amount, amount_paid on public.payments
  for each row execute function public.mm_payments_sync_amount_paid();

drop function if exists public.process_visit_payment(uuid, text, numeric);

create or replace function public.process_visit_payment(
  p_visit_id uuid,
  p_method text,
  p_amount numeric default null,
  p_partial boolean default false
)
returns public.visits
language plpgsql
security definer
set search_path = public
as $$
declare
  visit_before public.visits%rowtype;
  visit_after public.visits%rowtype;
  payment_before public.payments%rowtype;
  payment_after public.payments%rowtype;
  v_remaining numeric;
  v_collect numeric;
  v_full boolean;
begin
  perform public.mm_assert_permission('billing.collect');

  if p_method not in ('cash', 'card', 'transfer', 'insurance', 'package', 'free') then
    raise exception 'invalid payment method';
  end if;

  select * into visit_before from public.visits where id = p_visit_id for update;
  if not found then raise exception 'visit not found'; end if;
  perform public.mm_assert_same_clinic(visit_before.clinic_id);

  if visit_before.status <> 'billing' then
    raise exception 'visit is not in billing';
  end if;

  select * into payment_before
  from public.payments
  where visit_id = p_visit_id and status = 'pending'
  order by created_at desc
  limit 1
  for update;

  if not found then raise exception 'pending payment not found'; end if;

  v_remaining := payment_before.amount - payment_before.amount_paid;
  if v_remaining <= 0 then raise exception 'nothing left to collect'; end if;

  v_collect := coalesce(p_amount, v_remaining);
  if v_collect <= 0 or v_collect > v_remaining then
    raise exception 'invalid payment amount: % exceeds remaining balance %', v_collect, v_remaining;
  end if;

  v_full := v_collect = v_remaining;
  if not v_full and not coalesce(p_partial, false) then
    raise exception 'partial payment must be explicit: collecting % of remaining % (pass p_partial => true)', v_collect, v_remaining;
  end if;

  update public.payments
  set amount_paid = amount_paid + v_collect,
      status = case when v_full then 'paid' else 'pending' end,
      method = p_method,
      received_by = auth.uid(),
      paid_at = now(),
      updated_at = now()
  where id = payment_before.id
  returning * into payment_after;

  if v_full then
    update public.visits
    set status = 'completed',
        completed_at = now(),
        updated_by = auth.uid(),
        updated_at = now()
    where id = p_visit_id
    returning * into visit_after;

    update public.consultations
    set statut = 'paye',
        updated_at = now()
    where id = payment_after.consultation_id;

    if visit_after.rdv_id is not null then
      update public.rdv
      set status = 'completed', payment_status = 'PAID'
      where id = visit_after.rdv_id and cabinet_id = visit_after.clinic_id;
    end if;
  else
    -- Short payment: the visit stays open in billing with its remaining balance.
    visit_after := visit_before;
  end if;

  perform public.write_audit_log(
    'PAYMENT_PROCESSED', 'payment', payment_after.id, to_jsonb(payment_before), to_jsonb(payment_after),
    jsonb_build_object(
      'billed', payment_after.amount,
      'collected', v_collect,
      'total_collected', payment_after.amount_paid,
      'remaining', payment_after.amount - payment_after.amount_paid,
      'partial', not v_full
    )
  );
  if v_full then
    perform public.write_audit_log('PATIENT_PAID', 'visit', p_visit_id, to_jsonb(visit_before), to_jsonb(visit_after), null);
  end if;

  return visit_after;
end;
$$;

revoke all on function public.process_visit_payment(uuid, text, numeric, boolean) from public, anon;
grant execute on function public.process_visit_payment(uuid, text, numeric, boolean) to authenticated, service_role;
