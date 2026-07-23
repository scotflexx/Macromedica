-- ==============================================================================
-- 1. MODIFICATION DE LA TABLE CABINETS
-- ==============================================================================
ALTER TABLE public.cabinets 
ADD COLUMN IF NOT EXISTS pin_hash TEXT,
ADD COLUMN IF NOT EXISTS secretaire_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

-- ==============================================================================
-- 2. TRIGGER D'INVITATION (AUTO-PROFIL)
-- Note: Supabase auth.users triggers should automatically create the profile.
-- We must make sure the existing setup handles metadata extraction for 'role' and 'cabinet_id'.
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  -- Insert into profiles
  INSERT INTO public.profiles (id, cabinet_id, role, nom_complet)
  VALUES (
    new.id,
    -- Only link to a real cabinet; never invent a random UUID (FK violation)
    NULLIF(new.raw_user_meta_data->>'cabinet_id', '')::uuid,
    COALESCE(new.raw_user_meta_data->>'role', 'medecin'),
    COALESCE(new.raw_user_meta_data->>'nom_complet', new.email)
  )
  ON CONFLICT (id) DO UPDATE SET
    cabinet_id = EXCLUDED.cabinet_id,
    role = EXCLUDED.role,
    nom_complet = EXCLUDED.nom_complet;
    
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Assure that the trigger is registered
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ==============================================================================
-- 3. SECURITE: MASQUER LE PIN_HASH
-- ==============================================================================
-- Enable RLS on cabinets if not already enabled
ALTER TABLE public.cabinets ENABLE ROW LEVEL SECURITY;

-- Allow reading cabinets EXCEPT pin_hash for everyone authenticated who belongs to it
-- We can't block a single column with RLS natively without views, so we'll just allow all
-- and we'll ensure the client never queries `pin_hash` directly except through the restricted edge function.
-- Actually, we can revoke access to the pin_hash column, but since Supabase uses the api role:
REVOKE SELECT (pin_hash) ON public.cabinets FROM anon, authenticated;
GRANT SELECT (pin_hash) ON public.cabinets TO service_role;

-- Normal RLS for cabinets
DROP POLICY IF EXISTS "cabinets_read_policy" ON public.cabinets;
CREATE POLICY "cabinets_read_policy" ON public.cabinets
FOR SELECT TO authenticated USING (
   id IN (SELECT cabinet_id FROM public.profiles WHERE id = auth.uid())
);

DROP POLICY IF EXISTS "cabinets_update_policy" ON public.cabinets;
CREATE POLICY "cabinets_update_policy" ON public.cabinets
FOR UPDATE TO authenticated USING (
   -- Only medecin can update cabinet details
   auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'medecin' AND cabinet_id = id)
);

-- ==============================================================================
-- 4. RESTRICTIONS FINANCIERES POUR SECRETAIRE
-- ==============================================================================
-- Views are not affected by RLS by default unless security invoker is set.
ALTER VIEW public.vue_metriques_jour SET (security_invoker = on);
ALTER VIEW public.vue_ca_mensuel SET (security_invoker = on);

-- Ensure consultations policy restricts read to 'medecin' for financial fields?
-- The prompt said "ni les statistiques financières". Since the views now run as the invoker, 
-- we can add a policy to consultations or just let the React frontend block the dashboard route.
-- The prompt strictly asked: "Les stats financières (revenus, totaux) ne sont lisibles que par le rôle docteur au niveau RLS"

DROP POLICY IF EXISTS "consultations_access" ON public.consultations;
CREATE POLICY "consultations_access" ON public.consultations
FOR SELECT TO authenticated USING (
  cabinet_id IN (SELECT cabinet_id FROM public.profiles WHERE id = auth.uid())
  AND 
  (
    -- If it's a secretaire, maybe they shouldn't see consultations? 
    -- The prompt says secretary allowed routes: /salle-attente, /agenda, /facturation, /patients en lecture seule.
    -- Wait, /facturation needs read access to consultations to mark them as paid!
    -- So RLS on consultations is allowed. We just need to restrict the VIEWS!
    TRUE
  )
);

-- Protect the views from being queried by secretaire
GRANT SELECT ON public.vue_metriques_jour TO authenticated;
GRANT SELECT ON public.vue_ca_mensuel TO authenticated;

-- Ensure the secretary cannot fetch the views
-- We can't put RLS directly on a view without a base table policy that filters it, but if we do security_invoker,
-- we could restrict it. An easier way in Postgres is:
CREATE OR REPLACE VIEW public.vue_metriques_jour AS
SELECT 
  cabinet_id,
  COUNT(DISTINCT patient_id) AS patients_aujourd_hui,
  SUM(CASE WHEN statut = 'paye' THEN montant ELSE 0 END) AS ca_aujourd_hui,
  SUM(CASE WHEN statut = 'credit' THEN montant ELSE 0 END) AS credits_aujourd_hui
FROM public.consultations
WHERE date_consult = CURRENT_DATE 
  -- Restrict to doctors
  AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'medecin')
GROUP BY cabinet_id;

CREATE OR REPLACE VIEW public.vue_ca_mensuel AS
SELECT 
  cabinet_id,
  TO_CHAR(date_consult, 'YYYY-MM') AS mois,
  SUM(CASE WHEN statut = 'paye' THEN montant ELSE 0 END) AS ca_paye,
  SUM(CASE WHEN statut = 'credit' THEN montant ELSE 0 END) AS ca_credit,
  COUNT(*) AS nb_consultations
FROM public.consultations
WHERE EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'medecin')
GROUP BY cabinet_id, mois;

-- ==============================================================================
-- 5. CORRECTION DES CONSTRAINTS
-- ==============================================================================
-- Relax the status constraint for rdv to support French states (en_attente, arrive, etc.)
ALTER TABLE public.rdv DROP CONSTRAINT IF EXISTS rdv_status_check;
