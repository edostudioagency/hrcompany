-- Remove the overly permissive policy that allows ANY authenticated user to access profiles table
-- The remaining role-based policies (admin/manager view, user own profile) are sufficient
DROP POLICY IF EXISTS "Require authentication for profiles" ON public.profiles;