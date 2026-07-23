-- ==========================================
-- MIGRATION: MacroMedica Unified Workflow
-- ==========================================

-- 1. Expand the RDV status checks to support the full lifecycle
ALTER TABLE public.rdv 
DROP CONSTRAINT IF EXISTS rdv_status_check;

-- Fallback safety for legacy rows
UPDATE public.rdv SET status = 'confirme' WHERE status IS NULL;

-- Apply rigorous constraint matching the frontend state machine
ALTER TABLE public.rdv 
ADD CONSTRAINT rdv_status_check 
CHECK (status IN ('confirme', 'arrive', 'en_attente', 'en_consultation', 'a_encaisser', 'termine', 'absent', 'annule'));

-- 2. Bind Consultations explicitly to their driving Appointment (RDV)
-- This eliminates orphaned consultation data and ties clinical notes securely to the timeline.
ALTER TABLE public.consultations
ADD COLUMN IF NOT EXISTS rdv_id UUID REFERENCES public.rdv(id) ON DELETE SET NULL;

-- 3. Ensure consultation statuts cleanly map to the Billing system UI
ALTER TABLE public.consultations
DROP CONSTRAINT IF EXISTS consultations_statut_check;

-- 'paye' (Paid), 'credit' (Pending checkout in Billing), 'annule'
ALTER TABLE public.consultations
ADD CONSTRAINT consultations_statut_check 
CHECK (statut IN ('paye', 'credit', 'annule'));

-- NOTE: Execute this script directly in your Supabase SQL Editor.
