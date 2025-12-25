-- Table des shifts (planning)
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
  EXECUTE FUNCTION public.update_updated_at_column();