-- Add salary_type column to employees table
ALTER TABLE public.employees 
ADD COLUMN salary_type text DEFAULT 'fixed';

-- Add comment for clarity
COMMENT ON COLUMN public.employees.salary_type IS 'Type of salary: fixed, commission, hourly';