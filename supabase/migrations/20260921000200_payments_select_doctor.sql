-- Doctors could not read payment rows although they hold billing.view / billing.collect.
--
-- payments_select (permissive) only admitted the 'admin' and 'secretary' roles, so a doctor
-- session saw 0 rows of `payments`. The dashboard queue and the Facturation page therefore
-- had no billed / collected amounts for a doctor (balances fell back to a default 300) even
-- though process_visit_payment, which is SECURITY DEFINER, still let the doctor collect.
--
-- The restrictive policy payments_view_permission_gate keeps requiring billing.view for every
-- non-admin, and the clinic scope is unchanged. Only the role list gains 'doctor'.
-- Writes stay blocked (payments_no_direct_write): payments only change through the RPCs.

drop policy if exists payments_select on public.payments;

create policy payments_select on public.payments
  for select
  using (
    clinic_id = public.current_clinic_id()
    and public.current_role() = any (array['admin', 'secretary', 'doctor'])
  );
