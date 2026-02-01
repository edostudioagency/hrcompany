-- Add employee_sort_order column to company_settings
ALTER TABLE public.company_settings 
ADD COLUMN employee_sort_order text DEFAULT 'first_name';

-- Add a comment to document the column
COMMENT ON COLUMN public.company_settings.employee_sort_order IS 'Sort order for employee lists: first_name or last_name';