-- Add the new constraint with French types
ALTER TABLE public.time_off_requests ADD CONSTRAINT time_off_requests_type_check 
CHECK (type = ANY (ARRAY['conge_paye'::text, 'rtt'::text, 'maladie'::text, 'sans_solde'::text, 'autre'::text]));