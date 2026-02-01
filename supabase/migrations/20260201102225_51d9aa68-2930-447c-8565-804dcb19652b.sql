-- Create employee_commission_configs table
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
EXECUTE FUNCTION public.update_updated_at_column();