-- Add restrictive policy to deny anonymous access to employees table
-- This policy requires that users must be authenticated to access any employee data
CREATE POLICY "Require authentication for employees"
ON public.employees
AS RESTRICTIVE
FOR ALL
USING (auth.uid() IS NOT NULL);

-- Add restrictive policy to deny anonymous access to profiles table
CREATE POLICY "Require authentication for profiles"
ON public.profiles
AS RESTRICTIVE
FOR ALL
USING (auth.uid() IS NOT NULL);