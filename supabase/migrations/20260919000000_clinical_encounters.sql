-- Clinical encounters: persistent, versioned consultation notes (SOAP draft -> completed).
--
-- Why a new table instead of public.consultations: that table is also the
-- facturation invoice store (all 340 live rows are invoices with statut
-- payee/en_retard/...). A clinical draft there would surface as an invoice in
-- Facturation, and open_consultation() inserts statut='credit' which the
-- statut check rejects, so the visit-centric clinical flow cannot run today.
--
-- Security model (mirrors consultations_no_direct_write):
--   * RLS on, SELECT only for the owning doctor (or clinic admin), same clinic.
--   * No INSERT/UPDATE/DELETE grants: every write goes through the SECURITY
--     DEFINER RPCs below, which assert role, clinic, ownership and status.
--   * Completion enforces the business rules server-side (motif required,
--     vitals within plausible ranges) instead of trusting the UI.
--   * Optimistic concurrency via `version` so a stale tab cannot overwrite.

create table if not exists public.clinical_encounters (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.cabinets(id) on delete cascade,
  patient_id uuid not null references public.patients(id) on delete cascade,
  doctor_id uuid not null references public.profiles(id),
  visit_id uuid references public.visits(id) on delete set null,
  status text not null default 'draft' check (status in ('draft', 'completed', 'voided')),
  note jsonb not null default '{}'::jsonb
    check (jsonb_typeof(note) = 'object' and pg_column_size(note) <= 200000),
  version integer not null default 1,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists clinical_encounters_one_draft_per_doctor_patient
  on public.clinical_encounters (doctor_id, patient_id) where status = 'draft';
create index if not exists clinical_encounters_patient_idx
  on public.clinical_encounters (patient_id, completed_at desc);

alter table public.clinical_encounters enable row level security;

drop policy if exists clinical_encounters_select on public.clinical_encounters;
create policy clinical_encounters_select on public.clinical_encounters
  for select to authenticated
  using (
    clinic_id = public.current_clinic_id()
    and (public.is_admin() or (public.current_role() = 'doctor' and doctor_id = auth.uid()))
  );

revoke all on public.clinical_encounters from public, anon, authenticated;
grant select on public.clinical_encounters to authenticated;

-- Parses a user-typed number ("37,5" / "80"); NULL when empty or malformed.
create or replace function public.mm__parse_num(p text)
returns numeric
language sql
immutable
set search_path = public
as $$
  select case
    when replace(btrim(coalesce(p, '')), ',', '.') ~ '^\d{1,5}(\.\d{1,2})?$'
      then replace(btrim(p), ',', '.')::numeric
    else null
  end
$$;
revoke all on function public.mm__parse_num(text) from public, anon, authenticated;

create or replace function public.mm_open_encounter(p_patient_id uuid, p_visit_id uuid default null)
returns public.clinical_encounters
language plpgsql
security definer
set search_path = public
as $$
declare
  v_patient_clinic uuid;
  v_visit public.visits%rowtype;
  v_row public.clinical_encounters%rowtype;
begin
  perform public.mm_assert_role(array['doctor']);

  select cabinet_id into v_patient_clinic from public.patients where id = p_patient_id;
  if not found then raise exception 'patient not found'; end if;
  perform public.mm_assert_same_clinic(v_patient_clinic);

  if p_visit_id is not null then
    select * into v_visit from public.visits where id = p_visit_id;
    if not found then raise exception 'visit not found'; end if;
    perform public.mm_assert_same_clinic(v_visit.clinic_id);
    if v_visit.patient_id is distinct from p_patient_id then
      raise exception 'visit does not belong to this patient';
    end if;
  end if;

  insert into public.clinical_encounters (clinic_id, patient_id, doctor_id, visit_id)
  values (v_patient_clinic, p_patient_id, auth.uid(), p_visit_id)
  on conflict (doctor_id, patient_id) where status = 'draft'
  do update set
    visit_id = coalesce(public.clinical_encounters.visit_id, excluded.visit_id),
    updated_at = now()
  returning * into v_row;

  return v_row;
end;
$$;

create or replace function public.mm_save_encounter(p_id uuid, p_note jsonb, p_expected_version integer)
returns public.clinical_encounters
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.clinical_encounters%rowtype;
begin
  perform public.mm_assert_role(array['doctor']);

  if p_note is null or jsonb_typeof(p_note) is distinct from 'object' then
    raise exception 'invalid note';
  end if;
  if pg_column_size(p_note) > 200000 then raise exception 'note too large'; end if;

  select * into v_row from public.clinical_encounters where id = p_id for update;
  if not found then raise exception 'encounter not found'; end if;
  perform public.mm_assert_same_clinic(v_row.clinic_id);
  if v_row.doctor_id is distinct from auth.uid() then raise exception 'not authorized'; end if;
  if v_row.status is distinct from 'draft' then raise exception 'encounter is not editable'; end if;
  if v_row.version is distinct from p_expected_version then raise exception 'version conflict'; end if;

  update public.clinical_encounters
  set note = p_note, version = version + 1, updated_at = now()
  where id = p_id
  returning * into v_row;

  return v_row;
end;
$$;

create or replace function public.mm_complete_encounter(p_id uuid, p_note jsonb, p_expected_version integer)
returns public.clinical_encounters
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.clinical_encounters%rowtype;
  v_vit jsonb;
  v_sys numeric; v_dia numeric; v_hr numeric; v_temp numeric; v_spo2 numeric; v_w numeric; v_h numeric;
  v_any boolean;
  v_raw text;
begin
  perform public.mm_assert_role(array['doctor']);

  if p_note is null or jsonb_typeof(p_note) is distinct from 'object' then
    raise exception 'invalid note';
  end if;
  if pg_column_size(p_note) > 200000 then raise exception 'note too large'; end if;

  select * into v_row from public.clinical_encounters where id = p_id for update;
  if not found then raise exception 'encounter not found'; end if;
  perform public.mm_assert_same_clinic(v_row.clinic_id);
  if v_row.doctor_id is distinct from auth.uid() then raise exception 'not authorized'; end if;
  if v_row.status is distinct from 'draft' then raise exception 'encounter is not editable'; end if;
  if v_row.version is distinct from p_expected_version then raise exception 'version conflict'; end if;

  if btrim(coalesce(p_note->>'motif', '')) = '' then raise exception 'motif required'; end if;

  v_vit := case when jsonb_typeof(p_note->'vitals') = 'object' then p_note->'vitals' else '{}'::jsonb end;

  v_sys  := public.mm__parse_num(v_vit->>'bloodPressureSystolic');
  v_dia  := public.mm__parse_num(v_vit->>'bloodPressureDiastolic');
  v_hr   := public.mm__parse_num(v_vit->>'heartRate');
  v_temp := public.mm__parse_num(v_vit->>'temperature');
  v_spo2 := public.mm__parse_num(v_vit->>'oxygenSaturation');
  v_w    := public.mm__parse_num(v_vit->>'weight');
  v_h    := public.mm__parse_num(v_vit->>'height');

  -- A vital that was typed but is malformed or implausible is rejected rather
  -- than silently dropped from the medical record.
  foreach v_raw in array array['bloodPressureSystolic','bloodPressureDiastolic','heartRate','temperature','oxygenSaturation','weight','height'] loop
    if btrim(coalesce(v_vit->>v_raw, '')) <> ''
       and public.mm__parse_num(v_vit->>v_raw) is null then
      raise exception 'invalid vitals';
    end if;
  end loop;
  if (v_sys is not null and (v_sys < 40 or v_sys > 300))
     or (v_dia is not null and (v_dia < 20 or v_dia > 200))
     or (v_hr is not null and (v_hr < 20 or v_hr > 300))
     or (v_temp is not null and (v_temp < 25 or v_temp > 45))
     or (v_spo2 is not null and (v_spo2 < 0 or v_spo2 > 100))
     or (v_w is not null and (v_w < 0.3 or v_w > 500))
     or (v_h is not null and (v_h < 20 or v_h > 260)) then
    raise exception 'invalid vitals';
  end if;
  if (v_sys is null) is distinct from (v_dia is null) then
    raise exception 'invalid vitals';
  end if;

  update public.clinical_encounters
  set note = p_note, status = 'completed', completed_at = now(),
      version = version + 1, updated_at = now()
  where id = p_id
  returning * into v_row;

  v_any := v_sys is not null or v_hr is not null or v_temp is not null
           or v_spo2 is not null or v_w is not null or v_h is not null;
  if v_any then
    insert into public.patient_vitals (
      patient_id, cabinet_id, date_mesure, blood_pressure, heart_rate,
      temperature, spo2, weight, height, created_by
    ) values (
      v_row.patient_id, v_row.clinic_id, now(),
      case when v_sys is not null then round(v_sys)::int || '/' || round(v_dia)::int end,
      round(v_hr)::int, round(v_temp, 1), round(v_spo2)::int, round(v_w, 1), round(v_h, 1),
      auth.uid()
    );
  end if;

  perform public.write_audit_log(
    'ENCOUNTER_COMPLETED', 'clinical_encounter', v_row.id, null,
    jsonb_build_object('status', v_row.status, 'version', v_row.version, 'patient_id', v_row.patient_id),
    null
  );

  return v_row;
end;
$$;

create or replace function public.mm_void_encounter(p_id uuid)
returns public.clinical_encounters
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.clinical_encounters%rowtype;
begin
  perform public.mm_assert_role(array['doctor']);

  select * into v_row from public.clinical_encounters where id = p_id for update;
  if not found then raise exception 'encounter not found'; end if;
  perform public.mm_assert_same_clinic(v_row.clinic_id);
  if v_row.doctor_id is distinct from auth.uid() then raise exception 'not authorized'; end if;
  if v_row.status is distinct from 'draft' then raise exception 'encounter is not editable'; end if;

  update public.clinical_encounters
  set status = 'voided', version = version + 1, updated_at = now()
  where id = p_id
  returning * into v_row;

  perform public.write_audit_log(
    'ENCOUNTER_VOIDED', 'clinical_encounter', v_row.id, null,
    jsonb_build_object('status', v_row.status, 'patient_id', v_row.patient_id), null
  );

  return v_row;
end;
$$;

revoke all on function public.mm_open_encounter(uuid, uuid) from public, anon;
revoke all on function public.mm_save_encounter(uuid, jsonb, integer) from public, anon;
revoke all on function public.mm_complete_encounter(uuid, jsonb, integer) from public, anon;
revoke all on function public.mm_void_encounter(uuid) from public, anon;
grant execute on function public.mm_open_encounter(uuid, uuid) to authenticated;
grant execute on function public.mm_save_encounter(uuid, jsonb, integer) to authenticated;
grant execute on function public.mm_complete_encounter(uuid, jsonb, integer) to authenticated;
grant execute on function public.mm_void_encounter(uuid) to authenticated;
