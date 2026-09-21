-- Fix cabinet ownership + profile links for secretary invite.
-- Run in Supabase SQL Editor (safe to re-run).
-- Works whether clinics uses "name" or "nom".

create or replace function public.current_clinic_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(p.clinic_id, p.cabinet_id)
  from public.profiles p
  where p.id = auth.uid()
  limit 1
$$;

grant execute on function public.current_clinic_id() to authenticated, anon;

create or replace function public.mm_assert_same_clinic(p_clinic_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_my_clinic uuid;
begin
  v_my_clinic := public.current_clinic_id();
  
  if p_clinic_id is not null and v_my_clinic is not null and p_clinic_id is distinct from v_my_clinic then
    perform public.write_audit_log(
      'CROSS_CLINIC_ACCESS_BLOCKED',
      'security',
      null,
      null,
      null,
      jsonb_build_object('target_clinic_id', p_clinic_id, 'user_clinic_id', v_my_clinic)
    );
    raise exception 'cross-clinic access denied';
  end if;
end;
$$;

grant execute on function public.mm_assert_same_clinic(uuid) to authenticated;

create or replace function public.create_walk_in_visit(p_patient_id uuid, p_doctor_id uuid)
returns visits
language plpgsql
security definer
set search_path = public
as $$
declare
  patient_clinic uuid;
  doctor_clinic uuid;
  effective_clinic uuid;
  qn integer;
  visit_row public.visits%rowtype;
begin
  if not (public.is_admin() or public.mm_has_permission('waiting_room.add_patient')) then
    raise exception 'not authorized';
  end if;

  select coalesce(p.clinic_id, p.cabinet_id) into patient_clinic from public.patients p where p.id = p_patient_id;
  
  select coalesce(pr.clinic_id, pr.cabinet_id) into doctor_clinic
  from public.profiles pr
  where pr.id = p_doctor_id;

  effective_clinic := coalesce(patient_clinic, doctor_clinic, public.current_clinic_id());

  if effective_clinic is null then
    raise exception 'cabinet introuvable';
  end if;

  if patient_clinic is not null and doctor_clinic is not null and patient_clinic is distinct from doctor_clinic then
    raise exception 'doctor must belong to the same clinic';
  end if;

  perform public.mm_assert_same_clinic(effective_clinic);

  qn := public.mm_next_queue_number(effective_clinic, p_doctor_id, current_date);

  insert into public.visits (
    clinic_id, patient_id, source, doctor_id, status,
    queue_date, queue_number, queue_sort_at, queued_at, arrived_at, waiting_at,
    created_by, updated_by
  )
  values (
    effective_clinic, p_patient_id, 'walk_in', p_doctor_id, 'waiting',
    current_date, qn, now(), now(), now(), now(), auth.uid(), auth.uid()
  )
  returning * into visit_row;

  perform public.write_audit_log('VISIT_CREATED_WALK_IN', 'visit', visit_row.id, null, to_jsonb(visit_row), null);
  perform public.write_audit_log('PATIENT_WAITING', 'visit', visit_row.id, null, to_jsonb(visit_row), null);

  return visit_row;
end;
$$;

grant execute on function public.create_walk_in_visit(uuid, uuid) to authenticated;

create or replace function public.add_to_waiting_room(p_rdv_id uuid)
returns rdv
language plpgsql
security definer
set search_path = public
as $$
declare
  rdv_before public.rdv%rowtype;
  rdv_after public.rdv%rowtype;
  effective_clinic uuid;
begin
  select * into rdv_before from public.rdv where id = p_rdv_id for update;
  if not found then raise exception 'appointment not found'; end if;

  perform public.mm_assert_permission('waiting_room.add_patient');
  
  effective_clinic := coalesce(rdv_before.cabinet_id, public.current_clinic_id());
  if effective_clinic is not null then
    perform public.mm_assert_same_clinic(effective_clinic);
  end if;

  if rdv_before.arrival_status != 'NOT_ARRIVED' then
    raise exception 'patient has already arrived or left';
  end if;

  update public.rdv
  set arrival_status = 'WAITING',
      arrived_at = now()
  where id = p_rdv_id
  returning * into rdv_after;

  perform public.write_audit_log('PATIENT_WAITING', 'rdv', p_rdv_id, to_jsonb(rdv_before), to_jsonb(rdv_after), null);

  return rdv_after;
end;
$$;

grant execute on function public.add_to_waiting_room(uuid) to authenticated;

create or replace function public.mm_role_key(raw_role text)
returns text
language sql
immutable
as $$
  select case lower(coalesce(raw_role, ''))
    when 'admin' then 'admin'
    when 'doctor' then 'doctor'
    when 'docteur' then 'doctor'
    when 'medecin' then 'doctor'
    when 'médecin' then 'doctor'
    when 'secretary' then 'secretary'
    when 'secretaire' then 'secretary'
    when 'secrétaire' then 'secretary'
    else lower(coalesce(raw_role, ''))
  end
$$;

-- Re-use full sync if already installed (from fix_clinics_cabinets_fk.sql)
do $run$
begin
  if exists (
    select 1 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'mm_sync_cabinets_clinics'
  ) then
    perform public.mm_sync_cabinets_clinics();
  end if;
end;
$run$;

-- Sync clinics from doctor profiles (clinics.name OR clinics.nom)
do $clinics$
declare
  has_name boolean;
  has_nom boolean;
begin
  select exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'clinics' and column_name = 'name'
  ) into has_name;

  select exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'clinics' and column_name = 'nom'
  ) into has_nom;

  if has_name then
    execute $sql$
      insert into public.clinics (id, owner_id, name)
      select distinct on (p.cabinet_id)
        p.cabinet_id,
        p.id,
        coalesce(c.nom, 'MacroMedica')
      from public.profiles p
      left join public.cabinets c on c.id = p.cabinet_id
      where p.cabinet_id is not null
        and public.mm_role_key(p.role) = 'doctor'
        and not exists (select 1 from public.clinics cl where cl.id = p.cabinet_id)
      order by p.cabinet_id
      on conflict (id) do nothing
    $sql$;
  elsif has_nom then
    execute $sql$
      insert into public.clinics (id, owner_id, nom)
      select distinct on (p.cabinet_id)
        p.cabinet_id,
        p.id,
        coalesce(c.nom, 'MacroMedica')
      from public.profiles p
      left join public.cabinets c on c.id = p.cabinet_id
      where p.cabinet_id is not null
        and public.mm_role_key(p.role) = 'doctor'
        and not exists (select 1 from public.clinics cl where cl.id = p.cabinet_id)
      order by p.cabinet_id
      on conflict (id) do nothing
    $sql$;
  else
    execute $sql$
      insert into public.clinics (id, owner_id)
      select distinct on (p.cabinet_id)
        p.cabinet_id,
        p.id
      from public.profiles p
      where p.cabinet_id is not null
        and public.mm_role_key(p.role) = 'doctor'
        and not exists (select 1 from public.clinics cl where cl.id = p.cabinet_id)
      order by p.cabinet_id
      on conflict (id) do nothing
    $sql$;
  end if;
