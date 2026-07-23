-- ============================================================
-- Fix: "Database error saving new user"
-- Supabase Dashboard → SQL Editor
--
-- IMPORTANT: Select ALL lines below and run as ONE query.
-- Do not run line-by-line — semicolons inside the function
-- will break if the editor splits statements incorrectly.
-- ============================================================

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  meta_cabinet_id uuid;
  user_role text;
  user_nom text;
BEGIN
  meta_cabinet_id := NULLIF(NEW.raw_user_meta_data->>'cabinet_id', '')::uuid;
  user_role := COALESCE(NULLIF(NEW.raw_user_meta_data->>'role', ''), 'docteur');
  user_nom := COALESCE(NULLIF(NEW.raw_user_meta_data->>'nom_complet', ''), NEW.email);

  IF meta_cabinet_id IS NOT NULL THEN
    -- Staff invite: link to existing cabinet
    INSERT INTO public.profiles (id, cabinet_id, role, nom_complet)
    VALUES (NEW.id, meta_cabinet_id, user_role, user_nom)
    ON CONFLICT (id) DO UPDATE
      SET cabinet_id = EXCLUDED.cabinet_id,
          role = EXCLUDED.role,
          nom_complet = EXCLUDED.nom_complet;

  ELSIF NULLIF(NEW.raw_user_meta_data->>'nom_cabinet', '') IS NOT NULL THEN
    -- Doctor signup: create cabinet + profile in one statement
    WITH created_cabinet AS (
      INSERT INTO public.cabinets (tenant_id, nom, ville, telephone)
      VALUES (
        NEW.id,
        NEW.raw_user_meta_data->>'nom_cabinet',
        NULLIF(NEW.raw_user_meta_data->>'ville', ''),
        NULLIF(NEW.raw_user_meta_data->>'telephone', '')
      )
      RETURNING id
    )
    INSERT INTO public.profiles (id, cabinet_id, role, nom_complet)
    SELECT NEW.id, created_cabinet.id, user_role, user_nom
    FROM created_cabinet
    ON CONFLICT (id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$function$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
