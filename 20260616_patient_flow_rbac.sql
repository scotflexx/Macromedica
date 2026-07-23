-- ============================================================
-- MacroMedica patient-flow architecture
-- Multi-doctor visits, RBAC helpers, RLS, workflow RPCs,
-- consultation locks, billing queue and audit traceability.
--
-- This migration is additive and keeps the existing UI/schema
-- conventions alive: the product still has cabinets/profiles/rdv,
-- while visits become the operational source of truth.
-- ============================================================

create extension if not exists pgcrypto;

-- ---------- Clinics / cabinets compatibility ----------
-- Some databases use public.clinics (profiles.clinic_id FK) alongside public.cabinets.
-- Sync tenant rows in both directions before any clinic_id backfill.

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

-- ---------- Utility helpers ----------

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

create or replace function public.current_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select public.mm_role_key(p.role)
  from public.profiles p
  where p.id = auth.uid()
  limit 1
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
as $$
  select public.current_role() = 'admin'
$$;

create or replace function public.has_any_role(required_roles text[])
returns boolean
language sql
stable
as $$
  select public.current_role() = 'admin'
    or public.current_role() = any(required_roles)
$$;

-- ---------- Profiles compatibility ----------

alter table public.profiles add column if not exists clinic_id uuid;
alter table public.profiles add column if not exists first_name text;
alter table public.profiles add column if not exists last_name text;
alter table public.profiles add column if not exists email text;
alter table public.profiles add column if not exists status text not null default 'active';
alter table public.profiles add column if not exists updated_at timestamptz not null default now();

select public.mm_sync_cabinets_clinics();

update public.profiles p
set clinic_id = p.cabinet_id
where p.clinic_id is null
  and p.cabinet_id is not null
  and (
    not exists (
      select 1 from information_schema.tables
      where table_schema = 'public' and table_name = 'clinics'
    )
    or exists (
      select 1 from public.clinics cl where cl.id = p.cabinet_id
    )
  );

update public.profiles
set
  first_name = coalesce(first_name, split_part(coalesce(nom_complet, ''), ' ', 1)),
  last_name = coalesce(nullif(last_name, ''), nullif(trim(regexp_replace(coalesce(nom_complet, ''), '^\S+\s*', '')), ''))
where first_name is null or last_name is null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'profiles_status_check'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_status_check check (status in ('active', 'disabled'));
  end if;
end $$;

create index if not exists idx_profiles_clinic_role on public.profiles(coalesce(clinic_id, cabinet_id), role);

-- ---------- Invitations ----------

create table if not exists public.invitations (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.cabinets(id) on delete cascade,
  invited_by uuid not null references public.profiles(id) on delete restrict,
  first_name text not null,
  last_name text not null,
  email text not null,
  role text not null check (role in ('doctor', 'secretary', 'medecin', 'docteur', 'secretaire')),
  token_hash text not null unique,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'expired', 'revoked')),
  expires_at timestamptz not null,
  accepted_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_invitations_clinic_status on public.invitations(clinic_id, status);
create index if not exists idx_invitations_email on public.invitations(lower(email));

-- ---------- Appointments compatibility ----------
-- The current platform uses public.rdv for appointments. This table is
-- introduced for the normalized target model, while rdv remains active.

create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.cabinets(id) on delete cascade,
  patient_id uuid not null references public.patients(id) on delete restrict,
  doctor_id uuid references public.profiles(id) on delete set null,
  scheduled_at timestamptz not null,
  reason text,
  status text not null default 'scheduled' check (status in ('scheduled', 'cancelled', 'completed', 'no_show')),
  created_by uuid references public.profiles(id) on delete set null,
  cancelled_by uuid references public.profiles(id) on delete set null,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_appointments_clinic_date on public.appointments(clinic_id, scheduled_at);
create index if not exists idx_appointments_clinic_doctor_date on public.appointments(clinic_id, doctor_id, scheduled_at);
create index if not exists idx_appointments_clinic_status on public.appointments(clinic_id, status);

-- ---------- Visits ----------

