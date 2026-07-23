-- ============================================================
-- Appointment scheduling RPCs (rdv layer)
-- Secretary/admin only — audited, clinic-scoped.
-- Run after 20260616_patient_flow_rbac.sql
-- ============================================================

create or replace function public.confirm_appointment(p_rdv_id uuid)
returns public.rdv
language plpgsql
security definer
set search_path = public
as $$
declare
  rdv_before public.rdv%rowtype;
  rdv_after public.rdv%rowtype;
begin
  perform public.mm_assert_role(array['secretary', 'admin']);

  select * into rdv_before from public.rdv where id = p_rdv_id for update;
  if not found then raise exception 'appointment not found'; end if;
  perform public.mm_assert_same_clinic(rdv_before.cabinet_id);

  if coalesce(rdv_before.status, rdv_before.statut) in ('annule', 'cancelled') then
    raise exception 'cannot confirm a cancelled appointment';
  end if;

  update public.rdv
  set status = 'confirme'
  where id = p_rdv_id
  returning * into rdv_after;

  perform public.write_audit_log(
    'APPOINTMENT_CONFIRMED', 'rdv', p_rdv_id,
    to_jsonb(rdv_before), to_jsonb(rdv_after), null
  );

  return rdv_after;
end;
$$;

create or replace function public.cancel_appointment(p_rdv_id uuid, p_reason text default null)
returns public.rdv
language plpgsql
security definer
set search_path = public
as $$
declare
  rdv_before public.rdv%rowtype;
  rdv_after public.rdv%rowtype;
  active_visit_id uuid;
begin
  perform public.mm_assert_role(array['secretary', 'admin']);

  select * into rdv_before from public.rdv where id = p_rdv_id for update;
  if not found then raise exception 'appointment not found'; end if;
  perform public.mm_assert_same_clinic(rdv_before.cabinet_id);

  select v.id into active_visit_id
  from public.visits v
  where v.rdv_id = p_rdv_id
    and v.status not in ('completed', 'cancelled')
  limit 1;

  if active_visit_id is not null then
    raise exception 'cannot cancel appointment with an active visit';
  end if;

  update public.rdv
  set status = 'annule'
  where id = p_rdv_id
  returning * into rdv_after;

  perform public.write_audit_log(
    'APPOINTMENT_CANCELLED', 'rdv', p_rdv_id,
    to_jsonb(rdv_before), to_jsonb(rdv_after),
    jsonb_build_object('reason', p_reason)
  );

  return rdv_after;
end;
$$;

create or replace function public.reschedule_appointment(p_rdv_id uuid, p_scheduled_at timestamptz)
returns public.rdv
language plpgsql
security definer
set search_path = public
as $$
declare
  rdv_before public.rdv%rowtype;
  rdv_after public.rdv%rowtype;
begin
  perform public.mm_assert_role(array['secretary', 'admin']);

  if p_scheduled_at is null then
    raise exception 'scheduled_at is required';
  end if;

  select * into rdv_before from public.rdv where id = p_rdv_id for update;
  if not found then raise exception 'appointment not found'; end if;
  perform public.mm_assert_same_clinic(rdv_before.cabinet_id);

  update public.rdv
  set date_rdv = p_scheduled_at
  where id = p_rdv_id
  returning * into rdv_after;

  perform public.write_audit_log(
    'APPOINTMENT_RESCHEDULED', 'rdv', p_rdv_id,
    to_jsonb(rdv_before), to_jsonb(rdv_after),
    jsonb_build_object('scheduled_at', p_scheduled_at)
  );

  return rdv_after;
end;
$$;

grant execute on function public.confirm_appointment(uuid) to authenticated;
grant execute on function public.cancel_appointment(uuid, text) to authenticated;
grant execute on function public.reschedule_appointment(uuid, timestamptz) to authenticated;
