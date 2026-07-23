-- ============================================================
-- Phase 1 patch — run AFTER 20260616_patient_flow_rbac.sql
--
-- Adds: admin_override_consultation_lock, consultations RLS,
--        RPC grants for authenticated role.
-- ============================================================

-- ---------- Admin lock override ----------

create or replace function public.admin_override_consultation_lock(p_consultation_id uuid)
returns public.consultations
language plpgsql
security definer
set search_path = public
as $$
declare
  consultation_before public.consultations%rowtype;
  consultation_after public.consultations%rowtype;
begin
  if not public.is_admin() then
    raise exception 'admin only';
  end if;

  select * into consultation_before
  from public.consultations
  where id = p_consultation_id
  for update;

  if not found then
    raise exception 'consultation not found';
  end if;

  perform public.mm_assert_same_clinic(coalesce(consultation_before.clinic_id, consultation_before.cabinet_id));

  update public.consultations
  set locked_by = auth.uid(),
      locked_at = now(),
      lock_expires_at = now() + interval '8 minutes',
      updated_at = now()
  where id = p_consultation_id
  returning * into consultation_after;

  perform public.write_audit_log(
    'LOCK_TAKEN_OVER',
    'consultation',
    p_consultation_id,
    to_jsonb(consultation_before),
    to_jsonb(consultation_after),
    jsonb_build_object('override_by', auth.uid())
  );

  return consultation_after;
end;
$$;

-- ---------- Consultations RLS (secretary cannot read clinical rows) ----------

do $$
declare
  pol record;
begin
  for pol in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = 'consultations'
  loop
    execute format('drop policy if exists %I on %I.%I', pol.policyname, pol.schemaname, pol.tablename);
  end loop;
end $$;

alter table public.consultations enable row level security;

create policy consultations_doctor_select on public.consultations
for select to authenticated
using (
  coalesce(clinic_id, cabinet_id) = public.current_clinic_id()
  and public.current_role() = 'doctor'
  and doctor_id = auth.uid()
);

create policy consultations_admin_select on public.consultations
for select to authenticated
using (
  coalesce(clinic_id, cabinet_id) = public.current_clinic_id()
  and public.is_admin()
);

create policy consultations_no_direct_write on public.consultations
for all to authenticated
using (false)
with check (false);

-- ---------- RPC grants ----------

grant execute on function public.create_visit_from_rdv(uuid, uuid) to authenticated;
grant execute on function public.create_walk_in_visit(uuid, uuid) to authenticated;
grant execute on function public.reassign_visit_doctor(uuid, uuid) to authenticated;
grant execute on function public.call_patient(uuid) to authenticated;
grant execute on function public.open_consultation(uuid) to authenticated;
grant execute on function public.refresh_consultation_lock(uuid) to authenticated;
grant execute on function public.release_consultation_lock(uuid) to authenticated;
grant execute on function public.admin_override_consultation_lock(uuid) to authenticated;
grant execute on function public.complete_consultation(uuid, text, text, text, text, numeric, text) to authenticated;
grant execute on function public.process_visit_payment(uuid, text, numeric) to authenticated;
grant execute on function public.cancel_visit(uuid, text) to authenticated;
