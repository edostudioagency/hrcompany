-- Create a function to get the current user's company_id from their employee record
CREATE OR REPLACE FUNCTION public.get_user_company_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT company_id
  FROM public.employees
  WHERE user_id = _user_id
  LIMIT 1
$$;

-- Drop the existing manager SELECT policy
DROP POLICY IF EXISTS "Managers can view all employees" ON public.employees;

-- Create new company-scoped manager SELECT policy
CREATE POLICY "Managers can view company employees"
ON public.employees
FOR SELECT
USING (
  has_role(auth.uid(), 'manager'::app_role) 
  AND (
    -- Managers can see employees in their company
    company_id = get_user_company_id(auth.uid())
    -- Or if company_id is null (for backward compatibility during migration)
    OR (company_id IS NULL AND get_user_company_id(auth.uid()) IS NULL)
  )
);

-- Update the manager UPDATE policy to be company-scoped
DROP POLICY IF EXISTS "Managers can update employees" ON public.employees;

CREATE POLICY "Managers can update company employees"
ON public.employees
FOR UPDATE
USING (
  has_role(auth.uid(), 'manager'::app_role) 
  AND (
    company_id = get_user_company_id(auth.uid())
    OR (company_id IS NULL AND get_user_company_id(auth.uid()) IS NULL)
  )
);

-- Update the manager INSERT policy to be company-scoped
DROP POLICY IF EXISTS "Managers can insert employees" ON public.employees;

CREATE POLICY "Managers can insert company employees"
ON public.employees
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'manager'::app_role) 
  AND (
    company_id = get_user_company_id(auth.uid())
    OR (company_id IS NULL AND get_user_company_id(auth.uid()) IS NULL)
  )
);