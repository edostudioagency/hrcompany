-- Add contract fields to employees table
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
);