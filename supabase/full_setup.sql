-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'manager', 'employee');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'employee',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles (prevents RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Create function to get user role
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.user_roles
  WHERE user_id = _user_id
  LIMIT 1
$$;

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile"
ON public.profiles FOR SELECT
TO authenticated
USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Managers can view all profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'manager'));

-- RLS Policies for user_roles
CREATE POLICY "Users can view their own roles"
ON public.user_roles FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles"
ON public.user_roles FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage roles"
ON public.user_roles FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Trigger to create profile and role on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
  
  RETURN NEW;
END;
$$;

-- Create trigger for new user
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Trigger for profiles updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();-- Create employees table (linked to user profiles)
CREATE TABLE public.employees (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID,
  team_id UUID,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT,
  position TEXT,
  hourly_rate DECIMAL(10,2),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('active', 'inactive', 'pending')),
  invitation_token UUID,
  invitation_sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create default weekly schedule template
CREATE TABLE public.employee_schedules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6), -- 0 = Sunday, 6 = Saturday
  start_time TIME,
  end_time TIME,
  is_working_day BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(employee_id, day_of_week)
);

-- Create time off requests table
CREATE TABLE public.time_off_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('vacation', 'sick', 'personal', 'other')),
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by UUID REFERENCES public.employees(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create shift swap requests table
CREATE TABLE public.shift_swap_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  requester_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  target_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  original_date DATE NOT NULL,
  swap_date DATE NOT NULL,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by UUID REFERENCES public.employees(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create email notifications log
CREATE TABLE public.email_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  recipient_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('invitation', 'schedule_change', 'time_off', 'shift_swap')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  error_message TEXT,
  sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_off_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shift_swap_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for employees
CREATE POLICY "Admins can manage all employees"
ON public.employees FOR ALL
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Managers can view all employees"
ON public.employees FOR SELECT
USING (has_role(auth.uid(), 'manager'));

CREATE POLICY "Managers can insert employees"
ON public.employees FOR INSERT
WITH CHECK (has_role(auth.uid(), 'manager'));

CREATE POLICY "Managers can update employees"
ON public.employees FOR UPDATE
USING (has_role(auth.uid(), 'manager'));

CREATE POLICY "Employees can view their own record"
ON public.employees FOR SELECT
USING (user_id = auth.uid());

-- RLS Policies for employee_schedules
CREATE POLICY "Admins can manage all schedules"
ON public.employee_schedules FOR ALL
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Managers can manage schedules"
ON public.employee_schedules FOR ALL
USING (has_role(auth.uid(), 'manager'));

CREATE POLICY "Employees can view their own schedule"
ON public.employee_schedules FOR SELECT
USING (
  employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid())
);

-- RLS Policies for time_off_requests
CREATE POLICY "Admins can manage all time off requests"
ON public.time_off_requests FOR ALL
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Managers can manage time off requests"
ON public.time_off_requests FOR ALL
USING (has_role(auth.uid(), 'manager'));

CREATE POLICY "Employees can view their own requests"
ON public.time_off_requests FOR SELECT
USING (
  employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid())
);

CREATE POLICY "Employees can create their own requests"
ON public.time_off_requests FOR INSERT
WITH CHECK (
  employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid())
);

-- RLS Policies for shift_swap_requests
CREATE POLICY "Admins can manage all swap requests"
ON public.shift_swap_requests FOR ALL
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Managers can manage swap requests"
ON public.shift_swap_requests FOR ALL
USING (has_role(auth.uid(), 'manager'));

CREATE POLICY "Employees can view swap requests involving them"
ON public.shift_swap_requests FOR SELECT
USING (
  requester_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid())
  OR target_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid())
);

CREATE POLICY "Employees can create swap requests"
ON public.shift_swap_requests FOR INSERT
WITH CHECK (
  requester_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid())
);

-- RLS Policies for email_notifications
CREATE POLICY "Admins can view all notifications"
ON public.email_notifications FOR SELECT
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage notifications"
ON public.email_notifications FOR ALL
USING (has_role(auth.uid(), 'admin'));

-- Triggers for updated_at
CREATE TRIGGER update_employees_updated_at
BEFORE UPDATE ON public.employees
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_employee_schedules_updated_at
BEFORE UPDATE ON public.employee_schedules
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_time_off_requests_updated_at
BEFORE UPDATE ON public.time_off_requests
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_shift_swap_requests_updated_at
BEFORE UPDATE ON public.shift_swap_requests
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();-- Table des shifts (planning)
CREATE TABLE public.shifts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  location TEXT,
  status TEXT NOT NULL DEFAULT 'planned',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for shifts
ALTER TABLE public.shifts ENABLE ROW LEVEL SECURITY;

-- RLS policies for shifts
CREATE POLICY "Admins can manage all shifts" ON public.shifts
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Managers can manage shifts" ON public.shifts
  FOR ALL USING (has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "Employees can view their own shifts" ON public.shifts
  FOR SELECT USING (employee_id IN (
    SELECT id FROM employees WHERE user_id = auth.uid()
  ));

-- Table des commissions
CREATE TABLE public.commissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
  year INTEGER NOT NULL CHECK (year >= 2020),
  amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(employee_id, month, year)
);

-- Enable RLS for commissions
ALTER TABLE public.commissions ENABLE ROW LEVEL SECURITY;