create table if not exists public.visits (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.cabinets(id) on delete cascade,
  patient_id uuid not null references public.patients(id) on delete restrict,
  appointment_id uuid references public.appointments(id) on delete set null,
  rdv_id uuid references public.rdv(id) on delete set null,
  source text not null check (source in ('appointment', 'walk_in')),
  doctor_id uuid not null references public.profiles(id) on delete restrict,
  status text not null check (
    status in ('scheduled', 'arrived', 'waiting', 'called', 'consultation', 'billing', 'completed', 'cancelled')
  ),
  queue_date date not null default current_date,
  queue_number integer,
  queue_sort_at timestamptz,
  queued_at timestamptz,
  arrived_at timestamptz,
  waiting_at timestamptz,
  called_at timestamptz,
  consultation_start_at timestamptz,
  consultation_end_at timestamptz,
  billing_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (clinic_id, doctor_id, queue_date, queue_number)
);

create index if not exists idx_visits_clinic_status on public.visits(clinic_id, status);
create index if not exists idx_visits_doctor_queue on public.visits(clinic_id, doctor_id, queue_date, status, queue_number);
create index if not exists idx_visits_rdv on public.visits(rdv_id);
create index if not exists idx_visits_patient on public.visits(clinic_id, patient_id, created_at desc);

-- ---------- Consultations future-ready compatibility ----------

alter table public.consultations add column if not exists clinic_id uuid references public.cabinets(id) on delete cascade;
alter table public.consultations add column if not exists visit_id uuid references public.visits(id) on delete set null;
alter table public.consultations add column if not exists rdv_id uuid references public.rdv(id) on delete set null;
alter table public.consultations add column if not exists doctor_id uuid references public.profiles(id) on delete set null;
alter table public.consultations add column if not exists chief_complaint text;
alter table public.consultations add column if not exists diagnosis text;
alter table public.consultations add column if not exists treatment text;
alter table public.consultations add column if not exists billing_amount numeric(12,2) not null default 0;
alter table public.consultations add column if not exists billing_type text not null default 'cash';
alter table public.consultations add column if not exists status text not null default 'draft';
alter table public.consultations add column if not exists version integer not null default 1;
alter table public.consultations add column if not exists locked_by uuid references public.profiles(id) on delete set null;
alter table public.consultations add column if not exists locked_at timestamptz;
alter table public.consultations add column if not exists lock_expires_at timestamptz;
alter table public.consultations add column if not exists started_at timestamptz;
alter table public.consultations add column if not exists completed_at timestamptz;
alter table public.consultations add column if not exists updated_at timestamptz not null default now();

update public.consultations
set clinic_id = cabinet_id
where clinic_id is null and cabinet_id is not null;

update public.consultations
set billing_amount = coalesce(nullif(montant, 0), billing_amount, 0)
where montant is not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'consultations_billing_type_check'
      and conrelid = 'public.consultations'::regclass
  ) then
    alter table public.consultations
      add constraint consultations_billing_type_check
      check (billing_type in ('cash', 'insurance', 'package', 'free'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'consultations_status_check'
      and conrelid = 'public.consultations'::regclass
  ) then
    alter table public.consultations
      add constraint consultations_status_check
      check (status in ('draft', 'completed', 'amended', 'voided'));
  end if;
end $$;

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'consultations' and column_name = 'visit_id'
  ) then
    execute 'create unique index if not exists idx_consultations_visit_unique on public.consultations(visit_id) where visit_id is not null';
  end if;
end $$;

create index if not exists idx_consultations_clinic_doctor on public.consultations(coalesce(clinic_id, cabinet_id), doctor_id);

-- ---------- Payments ----------
-- Legacy DBs may have an older public.payments table without visit_id.

do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'payments'
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'payments' and column_name = 'visit_id'
  ) then
    alter table public.payments rename to payments_legacy;
  end if;
end $$;

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.cabinets(id) on delete cascade,
  visit_id uuid not null references public.visits(id) on delete restrict,
  consultation_id uuid references public.consultations(id) on delete set null,
  patient_id uuid not null references public.patients(id) on delete restrict,
  amount numeric(12,2) not null default 0,
  method text check (method in ('cash', 'card', 'transfer', 'insurance', 'package', 'free')),
  status text not null default 'pending' check (status in ('pending', 'paid', 'waived', 'cancelled', 'refunded')),
  received_by uuid references public.profiles(id) on delete set null,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.payments add column if not exists clinic_id uuid references public.cabinets(id) on delete cascade;
