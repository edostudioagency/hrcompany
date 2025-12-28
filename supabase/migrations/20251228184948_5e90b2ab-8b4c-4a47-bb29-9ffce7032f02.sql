-- Add 'accountant' role to the app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'accountant';

-- Create employee for existing admin account (iamthomasg@gmail.com)
INSERT INTO public.employees (user_id, email, first_name, last_name, status)
SELECT 
  '7d3cac97-d956-4092-879c-8b2f59134455'::uuid,
  'iamthomasg@gmail.com',
  p.first_name,
  p.last_name,
  'active'
FROM public.profiles p
WHERE p.id = '7d3cac97-d956-4092-879c-8b2f59134455'
ON CONFLICT DO NOTHING;

-- Update handle_new_user function to also create an employee
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Insert profile
  INSERT INTO public.profiles (id, email, first_name, last_name)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data ->> 'first_name',
    NEW.raw_user_meta_data ->> 'last_name'
  );
  
  -- Insert default role (employee)
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'employee');
  
  -- Check if an employee record already exists for this email (invitation flow)
  -- If not, create a new employee record automatically
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
    -- Link existing employee to the new user
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