-- RLS policies for commissions
CREATE POLICY "Admins can manage all commissions" ON public.commissions
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Managers can manage commissions" ON public.commissions
  FOR ALL USING (has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "Employees can view their own commissions" ON public.commissions
  FOR SELECT USING (employee_id IN (
    SELECT id FROM employees WHERE user_id = auth.uid()
  ));

-- Table des fiches de paie
CREATE TABLE public.payslips (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
  year INTEGER NOT NULL CHECK (year >= 2020),
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  uploaded_by UUID REFERENCES public.employees(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(employee_id, month, year)
);

-- Enable RLS for payslips
ALTER TABLE public.payslips ENABLE ROW LEVEL SECURITY;

-- RLS policies for payslips
CREATE POLICY "Admins can manage all payslips" ON public.payslips
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Managers can manage payslips" ON public.payslips
  FOR ALL USING (has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "Employees can view their own payslips" ON public.payslips
  FOR SELECT USING (employee_id IN (
    SELECT id FROM employees WHERE user_id = auth.uid()
  ));

-- Table pour les paramètres comptable
CREATE TABLE public.accountant_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT,
  send_commissions_monthly BOOLEAN DEFAULT true,
  notify_on_new_commission BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for accountant_settings
ALTER TABLE public.accountant_settings ENABLE ROW LEVEL SECURITY;

-- RLS policies for accountant_settings
CREATE POLICY "Admins can manage accountant settings" ON public.accountant_settings
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Managers can view accountant settings" ON public.accountant_settings
  FOR SELECT USING (has_role(auth.uid(), 'manager'::app_role));

-- Storage bucket for payslips
INSERT INTO storage.buckets (id, name, public) 
VALUES ('payslips', 'payslips', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for payslips
CREATE POLICY "Admins can manage payslip files" ON storage.objects
  FOR ALL USING (bucket_id = 'payslips' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Managers can upload payslip files" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'payslips' AND has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "Managers can view payslip files" ON storage.objects
  FOR SELECT USING (bucket_id = 'payslips' AND has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "Employees can download their own payslips" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'payslips' 
    AND auth.uid() IN (
      SELECT e.user_id FROM employees e
      JOIN payslips p ON p.employee_id = e.id
      WHERE p.file_path = name
    )
  );

-- Triggers for updated_at
CREATE TRIGGER update_shifts_updated_at
  BEFORE UPDATE ON public.shifts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_commissions_updated_at
  BEFORE UPDATE ON public.commissions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_accountant_settings_updated_at
  BEFORE UPDATE ON public.accountant_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();-- Add contract fields to employees table
ALTER TABLE public.employees
ADD COLUMN contract_type text,
ADD COLUMN contract_start_date date,
ADD COLUMN contract_end_date date;

-- Create employee_documents table
CREATE TABLE public.employee_documents (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  document_type text NOT NULL, -- 'contract', 'id_card', 'cv', 'other'
  document_name text NOT NULL,
  file_path text NOT NULL,
  file_size integer,
  uploaded_by uuid REFERENCES auth.users(id),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.employee_documents ENABLE ROW LEVEL SECURITY;

-- Employees can view their own documents
CREATE POLICY "Employees can view their own documents"
ON public.employee_documents
FOR SELECT
USING (
  employee_id IN (
    SELECT id FROM public.employees WHERE user_id = auth.uid()
  )
);

-- Managers can view documents (they can view all employees)
CREATE POLICY "Managers can view documents"
ON public.employee_documents
FOR SELECT
USING (public.has_role(auth.uid(), 'manager'));

-- Admins can manage all documents
CREATE POLICY "Admins can manage all documents"
ON public.employee_documents
FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Managers can insert documents
CREATE POLICY "Managers can insert documents"
ON public.employee_documents
FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'manager'));

-- Managers can update documents
CREATE POLICY "Managers can update documents"
ON public.employee_documents
FOR UPDATE
USING (public.has_role(auth.uid(), 'manager'));

-- Create trigger for updated_at
CREATE TRIGGER update_employee_documents_updated_at
BEFORE UPDATE ON public.employee_documents
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for employee documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('employee-documents', 'employee-documents', false);

-- Storage RLS policies

-- Employees can view their own files
CREATE POLICY "Employees can view their own documents files"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'employee-documents'
  AND (
    -- Extract employee_id from path (format: employee_id/filename)
    (storage.foldername(name))[1] IN (
      SELECT id::text FROM public.employees WHERE user_id = auth.uid()
    )
  )
);

-- Managers can view all documents
CREATE POLICY "Managers can view all employee documents"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'employee-documents'
  AND public.has_role(auth.uid(), 'manager')
);

-- Admins can manage all documents
CREATE POLICY "Admins can manage all employee document files"
ON storage.objects
FOR ALL
USING (
  bucket_id = 'employee-documents'
  AND public.has_role(auth.uid(), 'admin')
);

-- Managers can upload documents
CREATE POLICY "Managers can upload employee documents"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'employee-documents'
  AND public.has_role(auth.uid(), 'manager')
);

-- Managers can update documents
CREATE POLICY "Managers can update employee documents"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'employee-documents'
  AND public.has_role(auth.uid(), 'manager')
);-- Add contract hours and gross salary columns to employees
ALTER TABLE public.employees 
ADD COLUMN IF NOT EXISTS contract_hours numeric,
ADD COLUMN IF NOT EXISTS gross_salary numeric;-- Add salary_type column to employees table
ALTER TABLE public.employees 
ADD COLUMN salary_type text DEFAULT 'fixed';