alter table public.payments add column if not exists visit_id uuid references public.visits(id) on delete restrict;
alter table public.payments add column if not exists consultation_id uuid references public.consultations(id) on delete set null;
alter table public.payments add column if not exists patient_id uuid references public.patients(id) on delete restrict;
alter table public.payments add column if not exists amount numeric(12,2) not null default 0;
alter table public.payments add column if not exists method text;
alter table public.payments add column if not exists status text not null default 'pending';
alter table public.payments add column if not exists received_by uuid references public.profiles(id) on delete set null;
alter table public.payments add column if not exists paid_at timestamptz;
alter table public.payments add column if not exists updated_at timestamptz not null default now();

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'payments_status_check'
      and conrelid = 'public.payments'::regclass
  ) then
    alter table public.payments
      add constraint payments_status_check
      check (status in ('pending', 'paid', 'waived', 'cancelled', 'refunded'));
  end if;
exception
  when duplicate_object then null;
end $$;

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'payments' and column_name = 'visit_id'
  ) then
    execute 'create unique index if not exists idx_payments_visit_active on public.payments(visit_id) where status in (''pending'', ''paid'', ''waived'')';
  end if;
end $$;

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'payments' and column_name = 'clinic_id'
  ) then
    execute 'create index if not exists idx_payments_clinic_status on public.payments(clinic_id, status)';
  end if;
end $$;

-- ---------- Audit logs compatibility ----------

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid references public.cabinets(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  actor_role text,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  before jsonb,
  after jsonb,
  metadata jsonb,
  created_at timestamptz not null default now()
);

alter table public.audit_logs add column if not exists clinic_id uuid references public.cabinets(id) on delete cascade;
alter table public.audit_logs add column if not exists actor_id uuid references public.profiles(id) on delete set null;
alter table public.audit_logs add column if not exists actor_role text;
alter table public.audit_logs add column if not exists entity_type text;
alter table public.audit_logs add column if not exists entity_id uuid;
alter table public.audit_logs add column if not exists before jsonb;
alter table public.audit_logs add column if not exists after jsonb;
alter table public.audit_logs add column if not exists metadata jsonb;

create index if not exists idx_audit_logs_clinic_created on public.audit_logs(clinic_id, created_at desc);
create index if not exists idx_audit_logs_entity on public.audit_logs(entity_type, entity_id);

