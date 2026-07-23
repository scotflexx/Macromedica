-- ============================================================
-- Fix: legacy payments table (missing visit_id)
--
-- SAFE TO RUN ANYTIME — step 1 only renames legacy payments.
-- Step 2 runs only when public.visits already exists.
--
-- CORRECT ORDER:
--   1. fix_clinics_cabinets_fk.sql
--   2. 20260616_patient_flow_rbac.sql   (creates visits, then payments)
--      — if it fails at payments, run THIS file then re-run from payments
--   3. 20260617_phase1_patch.sql
-- ============================================================

-- Step 1: rename legacy payments (no visits FK required)
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
    raise notice 'Renamed legacy public.payments -> payments_legacy';
  end if;
end $$;

-- Step 2: create patient-flow payments (requires visits table)
do $$
begin
  if not exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'visits'
  ) then
    raise notice 'public.visits does not exist yet — skip payments creation. Run 20260616_patient_flow_rbac.sql first (through the visits section).';
    return;
  end if;

  if not exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'payments'
  ) then
    execute $sql$
      create table public.payments (
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
      )
    $sql$;
    raise notice 'Created public.payments (patient-flow schema)';
  end if;

  execute 'alter table public.payments add column if not exists visit_id uuid references public.visits(id) on delete restrict';
  execute 'alter table public.payments add column if not exists clinic_id uuid references public.cabinets(id) on delete cascade';
  execute 'alter table public.payments add column if not exists consultation_id uuid references public.consultations(id) on delete set null';
  execute 'alter table public.payments add column if not exists patient_id uuid references public.patients(id) on delete restrict';
  execute 'alter table public.payments add column if not exists amount numeric(12,2) not null default 0';
  execute 'alter table public.payments add column if not exists status text not null default ''pending''';
  execute 'alter table public.payments add column if not exists updated_at timestamptz not null default now()';

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'payments' and column_name = 'visit_id'
  ) then
    execute 'create unique index if not exists idx_payments_visit_active on public.payments(visit_id) where status in (''pending'', ''paid'', ''waived'')';
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'payments' and column_name = 'clinic_id'
  ) then
    execute 'create index if not exists idx_payments_clinic_status on public.payments(clinic_id, status)';
  end if;
end $$;