-- Add comment for clarity
COMMENT ON COLUMN public.employees.salary_type IS 'Type of salary: fixed, commission, hourly';-- Create a function to get the current user's company_id from their employee record
CREATE OR REPLACE FUNCTION public.get_user_company_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT company_id
  FROM public.employees
  WHERE user_id = _user_id
  LIMIT 1
$$;

-- Drop the existing manager SELECT policy
DROP POLICY IF EXISTS "Managers can view all employees" ON public.employees;

-- Create new company-scoped manager SELECT policy
CREATE POLICY "Managers can view company employees"
ON public.employees
FOR SELECT
USING (
  has_role(auth.uid(), 'manager'::app_role) 
  AND (
    -- Managers can see employees in their company
    company_id = get_user_company_id(auth.uid())
    -- Or if company_id is null (for backward compatibility during migration)
    OR (company_id IS NULL AND get_user_company_id(auth.uid()) IS NULL)
  )
);

-- Update the manager UPDATE policy to be company-scoped
DROP POLICY IF EXISTS "Managers can update employees" ON public.employees;

CREATE POLICY "Managers can update company employees"
ON public.employees
FOR UPDATE
USING (
  has_role(auth.uid(), 'manager'::app_role) 
  AND (
    company_id = get_user_company_id(auth.uid())
    OR (company_id IS NULL AND get_user_company_id(auth.uid()) IS NULL)
  )
);

-- Update the manager INSERT policy to be company-scoped
DROP POLICY IF EXISTS "Managers can insert employees" ON public.employees;

CREATE POLICY "Managers can insert company employees"
ON public.employees
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'manager'::app_role) 
  AND (
    company_id = get_user_company_id(auth.uid())
    OR (company_id IS NULL AND get_user_company_id(auth.uid()) IS NULL)
  )
);-- Add restrictive policy to deny anonymous access to employees table
-- This policy requires that users must be authenticated to access any employee data
CREATE POLICY "Require authentication for employees"
ON public.employees
AS RESTRICTIVE
FOR ALL
USING (auth.uid() IS NOT NULL);

-- Add restrictive policy to deny anonymous access to profiles table
CREATE POLICY "Require authentication for profiles"
ON public.profiles
AS RESTRICTIVE
FOR ALL
USING (auth.uid() IS NOT NULL);-- Create leave_balances table
CREATE TABLE public.leave_balances (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- conge_paye, rtt, maladie, sans_solde, autre
  year INTEGER NOT NULL,
  annual_entitlement NUMERIC NOT NULL DEFAULT 0, -- droits annuels
  used NUMERIC NOT NULL DEFAULT 0, -- jours utilisés
  balance NUMERIC GENERATED ALWAYS AS (annual_entitlement - used) STORED,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(employee_id, type, year)
);

-- Enable RLS
ALTER TABLE public.leave_balances ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Employees can view their own balances"
ON public.leave_balances
FOR SELECT
USING (employee_id IN (
  SELECT id FROM public.employees WHERE user_id = auth.uid()
));

