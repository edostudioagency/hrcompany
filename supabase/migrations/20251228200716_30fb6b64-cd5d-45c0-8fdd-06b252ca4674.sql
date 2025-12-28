-- Add is_executive column to employees table
ALTER TABLE public.employees ADD COLUMN is_executive boolean NOT NULL DEFAULT false;

-- Drop and recreate the trigger function to conditionally create RTT balances
CREATE OR REPLACE FUNCTION public.create_default_leave_balances()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  current_year integer := EXTRACT(YEAR FROM CURRENT_DATE);
BEGIN
  -- Create default leave balances for the new employee
  -- RTT is only created for executives (cadres)
  INSERT INTO public.leave_balances (employee_id, type, year, annual_entitlement, used)
  VALUES 
    (NEW.id, 'conge_paye', current_year, 25, 0),
    (NEW.id, 'maladie', current_year, 0, 0),
    (NEW.id, 'sans_solde', current_year, 0, 0),
    (NEW.id, 'autre', current_year, 0, 0);
  
  -- Only create RTT balance if employee is executive
  IF NEW.is_executive = true THEN
    INSERT INTO public.leave_balances (employee_id, type, year, annual_entitlement, used)
    VALUES (NEW.id, 'rtt', current_year, 10, 0);
  END IF;
  
  RETURN NEW;
END;
$function$;