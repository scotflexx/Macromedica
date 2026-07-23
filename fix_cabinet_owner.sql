-- Fix cabinet ownership + profile links for secretary invite.
-- Run in Supabase SQL Editor (safe to re-run).
-- Works whether clinics uses "name" or "nom".

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

-- Mirror clinic_id on doctor profiles
update public.profiles p
set clinic_id = p.cabinet_id
where p.cabinet_id is not null
  and public.mm_role_key(p.role) = 'doctor'
  and p.clinic_id is distinct from p.cabinet_id;

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