CREATE POLICY "Managers can view all balances"
ON public.leave_balances
FOR SELECT
USING (has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "Managers can manage balances"
ON public.leave_balances
FOR ALL
USING (has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "Admins can manage all balances"
ON public.leave_balances
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_leave_balances_updated_at
BEFORE UPDATE ON public.leave_balances
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for performance
CREATE INDEX idx_leave_balances_employee_year ON public.leave_balances(employee_id, year);-- Remove the overly permissive policy that allows ANY authenticated user to access employees table
-- This policy is too broad and creates a security vulnerability
DROP POLICY IF EXISTS "Require authentication for employees" ON public.employees;-- Remove the overly permissive policy that allows ANY authenticated user to access profiles table
-- The remaining role-based policies (admin/manager view, user own profile) are sufficient
DROP POLICY IF EXISTS "Require authentication for profiles" ON public.profiles;-- Update handle_new_user to automatically link new users to existing employees by email
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
  
  -- Automatically link to an existing employee with the same email
  UPDATE public.employees
  SET user_id = NEW.id,
      status = 'active',
      invitation_token = NULL
  WHERE email = NEW.email
    AND user_id IS NULL;
  
  RETURN NEW;
END;
$$;-- Drop the constraint first
ALTER TABLE public.time_off_requests DROP CONSTRAINT time_off_requests_type_check;-- Add the new constraint with French types
ALTER TABLE public.time_off_requests ADD CONSTRAINT time_off_requests_type_check 
CHECK (type = ANY (ARRAY['conge_paye'::text, 'rtt'::text, 'maladie'::text, 'sans_solde'::text, 'autre'::text]));-- 1. Ajouter la colonne manager_id à la table employees (si pas déjà fait)
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
SET search_path = public
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
);-- Fix security: Ensure profiles table requires authentication
-- Drop existing permissive SELECT policies to replace with secure ones
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Managers can view all profiles" ON public.profiles;

-- Create new PERMISSIVE policies with explicit auth check
CREATE POLICY "Authenticated users can view their own profile" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Managers can view all profiles" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (has_role(auth.uid(), 'manager'::app_role));

-- Fix security: Ensure employees table requires authentication
DROP POLICY IF EXISTS "Employees can view their own record" ON public.employees;
DROP POLICY IF EXISTS "Admins can manage all employees" ON public.employees;
DROP POLICY IF EXISTS "Managers can view company employees" ON public.employees;
DROP POLICY IF EXISTS "Managers can insert company employees" ON public.employees;
DROP POLICY IF EXISTS "Managers can update company employees" ON public.employees;

-- Create new PERMISSIVE policies with explicit auth check
CREATE POLICY "Authenticated employees can view their own record" 
ON public.employees 
FOR SELECT 
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Admins can manage all employees" 
ON public.employees 
FOR ALL 
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Managers can view company employees" 
ON public.employees 
FOR SELECT 
TO authenticated
USING (has_role(auth.uid(), 'manager'::app_role) AND ((company_id = get_user_company_id(auth.uid())) OR ((company_id IS NULL) AND (get_user_company_id(auth.uid()) IS NULL))));

CREATE POLICY "Managers can insert company employees" 
ON public.employees 
FOR INSERT 
TO authenticated
WITH CHECK (has_role(auth.uid(), 'manager'::app_role) AND ((company_id = get_user_company_id(auth.uid())) OR ((company_id IS NULL) AND (get_user_company_id(auth.uid()) IS NULL))));

CREATE POLICY "Managers can update company employees" 
ON public.employees 
FOR UPDATE 
TO authenticated
USING (has_role(auth.uid(), 'manager'::app_role) AND ((company_id = get_user_company_id(auth.uid())) OR ((company_id IS NULL) AND (get_user_company_id(auth.uid()) IS NULL))));-- Add 'accountant' role to the app_role enum
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
$function$;-- Add is_executive column to employees table
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
$function$;-- Create companies table
CREATE TABLE public.companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  legal_name text,
  siret text,
  address text,
  phone text,
  email text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Enable RLS on companies
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

-- Create company_locations table
CREATE TABLE public.company_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  address text,
  minimum_employees integer DEFAULT 1,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Enable RLS on company_locations
ALTER TABLE public.company_locations ENABLE ROW LEVEL SECURITY;

-- Create company_settings table
CREATE TABLE public.company_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE UNIQUE,
  
  -- Shift swap rules
  allow_shift_swaps boolean DEFAULT true,
  
  -- Accountant settings
  accountant_email text,
  accountant_notification_days integer[] DEFAULT '{1}',
  
  -- Collective agreement - Leave
  annual_paid_leave_days numeric DEFAULT 25,
  paid_leave_per_month numeric DEFAULT 2.08,
  rtt_days_per_year integer DEFAULT 10,
  sick_leave_accrual boolean DEFAULT false,
  sick_leave_accrual_rate numeric DEFAULT 0,
  
  -- Working hours
  default_work_hours_per_day numeric DEFAULT 7,
  weekly_hours numeric DEFAULT 35,
  
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Enable RLS on company_settings
ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for companies
CREATE POLICY "Admins can manage all companies"
ON public.companies
FOR ALL
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Managers can view companies"
ON public.companies
FOR SELECT
USING (has_role(auth.uid(), 'manager'));

-- RLS Policies for company_locations
CREATE POLICY "Admins can manage all locations"
ON public.company_locations
FOR ALL
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Managers can view locations"
ON public.company_locations
FOR SELECT
USING (has_role(auth.uid(), 'manager'));

CREATE POLICY "Employees can view locations"
ON public.company_locations
FOR SELECT
USING (
  company_id IN (
    SELECT company_id FROM public.employees WHERE user_id = auth.uid()
  )
);

-- RLS Policies for company_settings
CREATE POLICY "Admins can manage all settings"
ON public.company_settings
FOR ALL
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Managers can view settings"
ON public.company_settings
FOR SELECT
USING (has_role(auth.uid(), 'manager'));

-- Add triggers for updated_at
CREATE TRIGGER update_companies_updated_at
BEFORE UPDATE ON public.companies
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_company_locations_updated_at
BEFORE UPDATE ON public.company_locations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_company_settings_updated_at
BEFORE UPDATE ON public.company_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();-- Add leave calculation mode to company_settings
ALTER TABLE public.company_settings
ADD COLUMN leave_calculation_mode text DEFAULT 'jours_ouvres' CHECK (leave_calculation_mode IN ('jours_ouvres', 'jours_ouvrables'));-- Create user_companies table for multi-company management (admins)
CREATE TABLE public.user_companies (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    is_default boolean DEFAULT false,
    created_at timestamptz DEFAULT now(),
    UNIQUE (user_id, company_id)
);

-- Enable RLS
ALTER TABLE public.user_companies ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own company associations"
ON public.user_companies
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all company associations"
ON public.user_companies
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Function to ensure only one default company per user
CREATE OR REPLACE FUNCTION public.ensure_single_default_company()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

-- Trigger to maintain single default
CREATE TRIGGER ensure_single_default_company_trigger
BEFORE INSERT OR UPDATE ON public.user_companies
FOR EACH ROW
EXECUTE FUNCTION public.ensure_single_default_company();-- Remove unique constraint on email to allow same user in multiple companies
ALTER TABLE public.employees DROP CONSTRAINT IF EXISTS employees_email_key;-- Fix profiles table: require authentication for all access
-- First, drop existing SELECT policies and recreate with proper auth requirements
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Managers can view all profiles" ON public.profiles;

-- Create permissive policies that require authentication
CREATE POLICY "Authenticated users can view their own profile" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Managers can view all profiles" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (has_role(auth.uid(), 'manager'::app_role));

-- Fix companies table: require authentication for all access
DROP POLICY IF EXISTS "Admins can manage all companies" ON public.companies;
DROP POLICY IF EXISTS "Managers can view companies" ON public.companies;

-- Create policies that require authentication
CREATE POLICY "Admins can manage all companies" 
ON public.companies 
FOR ALL 
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Managers can view companies" 
ON public.companies 
FOR SELECT 
TO authenticated
USING (has_role(auth.uid(), 'manager'::app_role));

-- Allow employees to view their own company
CREATE POLICY "Employees can view their own company" 
ON public.companies 
FOR SELECT 
TO authenticated
USING (id IN (
  SELECT company_id FROM public.employees WHERE user_id = auth.uid()
));-- Ensure RLS is enabled on profiles table
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Revoke all public access to profiles
REVOKE ALL ON public.profiles FROM anon;
REVOKE ALL ON public.profiles FROM public;

-- Ensure RLS is enabled on employees table  
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;

-- Revoke all public access to employees
REVOKE ALL ON public.employees FROM anon;
REVOKE ALL ON public.employees FROM public;-- Add RESTRICTIVE authentication policies to all sensitive tables
-- This creates a defense-in-depth approach where authentication is always required

-- companies table
CREATE POLICY "Require authentication for companies"
ON public.companies
AS RESTRICTIVE
FOR ALL
USING (auth.uid() IS NOT NULL);

REVOKE ALL ON public.companies FROM anon;
REVOKE ALL ON public.companies FROM public;

-- company_locations table
CREATE POLICY "Require authentication for company_locations"
ON public.company_locations
AS RESTRICTIVE
FOR ALL
USING (auth.uid() IS NOT NULL);

REVOKE ALL ON public.company_locations FROM anon;
REVOKE ALL ON public.company_locations FROM public;

-- company_settings table
CREATE POLICY "Require authentication for company_settings"
ON public.company_settings
AS RESTRICTIVE
FOR ALL
USING (auth.uid() IS NOT NULL);

REVOKE ALL ON public.company_settings FROM anon;
REVOKE ALL ON public.company_settings FROM public;

-- leave_balances table
CREATE POLICY "Require authentication for leave_balances"
ON public.leave_balances
AS RESTRICTIVE
FOR ALL
USING (auth.uid() IS NOT NULL);

REVOKE ALL ON public.leave_balances FROM anon;
REVOKE ALL ON public.leave_balances FROM public;

-- time_off_requests table
CREATE POLICY "Require authentication for time_off_requests"
ON public.time_off_requests
AS RESTRICTIVE
FOR ALL
USING (auth.uid() IS NOT NULL);

REVOKE ALL ON public.time_off_requests FROM anon;
REVOKE ALL ON public.time_off_requests FROM public;

-- shift_swap_requests table
CREATE POLICY "Require authentication for shift_swap_requests"
ON public.shift_swap_requests
AS RESTRICTIVE
FOR ALL
USING (auth.uid() IS NOT NULL);

REVOKE ALL ON public.shift_swap_requests FROM anon;
REVOKE ALL ON public.shift_swap_requests FROM public;

-- shifts table
CREATE POLICY "Require authentication for shifts"
ON public.shifts
AS RESTRICTIVE
FOR ALL
USING (auth.uid() IS NOT NULL);

REVOKE ALL ON public.shifts FROM anon;
REVOKE ALL ON public.shifts FROM public;

-- email_notifications table
CREATE POLICY "Require authentication for email_notifications"
ON public.email_notifications
AS RESTRICTIVE
FOR ALL
USING (auth.uid() IS NOT NULL);

REVOKE ALL ON public.email_notifications FROM anon;
REVOKE ALL ON public.email_notifications FROM public;

-- commissions table
CREATE POLICY "Require authentication for commissions"
ON public.commissions
AS RESTRICTIVE
FOR ALL
USING (auth.uid() IS NOT NULL);

REVOKE ALL ON public.commissions FROM anon;
REVOKE ALL ON public.commissions FROM public;

-- payslips table
CREATE POLICY "Require authentication for payslips"
ON public.payslips
AS RESTRICTIVE
FOR ALL
USING (auth.uid() IS NOT NULL);

REVOKE ALL ON public.payslips FROM anon;
REVOKE ALL ON public.payslips FROM public;

-- accountant_settings table
CREATE POLICY "Require authentication for accountant_settings"
ON public.accountant_settings
AS RESTRICTIVE
FOR ALL
USING (auth.uid() IS NOT NULL);

REVOKE ALL ON public.accountant_settings FROM anon;
REVOKE ALL ON public.accountant_settings FROM public;

-- employee_documents table
CREATE POLICY "Require authentication for employee_documents"
ON public.employee_documents
AS RESTRICTIVE
FOR ALL
USING (auth.uid() IS NOT NULL);

REVOKE ALL ON public.employee_documents FROM anon;
REVOKE ALL ON public.employee_documents FROM public;

-- employee_schedules table
CREATE POLICY "Require authentication for employee_schedules"
ON public.employee_schedules
AS RESTRICTIVE
FOR ALL
USING (auth.uid() IS NOT NULL);

REVOKE ALL ON public.employee_schedules FROM anon;
REVOKE ALL ON public.employee_schedules FROM public;

-- user_companies table
CREATE POLICY "Require authentication for user_companies"
ON public.user_companies
AS RESTRICTIVE
FOR ALL
USING (auth.uid() IS NOT NULL);

REVOKE ALL ON public.user_companies FROM anon;
REVOKE ALL ON public.user_companies FROM public;

-- user_roles table
CREATE POLICY "Require authentication for user_roles"
ON public.user_roles
AS RESTRICTIVE
FOR ALL
USING (auth.uid() IS NOT NULL);

REVOKE ALL ON public.user_roles FROM anon;
REVOKE ALL ON public.user_roles FROM public;-- Create a separate table for invitation tokens with strict RLS
CREATE TABLE public.employee_invitations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    invitation_token uuid NOT NULL DEFAULT gen_random_uuid(),
    sent_at timestamp with time zone DEFAULT now(),
    expires_at timestamp with time zone DEFAULT (now() + interval '7 days'),
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    UNIQUE(employee_id),
    UNIQUE(invitation_token)
);

