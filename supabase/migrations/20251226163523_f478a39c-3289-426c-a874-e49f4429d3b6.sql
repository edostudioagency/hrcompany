-- Create leave_balances table
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
CREATE INDEX idx_leave_balances_employee_year ON public.leave_balances(employee_id, year);