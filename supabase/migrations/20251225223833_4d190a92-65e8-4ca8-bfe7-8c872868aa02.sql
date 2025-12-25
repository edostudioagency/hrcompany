-- Create employees table (linked to user profiles)
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
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();