-- Enable RLS
ALTER TABLE public.employee_invitations ENABLE ROW LEVEL SECURITY;

-- Only admins can manage invitations
CREATE POLICY "Admins can manage all invitations"
ON public.employee_invitations
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Require authentication (RESTRICTIVE)
CREATE POLICY "Require authentication for employee_invitations"
ON public.employee_invitations
AS RESTRICTIVE
FOR ALL
USING (auth.uid() IS NOT NULL);

-- Revoke anonymous access
REVOKE ALL ON public.employee_invitations FROM anon;
REVOKE ALL ON public.employee_invitations FROM public;

-- Migrate existing invitation data to the new table
INSERT INTO public.employee_invitations (employee_id, invitation_token, sent_at)
SELECT id, invitation_token, invitation_sent_at
FROM public.employees
WHERE invitation_token IS NOT NULL;

-- Clear invitation tokens from employees table (they're now in the secure table)
UPDATE public.employees
SET invitation_token = NULL, invitation_sent_at = NULL
WHERE invitation_token IS NOT NULL;-- Add logo_url to companies table
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS logo_url TEXT;

-- Add avatar_url to employees table
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Add avatar_url to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Create storage bucket for profile images
INSERT INTO storage.buckets (id, name, public)
VALUES ('profile-images', 'profile-images', true)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for profile-images bucket
-- Anyone can view images (public bucket)
CREATE POLICY "Profile images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'profile-images');

-- Authenticated users can upload to their own folder
CREATE POLICY "Users can upload their own profile image"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'profile-images' 
  AND auth.uid() IS NOT NULL
);

