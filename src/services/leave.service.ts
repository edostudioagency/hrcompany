import { supabase } from '@/integrations/supabase/client';

export interface TimeOffRequest {
  id: string;
  employee_id: string;
  type: string;
  start_date: string;
  end_date: string;
  start_period?: string;
  end_period?: string;
  reason?: string | null;
  status: string;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  company_id: string;
  created_at?: string;
}

export async function fetchTimeOffRequests(companyId: string, filters?: { status?: string; employeeId?: string }) {
  let query = supabase
    .from('time_off_requests')
    .select('*, employees!inner(first_name, last_name, company_id)')
    .eq('employees.company_id', companyId)
    .order('created_at', { ascending: false });

  if (filters?.status) {
    query = query.eq('status', filters.status);
  }
  if (filters?.employeeId) {
    query = query.eq('employee_id', filters.employeeId);
  }

  const { data, error } = await query;
  if (error) throw new Error(`Erreur lors du chargement des demandes de congés: ${error.message}`);
  return data;
}

export async function createTimeOffRequest(request: Omit<TimeOffRequest, 'id' | 'created_at'>) {
  const { data, error } = await supabase
    .from('time_off_requests')
    .insert(request)
    .select()
    .single();

  if (error) throw new Error(`Erreur lors de la création de la demande: ${error.message}`);
  return data;
}

export async function updateTimeOffRequestStatus(
  requestId: string,
  status: 'approved' | 'rejected' | 'cancelled',
  reviewedBy: string
) {
  const { data, error } = await supabase
    .from('time_off_requests')
    .update({
      status,
      reviewed_by: reviewedBy,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', requestId)
    .select()
    .single();

  if (error) throw new Error(`Erreur lors de la mise à jour de la demande: ${error.message}`);
  return data;
}
