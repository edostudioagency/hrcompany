import { supabase } from '@/integrations/supabase/client';

export interface Shift {
  id: string;
  employee_id: string;
  date: string;
  start_time: string;
  end_time: string;
  location_id?: string | null;
  notes?: string | null;
  status: string;
  company_id: string;
  created_at?: string;
}

export async function fetchShifts(companyId: string, startDate: string, endDate: string) {
  const { data, error } = await supabase
    .from('shifts')
    .select('*, employees!inner(first_name, last_name, company_id)')
    .eq('employees.company_id', companyId)
    .gte('date', startDate)
    .lte('date', endDate);

  if (error) throw new Error(`Erreur lors du chargement des shifts: ${error.message}`);
  return data;
}

export async function createShift(shift: Omit<Shift, 'id' | 'created_at'>) {
  const { data, error } = await supabase
    .from('shifts')
    .insert(shift)
    .select()
    .single();

  if (error) throw new Error(`Erreur lors de la création du shift: ${error.message}`);
  return data;
}

export async function updateShift(shiftId: string, updates: Partial<Shift>) {
  const { data, error } = await supabase
    .from('shifts')
    .update(updates)
    .eq('id', shiftId)
    .select()
    .single();

  if (error) throw new Error(`Erreur lors de la mise à jour du shift: ${error.message}`);
  return data;
}

export async function deleteShift(shiftId: string) {
  const { error } = await supabase
    .from('shifts')
    .delete()
    .eq('id', shiftId);

  if (error) throw new Error(`Erreur lors de la suppression du shift: ${error.message}`);
}
