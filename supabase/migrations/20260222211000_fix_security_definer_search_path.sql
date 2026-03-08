-- =====================================================
-- Migration: Comprehensive fix for SECURITY DEFINER search_path
-- Supabase lint: "Function Search Path Mutable"
-- Fix: set search_path = '' on ALL SECURITY DEFINER functions
-- Per Supabase best practice: https://supabase.com/docs/guides/database/functions#security-definer
-- =====================================================

-- 1. has_role — prevents RLS recursion on user_roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- 2. get_user_role
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS public.app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT role
  FROM public.user_roles
  WHERE user_id = _user_id
  LIMIT 1
$$;

-- 3. handle_new_user (final version: creates profile + role + employee)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  INSERT INTO public.profiles (id, email, first_name, last_name)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data ->> 'first_name',
    NEW.raw_user_meta_data ->> 'last_name'
  );

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'employee');

  IF NOT EXISTS (SELECT 1 FROM public.employees WHERE email = NEW.email) THEN
    INSERT INTO public.employees (user_id, email, first_name, last_name, status)
    VALUES (
      NEW.id,
      NEW.email,
      NEW.raw_user_meta_data ->> 'first_name',
      NEW.raw_user_meta_data ->> 'last_name',
      'active'
    );
  ELSE
    UPDATE public.employees
    SET user_id = NEW.id,
        status = 'active',
        invitation_token = NULL
    WHERE email = NEW.email
      AND user_id IS NULL;
  END IF;

  RETURN NEW;
END;
$function$;

-- 4. get_user_company_id
CREATE OR REPLACE FUNCTION public.get_user_company_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT company_id
  FROM public.employees
  WHERE user_id = _user_id
  LIMIT 1
$$;

-- 5. create_default_leave_balances
CREATE OR REPLACE FUNCTION public.create_default_leave_balances()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  current_year integer := EXTRACT(YEAR FROM CURRENT_DATE);
BEGIN
  INSERT INTO public.leave_balances (employee_id, type, year, annual_entitlement, used)
  VALUES
    (NEW.id, 'conge_paye', current_year, 25, 0),
    (NEW.id, 'maladie',    current_year,  0, 0),
    (NEW.id, 'sans_solde', current_year,  0, 0),
    (NEW.id, 'autre',      current_year,  0, 0);

  IF NEW.is_executive = true THEN
    INSERT INTO public.leave_balances (employee_id, type, year, annual_entitlement, used)
    VALUES (NEW.id, 'rtt', current_year, 10, 0);
  END IF;

  RETURN NEW;
END;
$function$;

-- 6. ensure_single_default_company
CREATE OR REPLACE FUNCTION public.ensure_single_default_company()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.is_default = true THEN
    UPDATE public.user_companies
    SET is_default = false
    WHERE user_id = NEW.user_id
      AND id != NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

-- 7. user_belongs_to_company
CREATE OR REPLACE FUNCTION public.user_belongs_to_company(_user_id uuid, _company_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.employees
    WHERE user_id = _user_id
      AND company_id = _company_id
  )
$$;

-- 8. audit_trigger_func
CREATE OR REPLACE FUNCTION public.audit_trigger_func()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.audit_logs (user_id, action, table_name, record_id, old_values, new_values)
  VALUES (
    auth.uid(),
    TG_OP,
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) ELSE NULL END
  );
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- 9. count_working_days
CREATE OR REPLACE FUNCTION public.count_working_days(start_date DATE, end_date DATE)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  total_days   NUMERIC := 0;
  cur_date DATE    := start_date;
BEGIN
  WHILE cur_date <= end_date LOOP
    IF EXTRACT(DOW FROM cur_date) NOT IN (0, 6) THEN
      total_days := total_days + 1;
    END IF;
    cur_date := cur_date + INTERVAL '1 day';
  END LOOP;
  RETURN total_days;
END;
$$;

-- 10. update_leave_balance_on_approval
-- Replaces both migration 210000 and 210001 versions.
-- Uses public.map_leave_type and public.count_working_days (fully qualified).
-- Also drops the redundant calculate_working_days from migration 210001.
DROP FUNCTION IF EXISTS calculate_working_days(DATE, DATE);

