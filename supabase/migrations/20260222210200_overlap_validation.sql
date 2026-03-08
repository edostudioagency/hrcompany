-- =====================================================
-- Migration: Prevent overlapping time-off requests and shifts
-- Critical bug: duplicate requests possible for same period
-- =====================================================

-- =====================================================
-- PART 1: Prevent overlapping time-off requests
-- =====================================================

CREATE OR REPLACE FUNCTION public.check_time_off_overlap()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  overlap_count INTEGER;
BEGIN
  -- Only check active requests (not rejected)
  SELECT COUNT(*) INTO overlap_count
  FROM public.time_off_requests t
  WHERE t.employee_id = NEW.employee_id
    AND t.id != COALESCE(NEW.id, gen_random_uuid()) -- exclude self on UPDATE
    AND t.status != 'rejected'
    AND t.start_date <= NEW.end_date
    AND t.end_date >= NEW.start_date;

  IF overlap_count > 0 THEN
    RAISE EXCEPTION 'Une demande de congé existe déjà sur cette période pour cet employé (chevauchement détecté).'
      USING ERRCODE = 'integrity_constraint_violation';
  END IF;

  -- Also validate dates
  IF NEW.end_date < NEW.start_date THEN
    RAISE EXCEPTION 'La date de fin doit être postérieure ou égale à la date de début.'
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_check_time_off_overlap ON public.time_off_requests;
CREATE TRIGGER trigger_check_time_off_overlap
  BEFORE INSERT OR UPDATE OF start_date, end_date, employee_id, status
  ON public.time_off_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.check_time_off_overlap();

-- =====================================================
-- PART 2: Prevent overlapping shifts for same employee on same day
-- =====================================================

CREATE OR REPLACE FUNCTION public.check_shift_overlap()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  overlap_count INTEGER;
BEGIN
  -- Check if employee already has a shift on this date with overlapping times
  SELECT COUNT(*) INTO overlap_count
  FROM public.shifts s
  WHERE s.employee_id = NEW.employee_id
    AND s.id != COALESCE(NEW.id, gen_random_uuid()) -- exclude self on UPDATE
    AND s.date = NEW.date
    AND s.status != 'cancelled'
    AND s.start_time < NEW.end_time
    AND s.end_time > NEW.start_time;

  IF overlap_count > 0 THEN
    RAISE EXCEPTION 'Un créneau existe déjà pour cet employé sur cette plage horaire (chevauchement détecté).'
      USING ERRCODE = 'integrity_constraint_violation';
  END IF;

  -- Validate shift times
  IF NEW.end_time <= NEW.start_time THEN
    RAISE EXCEPTION 'L''heure de fin doit être postérieure à l''heure de début.'
      USING ERRCODE = 'check_violation';
  END IF;

  -- Optional: warn if shift > 10h (legal maximum in France)
  -- We don't block but could add a notification mechanism
  -- IF EXTRACT(EPOCH FROM (NEW.end_time - NEW.start_time)) / 3600 > 10 THEN
  --   RAISE WARNING 'Ce créneau dépasse la durée légale maximale de 10h par jour.';
  -- END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_check_shift_overlap ON public.shifts;
CREATE TRIGGER trigger_check_shift_overlap
  BEFORE INSERT OR UPDATE OF date, start_time, end_time, employee_id
  ON public.shifts
  FOR EACH ROW
  EXECUTE FUNCTION public.check_shift_overlap();

-- =====================================================
-- PART 3: Also prevent time-off during an approved leave
-- (if employee tries to create a shift during approved leave)
-- =====================================================

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

DROP TRIGGER IF EXISTS trigger_check_shift_during_leave ON public.shifts;
CREATE TRIGGER trigger_check_shift_during_leave
  BEFORE INSERT OR UPDATE OF date, employee_id
  ON public.shifts
  FOR EACH ROW
  EXECUTE FUNCTION public.check_shift_during_leave();
