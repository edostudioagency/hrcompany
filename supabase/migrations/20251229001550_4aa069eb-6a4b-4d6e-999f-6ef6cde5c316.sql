-- Add RESTRICTIVE authentication policies to all sensitive tables
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
REVOKE ALL ON public.user_roles FROM public;