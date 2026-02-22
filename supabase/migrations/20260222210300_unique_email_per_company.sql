-- =====================================================
-- Migration: Add UNIQUE(email, company_id) constraint on employees
-- Fixes: old UNIQUE(email) was removed for multi-company support
-- but left the door open for duplicate emails within the same company
-- =====================================================

-- Step 1: Remove any duplicate entries first (keep the most recent)
-- This prevents the constraint creation from failing on existing data
DELETE FROM public.employees e1
USING public.employees e2
WHERE e1.id < e2.id  -- keep the one with the higher UUID (created later)
  AND e1.email = e2.email
  AND e1.company_id = e2.company_id;

-- Step 2: Drop old individual UNIQUE constraint on email if it still exists
ALTER TABLE public.employees 
  DROP CONSTRAINT IF EXISTS employees_email_key;
ALTER TABLE public.employees 
  DROP CONSTRAINT IF EXISTS employees_email_unique;

-- Step 3: Add composite UNIQUE constraint
-- Ensures an email can only appear once per company (allows same email across companies)
ALTER TABLE public.employees
  ADD CONSTRAINT employees_email_company_unique 
  UNIQUE (email, company_id);

-- Step 4: Add index to support the constraint efficiently
CREATE INDEX IF NOT EXISTS idx_employees_email_company 
  ON public.employees (email, company_id);

-- Note: This means:
-- ✅ alice@example.com in Company A + alice@example.com in Company B → OK
-- ❌ alice@example.com twice in Company A → BLOCKED
