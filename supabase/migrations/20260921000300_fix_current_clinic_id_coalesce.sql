-- Fix current_clinic_id() to properly resolve both clinic_id and cabinet_id
-- (preventing 'cross-clinic access denied' when profiles or records only have cabinet_id set).

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

-- Backfill profile tenant identity columns so clinic_id and cabinet_id are consistently synced
UPDATE public.profiles
SET clinic_id = cabinet_id
WHERE clinic_id IS NULL AND cabinet_id IS NOT NULL;

UPDATE public.profiles
SET cabinet_id = clinic_id
WHERE cabinet_id IS NULL AND clinic_id IS NOT NULL;
