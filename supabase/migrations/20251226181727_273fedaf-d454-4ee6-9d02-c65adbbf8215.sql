-- 1. Ajouter la colonne manager_id à la table employees (si pas déjà fait)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'manager_id') THEN
    ALTER TABLE public.employees ADD COLUMN manager_id uuid REFERENCES public.employees(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 2. Créer une fonction pour initialiser les soldes de congés par défaut (sans la colonne balance qui est générée)
CREATE OR REPLACE FUNCTION public.create_default_leave_balances()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  current_year integer := EXTRACT(YEAR FROM CURRENT_DATE);
BEGIN
  -- Créer les soldes de congés par défaut pour le nouvel employé (balance est calculée automatiquement)
  INSERT INTO public.leave_balances (employee_id, type, year, annual_entitlement, used)
  VALUES 
    (NEW.id, 'conge_paye', current_year, 25, 0),
    (NEW.id, 'rtt', current_year, 10, 0),
    (NEW.id, 'maladie', current_year, 0, 0),
    (NEW.id, 'sans_solde', current_year, 0, 0),
    (NEW.id, 'autre', current_year, 0, 0);
  
  RETURN NEW;
END;
$$;

-- 3. Supprimer le trigger s'il existe puis le recréer
DROP TRIGGER IF EXISTS on_employee_created_create_leave_balances ON public.employees;
CREATE TRIGGER on_employee_created_create_leave_balances
  AFTER INSERT ON public.employees
  FOR EACH ROW
  EXECUTE FUNCTION public.create_default_leave_balances();

-- 4. Créer les soldes manquants pour les employés existants (sans la colonne balance)
INSERT INTO public.leave_balances (employee_id, type, year, annual_entitlement, used)
SELECT e.id, 'conge_paye', EXTRACT(YEAR FROM CURRENT_DATE)::integer, 25, 0
FROM public.employees e
WHERE NOT EXISTS (
  SELECT 1 FROM public.leave_balances lb 
  WHERE lb.employee_id = e.id 
  AND lb.type = 'conge_paye' 
  AND lb.year = EXTRACT(YEAR FROM CURRENT_DATE)::integer
);

INSERT INTO public.leave_balances (employee_id, type, year, annual_entitlement, used)
SELECT e.id, 'rtt', EXTRACT(YEAR FROM CURRENT_DATE)::integer, 10, 0
FROM public.employees e
WHERE NOT EXISTS (
  SELECT 1 FROM public.leave_balances lb 
  WHERE lb.employee_id = e.id 
  AND lb.type = 'rtt' 
  AND lb.year = EXTRACT(YEAR FROM CURRENT_DATE)::integer
);

INSERT INTO public.leave_balances (employee_id, type, year, annual_entitlement, used)
SELECT e.id, 'maladie', EXTRACT(YEAR FROM CURRENT_DATE)::integer, 0, 0
FROM public.employees e
WHERE NOT EXISTS (
  SELECT 1 FROM public.leave_balances lb 
  WHERE lb.employee_id = e.id 
  AND lb.type = 'maladie' 
  AND lb.year = EXTRACT(YEAR FROM CURRENT_DATE)::integer
);

INSERT INTO public.leave_balances (employee_id, type, year, annual_entitlement, used)
SELECT e.id, 'sans_solde', EXTRACT(YEAR FROM CURRENT_DATE)::integer, 0, 0
FROM public.employees e
WHERE NOT EXISTS (
  SELECT 1 FROM public.leave_balances lb 
  WHERE lb.employee_id = e.id 
  AND lb.type = 'sans_solde' 
  AND lb.year = EXTRACT(YEAR FROM CURRENT_DATE)::integer
);

INSERT INTO public.leave_balances (employee_id, type, year, annual_entitlement, used)
SELECT e.id, 'autre', EXTRACT(YEAR FROM CURRENT_DATE)::integer, 0, 0
FROM public.employees e
WHERE NOT EXISTS (
  SELECT 1 FROM public.leave_balances lb 
  WHERE lb.employee_id = e.id 
  AND lb.type = 'autre' 
  AND lb.year = EXTRACT(YEAR FROM CURRENT_DATE)::integer
);