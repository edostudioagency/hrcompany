-- Add contract hours and gross salary columns to employees
ALTER TABLE public.employees 
ADD COLUMN IF NOT EXISTS contract_hours numeric,
ADD COLUMN IF NOT EXISTS gross_salary numeric;