end;
$clinics$;

-- Sync cabinets from clinics (only reference columns that exist)
do $cabinets$
declare
  clinic_label_col text;
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'clinics' and column_name = 'name'
  ) then
    clinic_label_col := 'name';
  elsif exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'clinics' and column_name = 'nom'
  ) then
    clinic_label_col := 'nom';
  else
    clinic_label_col := null;
  end if;

  if clinic_label_col is not null then
    execute format(
      $sql$
      insert into public.cabinets (id, tenant_id, nom)
      select cl.id, cl.owner_id, coalesce(cl.%I, 'MacroMedica')
      from public.clinics cl
      where cl.owner_id is not null
        and not exists (select 1 from public.cabinets ca where ca.id = cl.id)
      on conflict (id) do nothing
      $sql$,
      clinic_label_col
    );
  else
    insert into public.cabinets (id, tenant_id, nom)
    select cl.id, cl.owner_id, 'MacroMedica'
    from public.clinics cl
    where cl.owner_id is not null
      and not exists (select 1 from public.cabinets ca where ca.id = cl.id)
    on conflict (id) do nothing;
  end if;
end;
$cabinets$;

-- Align owners
update public.clinics cl
set owner_id = p.id
from public.profiles p
where p.cabinet_id = cl.id
  and public.mm_role_key(p.role) = 'doctor'
  and cl.owner_id is distinct from p.id;

update public.cabinets c
set tenant_id = p.id
from public.profiles p
where p.cabinet_id = c.id
  and public.mm_role_key(p.role) = 'doctor'
  and c.tenant_id is distinct from p.id;

update public.cabinets c
set tenant_id = cl.owner_id
from public.clinics cl
where cl.id = c.id
  and cl.owner_id is not null
  and c.tenant_id is distinct from cl.owner_id;

-- Mirror clinic_id and cabinet_id across all profiles
update public.profiles p
set clinic_id = p.cabinet_id
where p.cabinet_id is not null
  and (p.clinic_id is null or p.clinic_id is distinct from p.cabinet_id);

update public.profiles p
set cabinet_id = p.clinic_id
where p.clinic_id is not null
  and (p.cabinet_id is null or p.cabinet_id is distinct from p.clinic_id);

-- Verify: should return 0 rows
select
  p.id as doctor_id,
  p.nom_complet,
  p.cabinet_id,
  p.clinic_id,
  c.tenant_id as cabinet_tenant,
  cl.owner_id as clinic_owner
from public.profiles p
left join public.cabinets c on c.id = p.cabinet_id
left join public.clinics cl on cl.id = p.cabinet_id
where public.mm_role_key(p.role) = 'doctor'
  and p.cabinet_id is not null
  and coalesce(c.tenant_id, cl.owner_id) is distinct from p.id;
