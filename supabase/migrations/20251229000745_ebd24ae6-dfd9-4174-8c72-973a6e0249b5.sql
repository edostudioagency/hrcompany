-- Fix profiles table: require authentication for all access
-- First, drop existing SELECT policies and recreate with proper auth requirements
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Managers can view all profiles" ON public.profiles;

-- Create permissive policies that require authentication
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

-- Fix companies table: require authentication for all access
DROP POLICY IF EXISTS "Admins can manage all companies" ON public.companies;
DROP POLICY IF EXISTS "Managers can view companies" ON public.companies;

-- Create policies that require authentication
CREATE POLICY "Admins can manage all companies" 
ON public.companies 
FOR ALL 
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Managers can view companies" 
ON public.companies 
FOR SELECT 
TO authenticated
USING (has_role(auth.uid(), 'manager'::app_role));

-- Allow employees to view their own company
CREATE POLICY "Employees can view their own company" 
ON public.companies 
FOR SELECT 
TO authenticated
USING (id IN (
  SELECT company_id FROM public.employees WHERE user_id = auth.uid()
));