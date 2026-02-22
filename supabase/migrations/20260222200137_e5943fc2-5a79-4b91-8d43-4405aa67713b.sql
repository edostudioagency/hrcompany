
-- Replace overly permissive INSERT policy with a restrictive one
-- Audit logs should only be inserted by the SECURITY DEFINER trigger function
-- Regular users should never insert directly
DROP POLICY IF EXISTS "System can insert audit logs" ON public.audit_logs;

-- No direct INSERT policy needed - the SECURITY DEFINER trigger bypasses RLS
-- This ensures no user can directly insert fake audit logs
