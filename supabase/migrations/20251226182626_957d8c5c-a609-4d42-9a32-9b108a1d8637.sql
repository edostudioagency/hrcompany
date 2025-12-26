-- Fix security: Ensure profiles table requires authentication
-- Drop existing permissive SELECT policies to replace with secure ones
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Managers can view all profiles" ON public.profiles;

-- Create new PERMISSIVE policies with explicit auth check
CREATE POLICY "Authenticated users can view their own profile" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Managers can view all profiles" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (has_role(auth.uid(), 'manager'::app_role));

-- Fix security: Ensure employees table requires authentication
DROP POLICY IF EXISTS "Employees can view their own record" ON public.employees;
DROP POLICY IF EXISTS "Admins can manage all employees" ON public.employees;
DROP POLICY IF EXISTS "Managers can view company employees" ON public.employees;
DROP POLICY IF EXISTS "Managers can insert company employees" ON public.employees;
DROP POLICY IF EXISTS "Managers can update company employees" ON public.employees;

-- Create new PERMISSIVE policies with explicit auth check
CREATE POLICY "Authenticated employees can view their own record" 
ON public.employees 
FOR SELECT 
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Admins can manage all employees" 
ON public.employees 
FOR ALL 
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Managers can view company employees" 
ON public.employees 
FOR SELECT 
TO authenticated
USING (has_role(auth.uid(), 'manager'::app_role) AND ((company_id = get_user_company_id(auth.uid())) OR ((company_id IS NULL) AND (get_user_company_id(auth.uid()) IS NULL))));

CREATE POLICY "Managers can insert company employees" 
ON public.employees 
FOR INSERT 
TO authenticated
WITH CHECK (has_role(auth.uid(), 'manager'::app_role) AND ((company_id = get_user_company_id(auth.uid())) OR ((company_id IS NULL) AND (get_user_company_id(auth.uid()) IS NULL))));

CREATE POLICY "Managers can update company employees" 
ON public.employees 
FOR UPDATE 
TO authenticated
USING (has_role(auth.uid(), 'manager'::app_role) AND ((company_id = get_user_company_id(auth.uid())) OR ((company_id IS NULL) AND (get_user_company_id(auth.uid()) IS NULL))));