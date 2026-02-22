-- Migration: auto-decompte congés
-- Trigger to automatically update leave_balances.used when a time_off_request
-- is approved or un-approved (cancelled).

-- Helper function: count working days (Monday–Friday) between two dates inclusive
CREATE OR REPLACE FUNCTION calculate_working_days(p_start DATE, p_end DATE)
RETURNS INTEGER AS $$
DECLARE
  d DATE;
  cnt INTEGER := 0;
BEGIN
  d := p_start;
  WHILE d <= p_end LOOP
    -- DOW: 0=Sunday, 6=Saturday
    IF EXTRACT(DOW FROM d) NOT IN (0, 6) THEN
      cnt := cnt + 1;
    END IF;
    d := d + INTERVAL '1 day';
  END LOOP;
  RETURN cnt;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Trigger function: update leave_balances.used on status change
CREATE OR REPLACE FUNCTION update_leave_balance_on_approval()
RETURNS TRIGGER AS $$
DECLARE
  leave_type_mapped TEXT;
  working_days      INTEGER;
  leave_year        INTEGER;
BEGIN
  -- Map time_off type to leave_balance type
  CASE NEW.type
    WHEN 'vacation' THEN leave_type_mapped := 'conge_paye';
    WHEN 'sick'     THEN leave_type_mapped := 'maladie';
    WHEN 'personal' THEN leave_type_mapped := 'sans_solde';
    WHEN 'other'    THEN leave_type_mapped := 'autre';
    ELSE leave_type_mapped := NULL; -- Special legal types (marriage, pacs, birth, death, move, rtt)
                                    -- are not tracked in leave_balances; skip
  END CASE;

  IF leave_type_mapped IS NULL THEN
    RETURN NEW;
  END IF;

  leave_year   := EXTRACT(YEAR FROM NEW.start_date)::INTEGER;
  working_days := calculate_working_days(NEW.start_date, NEW.end_date);

  -- Status changed TO approved → increment used
  IF OLD.status != 'approved' AND NEW.status = 'approved' THEN
    UPDATE leave_balances
    SET used       = used + working_days,
        updated_at = NOW()
    WHERE employee_id = NEW.employee_id
      AND type        = leave_type_mapped
      AND year        = leave_year;

  -- Status changed FROM approved → decrement used (cancellation)
  ELSIF OLD.status = 'approved' AND NEW.status != 'approved' THEN
    UPDATE leave_balances
    SET used       = GREATEST(0, used - working_days),
        updated_at = NOW()
    WHERE employee_id = NEW.employee_id
      AND type        = leave_type_mapped
      AND year        = leave_year;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach trigger (idempotent)
DROP TRIGGER IF EXISTS trigger_update_leave_balance ON time_off_requests;
CREATE TRIGGER trigger_update_leave_balance
  AFTER UPDATE ON time_off_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_leave_balance_on_approval();
