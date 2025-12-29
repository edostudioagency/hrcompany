-- Remove unique constraint on email to allow same user in multiple companies
ALTER TABLE public.employees DROP CONSTRAINT IF EXISTS employees_email_key;