-- Create a function to check if a user belongs to a specific company
CREATE OR REPLACE FUNCTION public.user_belongs_to_company(_user_id uuid, _company_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.employees
    WHERE user_id = _user_id
      AND company_id = _company_id
  )
$$;

-- Drop existing manager policies on employees table
DROP POLICY IF EXISTS "Managers can view company employees" ON public.employees;
DROP POLICY IF EXISTS "Managers can insert company employees" ON public.employees;
DROP POLICY IF EXISTS "Managers can update company employees" ON public.employees;

-- Recreate policies with proper company isolation
CREATE POLICY "Managers can view company employees" 
ON public.employees 
FOR SELECT 
USING (
  has_role(auth.uid(), 'manager'::app_role) 
  AND user_belongs_to_company(auth.uid(), company_id)
);

CREATE POLICY "Managers can insert company employees" 
ON public.employees 
FOR INSERT 
WITH CHECK (
  has_role(auth.uid(), 'manager'::app_role) 
  AND user_belongs_to_company(auth.uid(), company_id)
);

CREATE POLICY "Managers can update company employees" 
ON public.employees 
FOR UPDATE 
USING (
  has_role(auth.uid(), 'manager'::app_role) 
  AND user_belongs_to_company(auth.uid(), company_id)
);