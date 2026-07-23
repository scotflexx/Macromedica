-- ============================================================
-- Fix: clinics/cabinets FK violations during patient-flow migration
--
-- Run BEFORE 20260616_patient_flow_rbac.sql if you see errors like:
--   profiles_clinic_id_fkey  (clinic_id not in clinics)
--   clinics_owner_id_fkey    (owner_id not in users)
-- ============================================================

create extension if not exists pgcrypto;

-- Pick a valid auth.users id for clinic/cabinet ownership.
-- Prefers tenant_id when it exists in auth.users, else a profile linked to the cabinet.
create or replace function public.mm_resolve_owner_id(p_candidate uuid, p_tenant_id uuid default null)
returns uuid
language sql
stable
security definer
set search_path = public, auth
as $$
  select coalesce(
    (select u.id from auth.users u where u.id = p_candidate limit 1),
    (select u.id from auth.users u where u.id = p_tenant_id limit 1),
    (
      select p.id
      from public.profiles p
      where (p.cabinet_id = p_candidate or p.clinic_id = p_candidate)
        and exists (select 1 from auth.users u where u.id = p.id)
      order by p.created_at nulls last
      limit 1
    )
  );
$$;

create or replace function public.mm_sync_cabinets_clinics()
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  has_clinics boolean;
  has_cabinets boolean;
begin
  select exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'clinics'
  ) into has_clinics;

  select exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'cabinets'
  ) into has_cabinets;

  if not has_clinics then
    return;
  end if;

  -- profiles.cabinet_id -> clinics (owner = real auth user, not orphan seed tenant_id)
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'clinics' and column_name = 'owner_id'
  ) then
    begin
      insert into public.clinics (id, owner_id, name)
      select distinct on (p.cabinet_id)
        p.cabinet_id,
        public.mm_resolve_owner_id(p.id, p.cabinet_id),
        'MacroMedica'
      from public.profiles p
      where p.cabinet_id is not null
        and not exists (select 1 from public.clinics cl where cl.id = p.cabinet_id)
        and public.mm_resolve_owner_id(p.id, p.cabinet_id) is not null
      order by p.cabinet_id, p.created_at nulls last
      on conflict (id) do nothing;
    exception
      when undefined_column then
        begin
          insert into public.clinics (id, owner_id, nom)
          select distinct on (p.cabinet_id)
            p.cabinet_id,
            public.mm_resolve_owner_id(p.id, p.cabinet_id),
            'MacroMedica'
          from public.profiles p
          where p.cabinet_id is not null
            and not exists (select 1 from public.clinics cl where cl.id = p.cabinet_id)
            and public.mm_resolve_owner_id(p.id, p.cabinet_id) is not null
          order by p.cabinet_id, p.created_at nulls last
          on conflict (id) do nothing;
        exception
          when undefined_column then
            insert into public.clinics (id, owner_id)
            select distinct on (p.cabinet_id)
              p.cabinet_id,
              public.mm_resolve_owner_id(p.id, p.cabinet_id)
            from public.profiles p
            where p.cabinet_id is not null
              and not exists (select 1 from public.clinics cl where cl.id = p.cabinet_id)
              and public.mm_resolve_owner_id(p.id, p.cabinet_id) is not null
            order by p.cabinet_id, p.created_at nulls last
            on conflict (id) do nothing;
        end;
    end;
  end if;

  if has_cabinets then
    -- cabinets -> clinics (only when owner resolves to a real auth user)
    begin
      insert into public.clinics (id, owner_id, name)
      select
        c.id,
        public.mm_resolve_owner_id(c.id, c.tenant_id),
        coalesce(c.nom, 'MacroMedica')
      from public.cabinets c
      where not exists (select 1 from public.clinics cl where cl.id = c.id)
        and public.mm_resolve_owner_id(c.id, c.tenant_id) is not null
      on conflict (id) do nothing;
    exception
      when undefined_column then
        begin
          insert into public.clinics (id, owner_id, nom)
          select
            c.id,
            public.mm_resolve_owner_id(c.id, c.tenant_id),
            coalesce(c.nom, 'MacroMedica')
          from public.cabinets c
          where not exists (select 1 from public.clinics cl where cl.id = c.id)
            and public.mm_resolve_owner_id(c.id, c.tenant_id) is not null
          on conflict (id) do nothing;
        exception
          when undefined_column then
            insert into public.clinics (id, owner_id)
            select
              c.id,
              public.mm_resolve_owner_id(c.id, c.tenant_id)
            from public.cabinets c
            where not exists (select 1 from public.clinics cl where cl.id = c.id)
              and public.mm_resolve_owner_id(c.id, c.tenant_id) is not null
            on conflict (id) do nothing;
        end;
    end;

    -- clinics -> cabinets (tenant_id must exist in auth.users)
    if exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'cabinets' and column_name = 'tenant_id'
    ) then
      begin
        insert into public.cabinets (id, tenant_id, nom)
        select cl.id, cl.owner_id, coalesce(cl.name, 'MacroMedica')
        from public.clinics cl
        where not exists (select 1 from public.cabinets ca where ca.id = cl.id)
          and exists (select 1 from auth.users u where u.id = cl.owner_id)
        on conflict (id) do nothing;
      exception
        when undefined_column then
          insert into public.cabinets (id, tenant_id, nom)
          select cl.id, cl.owner_id, coalesce(cl.nom, 'MacroMedica')
          from public.clinics cl
          where not exists (select 1 from public.cabinets ca where ca.id = cl.id)
            and exists (select 1 from auth.users u where u.id = cl.owner_id)
          on conflict (id) do nothing;
      end;

      insert into public.cabinets (id, tenant_id, nom)
      select distinct on (p.cabinet_id)
        p.cabinet_id,
        public.mm_resolve_owner_id(p.id, p.cabinet_id),
        'MacroMedica'
      from public.profiles p
      where p.cabinet_id is not null
        and not exists (select 1 from public.cabinets ca where ca.id = p.cabinet_id)
        and public.mm_resolve_owner_id(p.id, p.cabinet_id) is not null
      order by p.cabinet_id, p.created_at nulls last
      on conflict (id) do nothing;
    end if;
  end if;
end;
$$;

select public.mm_sync_cabinets_clinics();

update public.profiles p
set clinic_id = p.cabinet_id
where p.clinic_id is null
  and p.cabinet_id is not null
  and exists (
    select 1 from public.clinics cl where cl.id = p.cabinet_id
  );