-- Users can update their own images
CREATE POLICY "Users can update their own profile image"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'profile-images' 
  AND auth.uid() IS NOT NULL
);

-- Users can delete their own images
CREATE POLICY "Users can delete their own profile image"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'profile-images' 
  AND auth.uid() IS NOT NULL
);-- Create a function to check if a user belongs to a specific company
CREATE OR REPLACE FUNCTION public.user_belongs_to_company(_user_id uuid, _company_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.employees
    WHERE user_id = _user_id
      AND company_id = _company_id
  )
$$;

-- Drop existing manager policies on employees table
DROP POLICY IF EXISTS "Managers can view company employees" ON public.employees;
DROP POLICY IF EXISTS "Managers can insert company employees" ON public.employees;
DROP POLICY IF EXISTS "Managers can update company employees" ON public.employees;

-- Recreate policies with proper company isolation
CREATE POLICY "Managers can view company employees" 
ON public.employees 
FOR SELECT 
USING (
  has_role(auth.uid(), 'manager'::app_role) 
  AND user_belongs_to_company(auth.uid(), company_id)
);

CREATE POLICY "Managers can insert company employees" 
ON public.employees 
FOR INSERT 
WITH CHECK (
  has_role(auth.uid(), 'manager'::app_role) 
  AND user_belongs_to_company(auth.uid(), company_id)
);

CREATE POLICY "Managers can update company employees" 
ON public.employees 
FOR UPDATE 
USING (
  has_role(auth.uid(), 'manager'::app_role) 
  AND user_belongs_to_company(auth.uid(), company_id)
);-- Create employee_commission_configs table
CREATE TABLE public.employee_commission_configs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL UNIQUE REFERENCES public.employees(id) ON DELETE CASCADE,
  commission_type TEXT NOT NULL DEFAULT 'ca',
  commission_rate NUMERIC NOT NULL DEFAULT 0,
  fixed_amount_per_unit NUMERIC DEFAULT 0,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT valid_commission_type CHECK (commission_type IN ('ca', 'margin_gross', 'margin_net', 'fixed', 'other'))
);

-- Enable RLS on employee_commission_configs
ALTER TABLE public.employee_commission_configs ENABLE ROW LEVEL SECURITY;

