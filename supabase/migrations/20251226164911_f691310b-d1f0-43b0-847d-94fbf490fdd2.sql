-- Remove the overly permissive policy that allows ANY authenticated user to access employees table
-- This policy is too broad and creates a security vulnerability
DROP POLICY IF EXISTS "Require authentication for employees" ON public.employees;