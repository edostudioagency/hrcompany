import { supabase } from '@/integrations/supabase/client';

export interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string | null;
  position?: string | null;
  status: string;
  company_id: string;
  user_id?: string | null;
  manager_id?: string | null;
  team_id?: string | null;
  contract_type?: string | null;
  contract_start_date?: string | null;
  contract_end_date?: string | null;
  contract_hours?: number | null;
  hourly_rate?: number | null;
  gross_salary?: number | null;
  salary_type?: string | null;
  is_executive?: boolean;
  created_at?: string;
  updated_at?: string;
}

export async function fetchEmployees(companyId: string) {
  const { data, error } = await supabase
    .from('employees')
    .select('*')
    .eq('company_id', companyId);

  if (error) throw new Error(`Erreur lors du chargement des employés: ${error.message}`);
  return data;
}

export async function fetchEmployeeById(employeeId: string) {
  const { data, error } = await supabase
    .from('employees')
    .select('*')
    .eq('id', employeeId)
    .single();

  if (error) throw new Error(`Erreur lors du chargement de l'employé: ${error.message}`);
  return data;
}

export async function createEmployee(employee: Omit<Employee, 'id' | 'created_at' | 'updated_at'>) {
  const { data, error } = await supabase
    .from('employees')
    .insert(employee)
    .select()
    .single();

  if (error) throw new Error(`Erreur lors de la création de l'employé: ${error.message}`);
  return data;
}

export async function updateEmployee(employeeId: string, updates: Partial<Employee>) {
  const { data, error } = await supabase
    .from('employees')
    .update(updates)
    .eq('id', employeeId)
    .select()
    .single();

  if (error) throw new Error(`Erreur lors de la mise à jour de l'employé: ${error.message}`);
  return data;
}

export async function deleteEmployee(employeeId: string) {
  const { error } = await supabase
    .from('employees')
    .delete()
    .eq('id', employeeId);

  if (error) throw new Error(`Erreur lors de la suppression de l'employé: ${error.message}`);
}