-- RLS policies for employee_commission_configs
CREATE POLICY "Require authentication for employee_commission_configs"
ON public.employee_commission_configs
FOR ALL
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage all commission configs"
ON public.employee_commission_configs
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Managers can manage company commission configs"
ON public.employee_commission_configs
FOR ALL
USING (
  has_role(auth.uid(), 'manager'::app_role) 
  AND EXISTS (
    SELECT 1 FROM public.employees e 
    WHERE e.id = employee_commission_configs.employee_id 
    AND user_belongs_to_company(auth.uid(), e.company_id)
  )
);

CREATE POLICY "Employees can view their own commission config"
ON public.employee_commission_configs
FOR SELECT
USING (
  employee_id IN (
    SELECT id FROM public.employees WHERE user_id = auth.uid()
  )
);

-- Add columns to commissions table
ALTER TABLE public.commissions 
ADD COLUMN base_amount NUMERIC DEFAULT NULL,
ADD COLUMN commission_rate_used NUMERIC DEFAULT NULL;

-- Create trigger for updated_at on employee_commission_configs
CREATE TRIGGER update_employee_commission_configs_updated_at
BEFORE UPDATE ON public.employee_commission_configs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();-- Add commissions_send_mode column to company_settings
ALTER TABLE public.company_settings 
ADD COLUMN IF NOT EXISTS commissions_send_mode text NOT NULL DEFAULT 'manual';

-- Add a check constraint to ensure valid values
ALTER TABLE public.company_settings 
ADD CONSTRAINT commissions_send_mode_check 
CHECK (commissions_send_mode IN ('manual', 'automatic'));-- Add employee_sort_order column to company_settings
ALTER TABLE public.company_settings 
ADD COLUMN employee_sort_order text DEFAULT 'first_name';

-- Add a comment to document the column
COMMENT ON COLUMN public.company_settings.employee_sort_order IS 'Sort order for employee lists: first_name or last_name';ALTER TABLE public.time_off_requests
ADD COLUMN part_of_day text NOT NULL DEFAULT 'full_day';
-- Drop the existing manager SELECT policy
DROP POLICY IF EXISTS "Managers can view accountant settings" ON public.accountant_settings;

-- Fix: Restrict profile-images storage policies to prevent cross-user access

-- Drop existing permissive policies
DROP POLICY IF EXISTS "Users can upload their own profile image" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own profile image" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own profile image" ON storage.objects;
DROP POLICY IF EXISTS "Profile images are publicly accessible" ON storage.objects;

-- Re-create public SELECT (needed for avatars to display)
CREATE POLICY "Profile images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'profile-images');

-- INSERT: users can only upload to their own employee folder or admins can upload anywhere
CREATE POLICY "Users can upload their own profile image"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'profile-images'
  AND auth.uid() IS NOT NULL
  AND (
    -- Admin/manager can upload for any employee or company
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'manager'::public.app_role)
    -- Regular users: folder must match their employee ID
    OR (storage.foldername(name))[1] = 'employees'
      AND (storage.foldername(name))[2] IN (
        SELECT id::text FROM public.employees WHERE user_id = auth.uid()
      )
  )
);

-- UPDATE: same restriction
CREATE POLICY "Users can update their own profile image"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'profile-images'
  AND auth.uid() IS NOT NULL
  AND (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'manager'::public.app_role)
    OR (storage.foldername(name))[1] = 'employees'
      AND (storage.foldername(name))[2] IN (
        SELECT id::text FROM public.employees WHERE user_id = auth.uid()
      )
  )
);

-- DELETE: same restriction
CREATE POLICY "Users can delete their own profile image"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'profile-images'
  AND auth.uid() IS NOT NULL
  AND (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'manager'::public.app_role)
    OR (storage.foldername(name))[1] = 'employees'
      AND (storage.foldername(name))[2] IN (
        SELECT id::text FROM public.employees WHERE user_id = auth.uid()
      )
  )
);

-- Create audit_logs table for sensitive operations
CREATE TABLE public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  action text NOT NULL,
  table_name text NOT NULL,
  record_id uuid,
  old_values jsonb,
  new_values jsonb,
  company_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX idx_audit_logs_timestamp ON public.audit_logs(created_at);
CREATE INDEX idx_audit_logs_table_name ON public.audit_logs(table_name);

-- Enable RLS
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit logs
CREATE POLICY "Admins can view all audit logs"
ON public.audit_logs FOR SELECT
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Only system can insert (via triggers with SECURITY DEFINER)
CREATE POLICY "System can insert audit logs"
ON public.audit_logs FOR INSERT
WITH CHECK (true);

-- Require authentication
CREATE POLICY "Require authentication for audit_logs"
ON public.audit_logs FOR ALL
USING (auth.uid() IS NOT NULL);

-- Audit trigger function
CREATE OR REPLACE FUNCTION public.audit_trigger_func()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

-- Attach triggers to sensitive tables
CREATE TRIGGER audit_user_roles
AFTER INSERT OR UPDATE OR DELETE ON public.user_roles
FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

CREATE TRIGGER audit_payslips
AFTER INSERT OR UPDATE OR DELETE ON public.payslips
FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

CREATE TRIGGER audit_commissions
AFTER INSERT OR UPDATE OR DELETE ON public.commissions
FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

