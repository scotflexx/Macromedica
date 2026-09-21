-- The dashboard queue is rdv-driven (arrival_status), so the `?visitId=` the
-- patient workspace receives is usually an rdv id, not a visits id. The first
-- version of mm_open_encounter treated it strictly as a visits FK and raised
-- 'visit not found', so a consultation opened from the queue could never start.
--
-- The link is informational: accept either kind of id, store it in the matching
-- column, and ignore an id that does not belong to this clinic AND this patient
-- (never link across clinics or patients, never fail the open because of it).

alter table public.clinical_encounters
  add column if not exists rdv_id uuid references public.rdv(id) on delete set null;

create or replace function public.mm_open_encounter(p_patient_id uuid, p_visit_id uuid default null)
returns public.clinical_encounters
language plpgsql
security definer
set search_path = public
as $$
declare
  v_patient_clinic uuid;
  v_visit_id uuid;
  v_rdv_id uuid;
  v_row public.clinical_encounters%rowtype;
begin
  perform public.mm_assert_role(array['doctor']);

  select cabinet_id into v_patient_clinic from public.patients where id = p_patient_id;
  if not found then raise exception 'patient not found'; end if;
  perform public.mm_assert_same_clinic(v_patient_clinic);

  if p_visit_id is not null then
    select id into v_visit_id from public.visits
     where id = p_visit_id and clinic_id = v_patient_clinic and patient_id = p_patient_id;
    if v_visit_id is null then
      select id into v_rdv_id from public.rdv
       where id = p_visit_id and cabinet_id = v_patient_clinic and patient_id = p_patient_id;
    end if;
  end if;

  insert into public.clinical_encounters (clinic_id, patient_id, doctor_id, visit_id, rdv_id)
  values (v_patient_clinic, p_patient_id, auth.uid(), v_visit_id, v_rdv_id)
  on conflict (doctor_id, patient_id) where status = 'draft'
  do update set
    visit_id = coalesce(public.clinical_encounters.visit_id, excluded.visit_id),
    rdv_id = coalesce(public.clinical_encounters.rdv_id, excluded.rdv_id),
    updated_at = now()
  returning * into v_row;

  return v_row;
end;
$$;

revoke all on function public.mm_open_encounter(uuid, uuid) from public, anon;
grant execute on function public.mm_open_encounter(uuid, uuid) to authenticated;
