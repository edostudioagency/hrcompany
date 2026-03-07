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
