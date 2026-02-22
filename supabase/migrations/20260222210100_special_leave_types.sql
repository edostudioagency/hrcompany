-- =====================================================
-- Migration: Add legal special leave types (French labor law)
-- Congés événements familiaux - Article L3142-1 Code du travail
-- =====================================================

-- Step 1: Drop the existing CHECK constraint on time_off_requests.type
ALTER TABLE public.time_off_requests 
  DROP CONSTRAINT IF EXISTS time_off_requests_type_check;

-- Step 2: Add new CHECK constraint with all legal types
ALTER TABLE public.time_off_requests
  ADD CONSTRAINT time_off_requests_type_check 
  CHECK (type IN (
    'vacation',   -- Congés payés (CP)
    'sick',       -- Arrêt maladie
    'personal',   -- Sans solde / Congé personnel
    'rtt',        -- RTT
    'other',      -- Autre
    -- Congés légaux pour événements familiaux (Art. L3142-1)
    'marriage',   -- Mariage salarié : 4 jours ouvrables
    'pacs',       -- PACS salarié : 4 jours ouvrables
    'birth',      -- Naissance / adoption : 3 jours ouvrables (en plus congé paternité)
    'death',      -- Décès (3-5 jours selon lien de parenté)
    'move'        -- Déménagement (selon convention collective)
  ));

-- Step 3: Add a table to store legal duration for special leave types (informational)
CREATE TABLE IF NOT EXISTS public.special_leave_durations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  max_days_ouvres INTEGER NOT NULL,
  law_reference TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Insert legal durations (Code du travail français)
INSERT INTO public.special_leave_durations (type, label, max_days_ouvres, law_reference, notes)
VALUES
  ('marriage', 'Mariage du salarié', 4, 'Art. L3142-4 CT', 'Jours ouvrables. Convention collective peut prévoir plus.'),
  ('pacs', 'PACS du salarié', 4, 'Art. L3142-4 CT', 'Jours ouvrables depuis loi du 23 mars 2019.'),
  ('birth', 'Naissance ou adoption', 3, 'Art. L3142-4 CT', 'Jours ouvrables. Distinct du congé paternité (25 jours).'),
  ('death', 'Décès (parent proche)', 3, 'Art. L3142-4 CT', '3j conjoint/enfant, 3j parent, 2j frère/sœur, 1j beau-parent.'),
  ('move', 'Déménagement', 1, 'Convention collective', 'Selon CCN applicable. Souvent 1 à 3 jours.')
ON CONFLICT (type) DO NOTHING;

-- Enable RLS on special_leave_durations (read-only for all authenticated)
ALTER TABLE public.special_leave_durations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated can view special leave durations"
  ON public.special_leave_durations
  FOR SELECT
  TO authenticated
  USING (true);

-- Step 4: Add French labels for leave types in UI (comment for devs)
-- Frontend mapping:
-- vacation → Congés payés
-- sick     → Maladie
-- personal → Sans solde
-- rtt      → RTT
-- other    → Autre
-- marriage → Mariage (4j)
-- pacs     → PACS (4j)
-- birth    → Naissance / Adoption (3j)
-- death    → Décès (3-5j)
-- move     → Déménagement
