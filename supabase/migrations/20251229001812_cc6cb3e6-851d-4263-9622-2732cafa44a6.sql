-- Create a separate table for invitation tokens with strict RLS
CREATE TABLE public.employee_invitations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    invitation_token uuid NOT NULL DEFAULT gen_random_uuid(),
    sent_at timestamp with time zone DEFAULT now(),
    expires_at timestamp with time zone DEFAULT (now() + interval '7 days'),
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    UNIQUE(employee_id),
    UNIQUE(invitation_token)
);

-- Enable RLS
ALTER TABLE public.employee_invitations ENABLE ROW LEVEL SECURITY;

-- Only admins can manage invitations
CREATE POLICY "Admins can manage all invitations"
ON public.employee_invitations
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Require authentication (RESTRICTIVE)
CREATE POLICY "Require authentication for employee_invitations"
ON public.employee_invitations
AS RESTRICTIVE
FOR ALL
USING (auth.uid() IS NOT NULL);

-- Revoke anonymous access
REVOKE ALL ON public.employee_invitations FROM anon;
REVOKE ALL ON public.employee_invitations FROM public;

-- Migrate existing invitation data to the new table
INSERT INTO public.employee_invitations (employee_id, invitation_token, sent_at)
SELECT id, invitation_token, invitation_sent_at
FROM public.employees
WHERE invitation_token IS NOT NULL;

-- Clear invitation tokens from employees table (they're now in the secure table)
UPDATE public.employees
SET invitation_token = NULL, invitation_sent_at = NULL
WHERE invitation_token IS NOT NULL;