-- =====================================================
-- Migration: Auto-update leave_balances.used when a time_off_request is approved
-- Bug fix: leave balance was not decremented automatically on approval
-- =====================================================

-- Function to count working days between two dates (excluding weekends)
-- Note: does not exclude public holidays (handled at app level)
CREATE OR REPLACE FUNCTION public.count_working_days(start_date DATE, end_date DATE)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  total_days NUMERIC := 0;
  cur_date DATE := start_date;
BEGIN
  WHILE cur_date <= end_date LOOP
    -- 0 = Sunday, 6 = Saturday in PostgreSQL extract(dow)
    IF EXTRACT(DOW FROM cur_date) NOT IN (0, 6) THEN
      total_days := total_days + 1;
    END IF;
    cur_date := cur_date + INTERVAL '1 day';
  END LOOP;
  RETURN total_days;
END;
$$;

-- Map time_off_requests.type to leave_balances.type
CREATE OR REPLACE FUNCTION public.map_leave_type(request_type TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  RETURN CASE request_type
    WHEN 'vacation'  THEN 'conge_paye'
    WHEN 'sick'      THEN 'maladie'
    WHEN 'personal'  THEN 'sans_solde'
    WHEN 'rtt'       THEN 'rtt'
    WHEN 'other'     THEN 'autre'
    -- Special legal leaves: no balance tracking needed (fixed duration by law)
    WHEN 'marriage'  THEN NULL
    WHEN 'pacs'      THEN NULL
    WHEN 'birth'     THEN NULL
    WHEN 'death'     THEN NULL
    WHEN 'move'      THEN NULL
    ELSE NULL
  END;
END;
$$;

-- Main trigger function: auto-update leave_balances.used
CREATE OR REPLACE FUNCTION public.update_leave_balance_on_approval()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  balance_type TEXT;
  days_count NUMERIC;
  leave_year INTEGER;
BEGIN
  -- Only act when status changes
  IF TG_OP = 'UPDATE' AND OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  -- Map leave type to balance type
  balance_type := public.map_leave_type(NEW.type);
  
  -- If no balance type (special legal leaves), skip
  IF balance_type IS NULL THEN
    RETURN NEW;
  END IF;

  -- Calculate working days
  days_count := public.count_working_days(NEW.start_date, NEW.end_date);
  leave_year := EXTRACT(YEAR FROM NEW.start_date)::INTEGER;

  -- Case 1: NEW status is 'approved' → increment used
  IF NEW.status = 'approved' THEN
    -- Decrement old if was previously approved (shouldn't happen but safe)
    IF TG_OP = 'UPDATE' AND OLD.status = 'approved' THEN
      UPDATE public.leave_balances
      SET used = GREATEST(0, used - days_count),
          updated_at = now()
      WHERE employee_id = NEW.employee_id
        AND type = balance_type
        AND year = leave_year;
    END IF;

    -- Increment for new approval
    UPDATE public.leave_balances
    SET used = used + days_count,
        updated_at = now()
    WHERE employee_id = NEW.employee_id
      AND type = balance_type
      AND year = leave_year;

  -- Case 2: status changes FROM 'approved' to something else → decrement used
  ELSIF TG_OP = 'UPDATE' AND OLD.status = 'approved' AND NEW.status != 'approved' THEN
    UPDATE public.leave_balances
    SET used = GREATEST(0, used - days_count),
        updated_at = now()
    WHERE employee_id = NEW.employee_id
      AND type = balance_type
      AND year = leave_year;
  END IF;

  RETURN NEW;
END;
$$;

-- Create the trigger
DROP TRIGGER IF EXISTS trigger_update_leave_balance ON public.time_off_requests;
CREATE TRIGGER trigger_update_leave_balance
  AFTER INSERT OR UPDATE OF status
  ON public.time_off_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_leave_balance_on_approval();

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.count_working_days(DATE, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION public.map_leave_type(TEXT) TO authenticated;