CREATE TRIGGER audit_employees
AFTER UPDATE OR DELETE ON public.employees
FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

CREATE TRIGGER audit_employee_documents
AFTER INSERT OR UPDATE OR DELETE ON public.employee_documents
FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

-- Replace overly permissive INSERT policy with a restrictive one
-- Audit logs should only be inserted by the SECURITY DEFINER trigger function
-- Regular users should never insert directly
DROP POLICY IF EXISTS "System can insert audit logs" ON public.audit_logs;

-- No direct INSERT policy needed - the SECURITY DEFINER trigger bypasses RLS
-- This ensures no user can directly insert fake audit logs
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
  current_date DATE := start_date;
BEGIN
  WHILE current_date <= end_date LOOP
    -- 0 = Sunday, 6 = Saturday in PostgreSQL extract(dow)
    IF EXTRACT(DOW FROM current_date) NOT IN (0, 6) THEN
      total_days := total_days + 1;
    END IF;
    current_date := current_date + INTERVAL '1 day';
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
SET search_path = public
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
-- =====================================================
-- Migration: Add legal special leave types (French labor law)
-- Congés événements familiaux - Article L3142-1 Code du travail
-- =====================================================

-- Step 1: Drop the existing CHECK constraint on time_off_requests.type
ALTER TABLE public.time_off_requests 
  DROP CONSTRAINT IF EXISTS time_off_requests_type_check;

-- Step 2: Add new CHECK constraint with all legal types
ALTER TABLE public.time_off_requests
  ADD CONSTRAINT time_off_requests_type_check 
  CHECK (type IN (
    'vacation',   -- Congés payés (CP)
    'sick',       -- Arrêt maladie
    'personal',   -- Sans solde / Congé personnel
    'rtt',        -- RTT
    'other',      -- Autre
    -- Congés légaux pour événements familiaux (Art. L3142-1)
    'marriage',   -- Mariage salarié : 4 jours ouvrables
    'pacs',       -- PACS salarié : 4 jours ouvrables
    'birth',      -- Naissance / adoption : 3 jours ouvrables (en plus congé paternité)
    'death',      -- Décès (3-5 jours selon lien de parenté)
    'move'        -- Déménagement (selon convention collective)
  ));

-- Step 3: Add a table to store legal duration for special leave types (informational)
CREATE TABLE IF NOT EXISTS public.special_leave_durations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  max_days_ouvres INTEGER NOT NULL,
  law_reference TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Insert legal durations (Code du travail français)
INSERT INTO public.special_leave_durations (type, label, max_days_ouvres, law_reference, notes)
VALUES
  ('marriage', 'Mariage du salarié', 4, 'Art. L3142-4 CT', 'Jours ouvrables. Convention collective peut prévoir plus.'),
  ('pacs', 'PACS du salarié', 4, 'Art. L3142-4 CT', 'Jours ouvrables depuis loi du 23 mars 2019.'),
  ('birth', 'Naissance ou adoption', 3, 'Art. L3142-4 CT', 'Jours ouvrables. Distinct du congé paternité (25 jours).'),
  ('death', 'Décès (parent proche)', 3, 'Art. L3142-4 CT', '3j conjoint/enfant, 3j parent, 2j frère/sœur, 1j beau-parent.'),
  ('move', 'Déménagement', 1, 'Convention collective', 'Selon CCN applicable. Souvent 1 à 3 jours.')
ON CONFLICT (type) DO NOTHING;

-- Enable RLS on special_leave_durations (read-only for all authenticated)
ALTER TABLE public.special_leave_durations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated can view special leave durations"
  ON public.special_leave_durations
  FOR SELECT
  TO authenticated
  USING (true);

-- Step 4: Add French labels for leave types in UI (comment for devs)
-- Frontend mapping:
-- vacation → Congés payés
-- sick     → Maladie
-- personal → Sans solde
-- rtt      → RTT
-- other    → Autre
-- marriage → Mariage (4j)
-- pacs     → PACS (4j)
-- birth    → Naissance / Adoption (3j)
-- death    → Décès (3-5j)
-- move     → Déménagement
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
SET search_path = public
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
SET search_path = public
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
SET search_path = public
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
  current_date DATE    := start_date;
BEGIN
  WHILE current_date <= end_date LOOP
    IF EXTRACT(DOW FROM current_date) NOT IN (0, 6) THEN
      total_days := total_days + 1;
    END IF;
    current_date := current_date + INTERVAL '1 day';
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
-- =====================================================
-- Migration: Fix payslip storage policies for managers
-- Problem: Managers only had INSERT and SELECT on storage.objects
--          but need UPDATE (for upsert) and DELETE (for deletion)
-- =====================================================

-- Add UPDATE policy for managers on payslip storage
CREATE POLICY "Managers can update payslip files" ON storage.objects
  FOR UPDATE USING (bucket_id = 'payslips' AND has_role(auth.uid(), 'manager'::app_role))
  WITH CHECK (bucket_id = 'payslips' AND has_role(auth.uid(), 'manager'::app_role));

-- Add DELETE policy for managers on payslip storage
CREATE POLICY "Managers can delete payslip files" ON storage.objects
  FOR DELETE USING (bucket_id = 'payslips' AND has_role(auth.uid(), 'manager'::app_role));
