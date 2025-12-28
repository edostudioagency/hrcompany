-- Create companies table
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
EXECUTE FUNCTION public.update_updated_at_column();