CREATE OR REPLACE FUNCTION public.update_leave_balance_on_approval()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  balance_type TEXT;
  days_count   NUMERIC;
  leave_year   INTEGER;
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  balance_type := public.map_leave_type(NEW.type);

  IF balance_type IS NULL THEN
    RETURN NEW;
  END IF;

  days_count := public.count_working_days(NEW.start_date, NEW.end_date);
  leave_year := EXTRACT(YEAR FROM NEW.start_date)::INTEGER;

  IF NEW.status = 'approved' THEN
    IF TG_OP = 'UPDATE' AND OLD.status = 'approved' THEN
      UPDATE public.leave_balances
      SET used       = GREATEST(0, used - days_count),
          updated_at = now()
      WHERE employee_id = NEW.employee_id
        AND type = balance_type
        AND year = leave_year;
    END IF;

    UPDATE public.leave_balances
    SET used       = used + days_count,
        updated_at = now()
    WHERE employee_id = NEW.employee_id
      AND type = balance_type
      AND year = leave_year;

  ELSIF TG_OP = 'UPDATE' AND OLD.status = 'approved' AND NEW.status != 'approved' THEN
    UPDATE public.leave_balances
    SET used       = GREATEST(0, used - days_count),
        updated_at = now()
    WHERE employee_id = NEW.employee_id
      AND type = balance_type
      AND year = leave_year;
  END IF;

  RETURN NEW;
END;
$$;

-- Re-attach trigger (in case 210001 version replaced it)
DROP TRIGGER IF EXISTS trigger_update_leave_balance ON public.time_off_requests;
CREATE TRIGGER trigger_update_leave_balance
  AFTER INSERT OR UPDATE OF status
  ON public.time_off_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_leave_balance_on_approval();

-- 11. check_time_off_overlap
CREATE OR REPLACE FUNCTION public.check_time_off_overlap()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  overlap_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO overlap_count
  FROM public.time_off_requests t
  WHERE t.employee_id = NEW.employee_id
    AND t.id != COALESCE(NEW.id, gen_random_uuid())
    AND t.status != 'rejected'
    AND t.start_date <= NEW.end_date
    AND t.end_date >= NEW.start_date;

  IF overlap_count > 0 THEN
    RAISE EXCEPTION 'Une demande de congé existe déjà sur cette période pour cet employé (chevauchement détecté).'
      USING ERRCODE = 'integrity_constraint_violation';
  END IF;

  IF NEW.end_date < NEW.start_date THEN
    RAISE EXCEPTION 'La date de fin doit être postérieure ou égale à la date de début.'
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

-- 12. check_shift_overlap
CREATE OR REPLACE FUNCTION public.check_shift_overlap()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  overlap_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO overlap_count
  FROM public.shifts s
  WHERE s.employee_id = NEW.employee_id
    AND s.id != COALESCE(NEW.id, gen_random_uuid())
    AND s.date = NEW.date
    AND s.status != 'cancelled'
    AND s.start_time < NEW.end_time
    AND s.end_time > NEW.start_time;

  IF overlap_count > 0 THEN
    RAISE EXCEPTION 'Un créneau existe déjà pour cet employé sur cette plage horaire (chevauchement détecté).'
      USING ERRCODE = 'integrity_constraint_violation';
  END IF;

  IF NEW.end_time <= NEW.start_time THEN
    RAISE EXCEPTION 'L''heure de fin doit être postérieure à l''heure de début.'
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

-- 13. check_shift_during_leave
CREATE OR REPLACE FUNCTION public.check_shift_during_leave()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  leave_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO leave_count
  FROM public.time_off_requests t
  WHERE t.employee_id = NEW.employee_id
    AND t.status = 'approved'
    AND NEW.date BETWEEN t.start_date AND t.end_date;

  IF leave_count > 0 THEN
    RAISE EXCEPTION 'Impossible de créer un créneau : l''employé est en congé approuvé à cette date.'
      USING ERRCODE = 'integrity_constraint_violation';
  END IF;

  RETURN NEW;
END;
$$;
