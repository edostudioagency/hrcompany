-- Ensure RLS is enabled on profiles table
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Revoke all public access to profiles
REVOKE ALL ON public.profiles FROM anon;
REVOKE ALL ON public.profiles FROM public;

-- Ensure RLS is enabled on employees table  
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;

-- Revoke all public access to employees
REVOKE ALL ON public.employees FROM anon;
REVOKE ALL ON public.employees FROM public;