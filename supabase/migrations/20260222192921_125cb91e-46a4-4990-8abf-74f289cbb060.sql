
-- Drop the existing manager SELECT policy
DROP POLICY IF EXISTS "Managers can view accountant settings" ON public.accountant_settings;
