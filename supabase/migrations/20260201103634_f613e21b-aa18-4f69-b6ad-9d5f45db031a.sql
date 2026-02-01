-- Add commissions_send_mode column to company_settings
ALTER TABLE public.company_settings 
ADD COLUMN IF NOT EXISTS commissions_send_mode text NOT NULL DEFAULT 'manual';

-- Add a check constraint to ensure valid values
ALTER TABLE public.company_settings 
ADD CONSTRAINT commissions_send_mode_check 
CHECK (commissions_send_mode IN ('manual', 'automatic'));