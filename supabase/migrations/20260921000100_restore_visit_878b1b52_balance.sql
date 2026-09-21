-- One-off data correction for the short payment that process_visit_payment closed as
-- fully paid (see 20260921000000_partial_payments.sql).
--
-- Visit 878b1b52 was sent to billing at 850 MAD (audit PATIENT_READY_FOR_PAYMENT,
-- encounter 7d870e49). The cashier collected 300; the old RPC rewrote the payment to
-- amount = 300, status 'paid' and completed the visit, losing 550 MAD
-- (audit PAYMENT_PROCESSED 2026-09-20 13:33:59: pending amount 850 -> paid amount 300).
--
-- Restore: billed 850, collected 300 (unchanged), remaining 550, payment pending,
-- visit back in billing so it is collectable. Guarded so it only fires on the exact
-- broken state (no-op on any other environment).

do $$
declare
  v_before public.payments%rowtype;
  v_after public.payments%rowtype;
begin
  select * into v_before
  from public.payments
  where visit_id = '878b1b52-439d-478a-8e4c-4243a0231b30'
    and status = 'paid' and amount = 300 and amount_paid = 300
  for update;

  if not found then
    return;
  end if;

  update public.payments
  set amount = 850, amount_paid = 300, status = 'pending', updated_at = now()
  where id = v_before.id
  returning * into v_after;

  update public.visits
  set status = 'billing', completed_at = null, updated_at = now()
  where id = v_before.visit_id and status = 'completed';

  insert into public.audit_logs (clinic_id, actor_id, actor_role, action, entity_type, entity_id, before, after, metadata)
  values (
    v_before.clinic_id, null, 'system', 'PAYMENT_BALANCE_RESTORED', 'payment', v_before.id,
    to_jsonb(v_before), to_jsonb(v_after),
    jsonb_build_object(
      'reason', 'short payment was recorded as fully paid; billed amount restored from audit log',
      'billed', 850, 'collected', 300, 'remaining', 550
    )
  );
end;
$$;