create or replace function public.write_audit_log(
  p_action text,
  p_entity_type text,
  p_entity_id uuid,
  p_before jsonb default null,
  p_after jsonb default null,
  p_metadata jsonb default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.audit_logs (
    clinic_id, actor_id, actor_role, action, entity_type, entity_id, before, after, metadata
  )
  values (
    public.current_clinic_id(), auth.uid(), public.current_role(),
    p_action, p_entity_type, p_entity_id, p_before, p_after, p_metadata
  );
end;
$$;

-- ---------- Internal assertions ----------

create or replace function public.mm_assert_role(required_roles text[])
returns void
language plpgsql
as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  if not public.has_any_role(required_roles) then
    perform public.write_audit_log(
      'UNAUTHORIZED_ACCESS_ATTEMPT',
      'security',
      null,
      null,
      null,
      jsonb_build_object('required_roles', required_roles, 'actual_role', public.current_role())
    );
    raise exception 'not authorized';
  end if;
end;
$$;

create or replace function public.mm_assert_same_clinic(p_clinic_id uuid)
returns void
language plpgsql
as $$
begin
  if p_clinic_id is distinct from public.current_clinic_id() then
    perform public.write_audit_log(
      'CROSS_CLINIC_ACCESS_BLOCKED',
      'security',
      null,
      null,
      null,
      jsonb_build_object('target_clinic_id', p_clinic_id)
    );
    raise exception 'cross-clinic access denied';
  end if;
end;
$$;

create or replace function public.mm_next_queue_number(p_clinic_id uuid, p_doctor_id uuid, p_queue_date date)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  next_number integer;
begin
  perform pg_advisory_xact_lock(hashtext(p_clinic_id::text || ':' || p_doctor_id::text || ':' || p_queue_date::text));

  select coalesce(max(queue_number), 0) + 1
  into next_number
  from public.visits
  where clinic_id = p_clinic_id
    and doctor_id = p_doctor_id
    and queue_date = p_queue_date;

  return next_number;
end;
$$;

-- ---------- Workflow RPCs ----------

create or replace function public.create_visit_from_rdv(
  p_rdv_id uuid,
  p_doctor_id uuid
)
returns public.visits
language plpgsql
security definer
set search_path = public
as $$
declare
  rdv_row public.rdv%rowtype;
  doctor_clinic uuid;
  visit_row public.visits%rowtype;
  qn integer;
begin
  perform public.mm_assert_role(array['secretary']);

  select * into rdv_row
  from public.rdv
  where id = p_rdv_id;

  if not found then
    raise exception 'appointment not found';
  end if;

  perform public.mm_assert_same_clinic(rdv_row.cabinet_id);

  select coalesce(clinic_id, cabinet_id) into doctor_clinic
  from public.profiles
  where id = p_doctor_id
    and public.mm_role_key(role) = 'doctor'
    and status = 'active';

  if doctor_clinic is distinct from rdv_row.cabinet_id then
    raise exception 'doctor must belong to the same clinic';
  end if;

  select * into visit_row
  from public.visits
  where rdv_id = p_rdv_id
    and status <> 'cancelled'
  order by created_at desc
  limit 1;

  if found then
    if visit_row.status in ('consultation', 'billing', 'completed') then
      raise exception 'visit already advanced';
    end if;

    if visit_row.doctor_id is distinct from p_doctor_id then
      qn := public.mm_next_queue_number(rdv_row.cabinet_id, p_doctor_id, current_date);
    else
      qn := visit_row.queue_number;
    end if;

    update public.visits
    set doctor_id = p_doctor_id,
        status = 'waiting',
        queue_date = current_date,
        queue_number = coalesce(qn, public.mm_next_queue_number(rdv_row.cabinet_id, p_doctor_id, current_date)),
        queued_at = coalesce(queued_at, now()),
        waiting_at = coalesce(waiting_at, now()),
        queue_sort_at = coalesce(queue_sort_at, now()),
        updated_by = auth.uid(),
        updated_at = now()
    where id = visit_row.id
    returning * into visit_row;
  else
    qn := public.mm_next_queue_number(rdv_row.cabinet_id, p_doctor_id, current_date);

    insert into public.visits (
      clinic_id, patient_id, rdv_id, source, doctor_id, status,
      queue_date, queue_number, queue_sort_at, queued_at, waiting_at,
      created_by, updated_by
    )
    values (
      rdv_row.cabinet_id, rdv_row.patient_id, rdv_row.id, 'appointment', p_doctor_id, 'waiting',
      current_date, qn, now(), now(), now(), auth.uid(), auth.uid()
    )
    returning * into visit_row;
  end if;

  update public.rdv
  set status = 'en_attente'
  where id = p_rdv_id;

  perform public.write_audit_log(
    'PATIENT_WAITING',
    'visit',
    visit_row.id,
    null,
    to_jsonb(visit_row),
    jsonb_build_object('rdv_id', p_rdv_id, 'doctor_id', p_doctor_id)
  );

  return visit_row;
end;
$$;

create or replace function public.create_walk_in_visit(
  p_patient_id uuid,
  p_doctor_id uuid
)
returns public.visits
language plpgsql
security definer
set search_path = public
as $$
declare
  patient_clinic uuid;
  doctor_clinic uuid;
  qn integer;
  visit_row public.visits%rowtype;
begin
  perform public.mm_assert_role(array['secretary']);

  select cabinet_id into patient_clinic from public.patients where id = p_patient_id;
  if patient_clinic is null then
    raise exception 'patient not found';
  end if;
  perform public.mm_assert_same_clinic(patient_clinic);

  select coalesce(clinic_id, cabinet_id) into doctor_clinic
  from public.profiles
  where id = p_doctor_id
    and public.mm_role_key(role) = 'doctor'
    and status = 'active';

  if doctor_clinic is distinct from patient_clinic then
    raise exception 'doctor must belong to the same clinic';
  end if;

  qn := public.mm_next_queue_number(patient_clinic, p_doctor_id, current_date);

  insert into public.visits (
    clinic_id, patient_id, source, doctor_id, status,
    queue_date, queue_number, queue_sort_at, queued_at, arrived_at, waiting_at,
    created_by, updated_by
  )
  values (
    patient_clinic, p_patient_id, 'walk_in', p_doctor_id, 'waiting',
    current_date, qn, now(), now(), now(), now(), auth.uid(), auth.uid()
  )
  returning * into visit_row;

  perform public.write_audit_log('VISIT_CREATED_WALK_IN', 'visit', visit_row.id, null, to_jsonb(visit_row), null);
  perform public.write_audit_log('PATIENT_WAITING', 'visit', visit_row.id, null, to_jsonb(visit_row), null);

  return visit_row;
end;
$$;

create or replace function public.reassign_visit_doctor(
  p_visit_id uuid,
  p_doctor_id uuid
)
returns public.visits
language plpgsql
security definer
set search_path = public
as $$
declare
  visit_before public.visits%rowtype;
  visit_after public.visits%rowtype;
  doctor_clinic uuid;
  next_status text;
  qn integer;
begin
  perform public.mm_assert_role(array['secretary']);

  select * into visit_before from public.visits where id = p_visit_id;
  if not found then
    raise exception 'visit not found';
  end if;
  perform public.mm_assert_same_clinic(visit_before.clinic_id);

  if visit_before.status not in ('scheduled', 'arrived', 'waiting', 'called') then
    raise exception 'visit cannot be reassigned after consultation starts';
  end if;

  select coalesce(clinic_id, cabinet_id) into doctor_clinic
  from public.profiles
  where id = p_doctor_id
    and public.mm_role_key(role) = 'doctor'
    and status = 'active';

  if doctor_clinic is distinct from visit_before.clinic_id then
    raise exception 'doctor must belong to the same clinic';
  end if;

  next_status := case when visit_before.status = 'called' then 'waiting' else visit_before.status end;
  qn := public.mm_next_queue_number(visit_before.clinic_id, p_doctor_id, current_date);

  update public.visits
  set doctor_id = p_doctor_id,
      status = next_status,
      queue_date = current_date,
      queue_number = qn,
      queue_sort_at = now(),
      queued_at = coalesce(queued_at, now()),
      waiting_at = case when next_status = 'waiting' then coalesce(waiting_at, now()) else waiting_at end,
      called_at = case when visit_before.status = 'called' then null else called_at end,
      updated_by = auth.uid(),
      updated_at = now()
  where id = p_visit_id
  returning * into visit_after;

  perform public.write_audit_log('VISIT_DOCTOR_REASSIGNED', 'visit', p_visit_id, to_jsonb(visit_before), to_jsonb(visit_after), null);

  return visit_after;
end;
$$;

create or replace function public.call_patient(p_visit_id uuid)
returns public.visits
language plpgsql
security definer
set search_path = public
as $$
declare
  visit_before public.visits%rowtype;
  visit_after public.visits%rowtype;
begin
  perform public.mm_assert_role(array['doctor']);

  select * into visit_before from public.visits where id = p_visit_id;
  if not found then
    raise exception 'visit not found';
  end if;
  perform public.mm_assert_same_clinic(visit_before.clinic_id);

  if not public.is_admin() and visit_before.doctor_id is distinct from auth.uid() then
    raise exception 'doctor can only call patients assigned to them';
  end if;

  if visit_before.status <> 'waiting' then
    raise exception 'only waiting patients can be called';
  end if;

  update public.visits
  set status = 'called',
      called_at = now(),
      updated_by = auth.uid(),
      updated_at = now()
  where id = p_visit_id
  returning * into visit_after;

  perform public.write_audit_log('PATIENT_CALLED', 'visit', p_visit_id, to_jsonb(visit_before), to_jsonb(visit_after), null);

  return visit_after;
end;
$$;

create or replace function public.open_consultation(p_visit_id uuid)
returns public.consultations
language plpgsql
security definer
set search_path = public
as $$
declare
  visit_before public.visits%rowtype;
  visit_after public.visits%rowtype;
  consultation_row public.consultations%rowtype;
begin
  perform public.mm_assert_role(array['doctor']);

  select * into visit_before from public.visits where id = p_visit_id for update;
  if not found then
    raise exception 'visit not found';
  end if;
  perform public.mm_assert_same_clinic(visit_before.clinic_id);

  if not public.is_admin() and visit_before.doctor_id is distinct from auth.uid() then
    raise exception 'doctor can only open assigned consultations';
  end if;

  if visit_before.status not in ('called', 'consultation') then
    raise exception 'patient must be called before consultation starts';
  end if;

  if visit_before.status = 'called' then
    update public.visits
    set status = 'consultation',
        consultation_start_at = now(),
        updated_by = auth.uid(),
        updated_at = now()
    where id = p_visit_id
    returning * into visit_after;
  else
    visit_after := visit_before;
  end if;

  insert into public.consultations (
    cabinet_id, clinic_id, visit_id, rdv_id, patient_id, doctor_id,
    statut, status, montant, billing_amount, billing_type,
    started_at, locked_by, locked_at, lock_expires_at
  )
  values (
    visit_after.clinic_id, visit_after.clinic_id, visit_after.id, visit_after.rdv_id,
    visit_after.patient_id, visit_after.doctor_id,
    'credit', 'draft', 0, 0, 'cash',
    coalesce(visit_after.consultation_start_at, now()), auth.uid(), now(), now() + interval '8 minutes'
  )
  on conflict (visit_id) where visit_id is not null
  do update set
    locked_by = case
      when consultations.locked_by is null
        or consultations.locked_by = auth.uid()
        or consultations.lock_expires_at < now()
      then auth.uid()
      else consultations.locked_by
    end,
    locked_at = case
      when consultations.locked_by is null
        or consultations.locked_by = auth.uid()
        or consultations.lock_expires_at < now()
      then now()
      else consultations.locked_at
    end,
    lock_expires_at = case
      when consultations.locked_by is null
        or consultations.locked_by = auth.uid()
        or consultations.lock_expires_at < now()
      then now() + interval '8 minutes'
      else consultations.lock_expires_at
    end,
    started_at = coalesce(consultations.started_at, excluded.started_at),
    updated_at = now()
  returning * into consultation_row;

  if consultation_row.locked_by is distinct from auth.uid() then
    perform public.write_audit_log('LOCK_CONFLICT', 'consultation', consultation_row.id, null, to_jsonb(consultation_row), null);
    raise exception 'consultation is locked by another user';
  end if;

  perform public.write_audit_log('PATIENT_IN_CONSULTATION', 'visit', p_visit_id, to_jsonb(visit_before), to_jsonb(visit_after), null);
  perform public.write_audit_log('CONSULTATION_LOCK_ACQUIRED', 'consultation', consultation_row.id, null, to_jsonb(consultation_row), null);

  return consultation_row;
end;
$$;

create or replace function public.refresh_consultation_lock(p_consultation_id uuid)
returns public.consultations
language plpgsql
security definer
set search_path = public
as $$
declare
  consultation_row public.consultations%rowtype;
begin
  perform public.mm_assert_role(array['doctor']);

  select * into consultation_row from public.consultations where id = p_consultation_id;
  if not found then raise exception 'consultation not found'; end if;
  perform public.mm_assert_same_clinic(coalesce(consultation_row.clinic_id, consultation_row.cabinet_id));

  if consultation_row.locked_by is distinct from auth.uid() then
    raise exception 'only lock owner can refresh lock';
  end if;

  update public.consultations
  set locked_at = now(),
      lock_expires_at = now() + interval '8 minutes',
      updated_at = now()
  where id = p_consultation_id
  returning * into consultation_row;

  return consultation_row;
end;
$$;

create or replace function public.release_consultation_lock(p_consultation_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  consultation_row public.consultations%rowtype;
begin
  perform public.mm_assert_role(array['doctor']);

  select * into consultation_row from public.consultations where id = p_consultation_id;
  if not found then return; end if;
  perform public.mm_assert_same_clinic(coalesce(consultation_row.clinic_id, consultation_row.cabinet_id));

  if consultation_row.locked_by = auth.uid() or public.is_admin() then
    update public.consultations
    set locked_by = null,
        locked_at = null,
        lock_expires_at = null,
        updated_at = now()
    where id = p_consultation_id;

    perform public.write_audit_log('CONSULTATION_LOCK_RELEASED', 'consultation', p_consultation_id, to_jsonb(consultation_row), null, null);
  end if;
end;
$$;

create or replace function public.complete_consultation(
  p_consultation_id uuid,
  p_chief_complaint text,
  p_diagnosis text,
  p_treatment text,
  p_notes text,
  p_billing_amount numeric,
  p_billing_type text
)
returns public.visits
language plpgsql
security definer
set search_path = public
as $$
declare
  consultation_before public.consultations%rowtype;
  consultation_after public.consultations%rowtype;
  visit_before public.visits%rowtype;
  visit_after public.visits%rowtype;
  next_status text;
  payment_status text;
  payment_method text;
begin
  perform public.mm_assert_role(array['doctor']);

  if p_billing_type not in ('cash', 'insurance', 'package', 'free') then
    raise exception 'invalid billing type';
  end if;

  select * into consultation_before from public.consultations where id = p_consultation_id for update;
  if not found then raise exception 'consultation not found'; end if;
  perform public.mm_assert_same_clinic(coalesce(consultation_before.clinic_id, consultation_before.cabinet_id));

  if consultation_before.locked_by is distinct from auth.uid() then
    raise exception 'only lock owner can complete consultation';
  end if;

  if consultation_before.lock_expires_at < now() then
    raise exception 'consultation lock expired';
  end if;

  select * into visit_before from public.visits where id = consultation_before.visit_id for update;
  if not found then raise exception 'visit not found'; end if;

  if visit_before.status <> 'consultation' then
    raise exception 'visit is not in consultation';
  end if;

  if p_billing_type = 'cash' and coalesce(p_billing_amount, 0) > 0 then
    next_status := 'billing';
    payment_status := 'pending';
    payment_method := null;
  elsif p_billing_type = 'insurance' and coalesce(p_billing_amount, 0) > 0 then
    next_status := 'billing';
    payment_status := 'pending';
    payment_method := 'insurance';
  else
    next_status := 'completed';
    payment_status := 'waived';
    payment_method := p_billing_type;
  end if;

  update public.consultations
  set chief_complaint = p_chief_complaint,
      diagnosis = p_diagnosis,
      treatment = p_treatment,
      notes = p_notes,
      billing_amount = coalesce(p_billing_amount, 0),
      billing_type = p_billing_type,
      montant = coalesce(p_billing_amount, 0),
      statut = case when next_status = 'billing' then 'credit' else 'paye' end,
      status = 'completed',
      completed_at = now(),
      locked_by = null,
      locked_at = null,
      lock_expires_at = null,
      version = version + 1,
      updated_at = now()
  where id = p_consultation_id
  returning * into consultation_after;

  update public.visits
  set status = next_status,
      consultation_end_at = now(),
      billing_at = case when next_status = 'billing' then now() else billing_at end,
      completed_at = case when next_status = 'completed' then now() else completed_at end,
      updated_by = auth.uid(),
      updated_at = now()
  where id = visit_before.id
  returning * into visit_after;

  insert into public.payments (
    clinic_id, visit_id, consultation_id, patient_id,
    amount, method, status, received_by, paid_at
  )
  values (
    visit_after.clinic_id, visit_after.id, consultation_after.id, visit_after.patient_id,
    coalesce(p_billing_amount, 0), payment_method, payment_status,
    case when payment_status = 'waived' then auth.uid() else null end,
    case when payment_status = 'waived' then now() else null end
  )
  on conflict (visit_id) where status in ('pending', 'paid', 'waived')
  do update set
    consultation_id = excluded.consultation_id,
    amount = excluded.amount,
    method = excluded.method,
    status = excluded.status,
    updated_at = now();

  if visit_after.rdv_id is not null then
    update public.rdv
    set status = case when next_status = 'billing' then 'a_encaisser' else 'termine' end
    where id = visit_after.rdv_id;
  end if;

  perform public.write_audit_log('CONSULTATION_COMPLETED', 'consultation', p_consultation_id, to_jsonb(consultation_before), to_jsonb(consultation_after), null);
  perform public.write_audit_log(
    case when next_status = 'billing' then 'PATIENT_READY_FOR_PAYMENT' else 'VISIT_COMPLETED_NO_PAYMENT_REQUIRED' end,
    'visit',
    visit_after.id,
    to_jsonb(visit_before),
    to_jsonb(visit_after),
    jsonb_build_object('billing_type', p_billing_type, 'amount', p_billing_amount)
  );

  return visit_after;
end;
$$;

create or replace function public.process_visit_payment(
  p_visit_id uuid,
  p_method text,
  p_amount numeric default null
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
begin
  perform public.mm_assert_role(array['secretary']);

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

  update public.payments
  set status = 'paid',
      method = p_method,
      amount = coalesce(p_amount, amount),
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
    update public.rdv set status = 'termine' where id = visit_after.rdv_id;
  end if;

  perform public.write_audit_log('PAYMENT_PROCESSED', 'payment', payment_after.id, to_jsonb(payment_before), to_jsonb(payment_after), null);
  perform public.write_audit_log('PATIENT_PAID', 'visit', p_visit_id, to_jsonb(visit_before), to_jsonb(visit_after), null);

  return visit_after;
end;
$$;

create or replace function public.cancel_visit(p_visit_id uuid, p_reason text default null)
returns public.visits
language plpgsql
security definer
set search_path = public
as $$
declare
  visit_before public.visits%rowtype;
  visit_after public.visits%rowtype;
begin
  perform public.mm_assert_role(array['secretary']);

  select * into visit_before from public.visits where id = p_visit_id for update;
  if not found then raise exception 'visit not found'; end if;
  perform public.mm_assert_same_clinic(visit_before.clinic_id);

  if visit_before.status not in ('scheduled', 'arrived', 'waiting', 'called') then
    raise exception 'cancellation is only allowed before consultation';
  end if;

  update public.visits
  set status = 'cancelled',
      cancelled_at = now(),
      updated_by = auth.uid(),
      updated_at = now()
  where id = p_visit_id
  returning * into visit_after;

  if visit_after.rdv_id is not null then
    update public.rdv set status = 'annule' where id = visit_after.rdv_id;
  end if;

  perform public.write_audit_log('PATIENT_CANCELLED', 'visit', p_visit_id, to_jsonb(visit_before), to_jsonb(visit_after), jsonb_build_object('reason', p_reason));

  return visit_after;
end;
$$;

-- ---------- Secretary-safe operational view ----------

create or replace view public.secretary_visit_status_view as
select
  v.id,
  v.clinic_id,
  v.patient_id,
  v.rdv_id,
  v.source,
  v.doctor_id,
  v.status,
  v.queue_date,
  v.queue_number,
  v.queued_at,
  v.called_at,
  v.consultation_start_at,
  v.billing_at,
  v.completed_at,
  v.updated_at,
  p.prenom,
  p.nom,
  p.telephone,
  d.nom_complet as doctor_name
from public.visits v
join public.patients p on p.id = v.patient_id and p.cabinet_id = v.clinic_id
join public.profiles d on d.id = v.doctor_id;

-- ---------- RLS ----------

alter table public.invitations enable row level security;
alter table public.appointments enable row level security;
alter table public.visits enable row level security;
alter table public.payments enable row level security;
alter table public.audit_logs enable row level security;

do $$
declare
  pol record;
begin
  for pol in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in ('invitations', 'appointments', 'visits', 'payments', 'audit_logs')
  loop
    execute format('drop policy if exists %I on %I.%I', pol.policyname, pol.schemaname, pol.tablename);
  end loop;
end $$;

create policy invitations_admin_select on public.invitations
for select to authenticated
using (clinic_id = public.current_clinic_id() and public.is_admin());

create policy invitations_admin_insert on public.invitations
for insert to authenticated
with check (clinic_id = public.current_clinic_id() and public.is_admin());

create policy appointments_staff_select on public.appointments
for select to authenticated
using (
  clinic_id = public.current_clinic_id()
  and (
    public.current_role() in ('admin', 'secretary')
    or (public.current_role() = 'doctor' and doctor_id = auth.uid())
  )
);

create policy appointments_staff_write on public.appointments
for all to authenticated
using (clinic_id = public.current_clinic_id() and public.current_role() in ('admin', 'secretary'))
with check (clinic_id = public.current_clinic_id() and public.current_role() in ('admin', 'secretary'));

create policy visits_select on public.visits
for select to authenticated
using (
  clinic_id = public.current_clinic_id()
  and (
    public.current_role() in ('admin', 'secretary')
    or (public.current_role() = 'doctor' and doctor_id = auth.uid())
  )
);

create policy visits_no_direct_write on public.visits
for all to authenticated
using (false)
with check (false);

create policy payments_select on public.payments
for select to authenticated
using (clinic_id = public.current_clinic_id() and public.current_role() in ('admin', 'secretary'));

create policy payments_no_direct_write on public.payments
for all to authenticated
using (false)
with check (false);

create policy audit_logs_select on public.audit_logs
for select to authenticated
using (clinic_id = public.current_clinic_id() and public.is_admin());

create policy audit_logs_no_direct_write on public.audit_logs
for all to authenticated
using (false)
with check (false);

-- Tighten consultation visibility without breaking existing admin/doctor UX.
-- If older broad policies exist, review/drop them after validating migration.
alter table public.consultations enable row level security;

-- ---------- Realtime publication ----------

do $$
begin
  alter publication supabase_realtime add table public.visits;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.payments;
exception when duplicate_object then null;
end $$;
