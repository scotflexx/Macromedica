-- =====================================================================
-- Fix Cross-Clinic Access & Tenant Resolution
-- =====================================================================

-- 1. Resilient current_clinic_id()
CREATE OR REPLACE FUNCTION public.current_clinic_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT coalesce(p.clinic_id, p.cabinet_id)
  FROM public.profiles p
  WHERE p.id = auth.uid()
  LIMIT 1
$$;

GRANT EXECUTE ON FUNCTION public.current_clinic_id() TO authenticated, anon;

-- 2. Resilient mm_assert_same_clinic
CREATE OR REPLACE FUNCTION public.mm_assert_same_clinic(p_clinic_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_my_clinic uuid;
BEGIN
  v_my_clinic := public.current_clinic_id();
  
  -- Only block if BOTH are non-null and belong to different clinics
  IF p_clinic_id IS NOT NULL AND v_my_clinic IS NOT NULL AND p_clinic_id IS DISTINCT FROM v_my_clinic THEN
    PERFORM public.write_audit_log(
      'CROSS_CLINIC_ACCESS_BLOCKED',
      'security',
      null,
      null,
      null,
      jsonb_build_object('target_clinic_id', p_clinic_id, 'user_clinic_id', v_my_clinic)
    );
    RAISE EXCEPTION 'cross-clinic access denied';
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.mm_assert_same_clinic(uuid) TO authenticated;

-- 3. Resilient create_walk_in_visit
CREATE OR REPLACE FUNCTION public.create_walk_in_visit(p_patient_id uuid, p_doctor_id uuid)
RETURNS visits
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  patient_clinic uuid;
  doctor_clinic uuid;
  effective_clinic uuid;
  qn integer;
  visit_row public.visits%rowtype;
BEGIN
  IF NOT (public.is_admin() OR public.mm_has_permission('waiting_room.add_patient')) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  SELECT coalesce(p.clinic_id, p.cabinet_id) INTO patient_clinic FROM public.patients p WHERE p.id = p_patient_id;
  
  SELECT coalesce(pr.clinic_id, pr.cabinet_id) INTO doctor_clinic
  FROM public.profiles pr
  WHERE pr.id = p_doctor_id;

  effective_clinic := coalesce(patient_clinic, doctor_clinic, public.current_clinic_id());

  IF effective_clinic IS NULL THEN
    RAISE EXCEPTION 'cabinet introuvable';
  END IF;

  IF patient_clinic IS NOT NULL AND doctor_clinic IS NOT NULL AND patient_clinic IS DISTINCT FROM doctor_clinic THEN
    RAISE EXCEPTION 'doctor must belong to the same clinic';
  END IF;

  PERFORM public.mm_assert_same_clinic(effective_clinic);

  qn := public.mm_next_queue_number(effective_clinic, p_doctor_id, current_date);

  INSERT INTO public.visits (
    clinic_id, patient_id, source, doctor_id, status,
    queue_date, queue_number, queue_sort_at, queued_at, arrived_at, waiting_at,
    created_by, updated_by
  )
  VALUES (
    effective_clinic, p_patient_id, 'walk_in', p_doctor_id, 'waiting',
    current_date, qn, now(), now(), now(), now(), auth.uid(), auth.uid()
  )
  RETURNING * INTO visit_row;

  PERFORM public.write_audit_log('VISIT_CREATED_WALK_IN', 'visit', visit_row.id, null, to_jsonb(visit_row), null);
  PERFORM public.write_audit_log('PATIENT_WAITING', 'visit', visit_row.id, null, to_jsonb(visit_row), null);

  RETURN visit_row;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_walk_in_visit(uuid, uuid) TO authenticated;

-- 4. Resilient add_to_waiting_room
CREATE OR REPLACE FUNCTION public.add_to_waiting_room(p_rdv_id uuid)
RETURNS rdv
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rdv_before public.rdv%rowtype;
  rdv_after public.rdv%rowtype;
  effective_clinic uuid;
BEGIN
  SELECT * INTO rdv_before FROM public.rdv WHERE id = p_rdv_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'appointment not found'; END IF;

  PERFORM public.mm_assert_permission('waiting_room.add_patient');
  
  effective_clinic := coalesce(rdv_before.cabinet_id, public.current_clinic_id());
  IF effective_clinic IS NOT NULL THEN
    PERFORM public.mm_assert_same_clinic(effective_clinic);
  END IF;

  IF rdv_before.arrival_status != 'NOT_ARRIVED' THEN
    RAISE EXCEPTION 'patient has already arrived or left';
  END IF;

  UPDATE public.rdv
  SET arrival_status = 'WAITING',
      arrived_at = now()
  WHERE id = p_rdv_id
  RETURNING * INTO rdv_after;

  PERFORM public.write_audit_log('PATIENT_WAITING', 'rdv', p_rdv_id, to_jsonb(rdv_before), to_jsonb(rdv_after), null);

  RETURN rdv_after;
END;
$$;

GRANT EXECUTE ON FUNCTION public.add_to_waiting_room(uuid) TO authenticated;

-- 5. Backfill profile & patient & rdv clinic identities
UPDATE public.profiles
SET clinic_id = cabinet_id
WHERE clinic_id IS NULL AND cabinet_id IS NOT NULL;

UPDATE public.profiles
SET cabinet_id = clinic_id
WHERE cabinet_id IS NULL AND clinic_id IS NOT NULL;
