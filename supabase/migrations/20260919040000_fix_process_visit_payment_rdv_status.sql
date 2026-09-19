-- process_visit_payment set rdv.status = 'termine' when a visit linked to an
-- appointment was paid. rdv_status_check only allows
-- (scheduled, confirme, cancelled, no_show, completed), so paying ANY visit that
-- has an rdv_id failed with a check-constraint violation and the cashier could
-- not collect. Reproduced in a rolled-back test.
--
-- The only change vs the previous body is the final rdv update:
--   status = 'completed', payment_status = 'PAID'   (both valid values)
-- Everything else (permission, clinic guard, pending-payment lookup, amount
-- rules, audit) is unchanged.

create or replace function public.process_visit_payment(p_visit_id uuid, p_method text, p_amount numeric default null)
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
  v_amount numeric;
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

  v_amount := coalesce(p_amount, payment_before.amount);
  if v_amount <= 0 or v_amount > payment_before.amount then
    raise exception 'invalid payment amount';
  end if;

  update public.payments
  set status = 'paid',
      method = p_method,
      amount = v_amount,
      received_by = auth.uid(),
      paid_at = now(),
      updated_at = now()
  where id = payment_before.id
  returning * into payment_after;

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

  perform public.write_audit_log('PAYMENT_PROCESSED', 'payment', payment_after.id, to_jsonb(payment_before), to_jsonb(payment_after), null);
  perform public.write_audit_log('PATIENT_PAID', 'visit', p_visit_id, to_jsonb(visit_before), to_jsonb(visit_after), null);

  return visit_after;
end;
$$;
