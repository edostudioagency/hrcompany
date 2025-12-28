-- Add leave calculation mode to company_settings
ALTER TABLE public.company_settings
ADD COLUMN leave_calculation_mode text DEFAULT 'jours_ouvres' CHECK (leave_calculation_mode IN ('jours_ouvres', 'jours_ouvrables'));