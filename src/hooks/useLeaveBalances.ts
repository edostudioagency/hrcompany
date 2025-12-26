import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface LeaveBalance {
  id: string;
  employee_id: string;
  type: string;
  year: number;
  annual_entitlement: number;
  used: number;
  balance: number;
}

export function useLeaveBalances(employeeId?: string) {
  const { user } = useAuth();
  const [balances, setBalances] = useState<LeaveBalance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const currentYear = new Date().getFullYear();

  const fetchBalances = useCallback(async () => {
    if (!employeeId && !user?.id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // If employeeId is provided, use it directly
      // Otherwise, find the employee record for the current user
      let targetEmployeeId = employeeId;

      if (!targetEmployeeId && user?.id) {
        const { data: empData } = await supabase
          .from('employees')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();

        targetEmployeeId = empData?.id;
      }

      if (!targetEmployeeId) {
        setBalances([]);
        setLoading(false);
        return;
      }

      const { data, error: fetchError } = await supabase
        .from('leave_balances')
        .select('*')
        .eq('employee_id', targetEmployeeId)
        .eq('year', currentYear);

      if (fetchError) throw fetchError;

      setBalances(data || []);
    } catch (err) {
      console.error('Error fetching leave balances:', err);
      setError('Erreur lors du chargement des soldes de congés');
    } finally {
      setLoading(false);
    }
  }, [employeeId, user?.id, currentYear]);

  useEffect(() => {
    fetchBalances();
  }, [fetchBalances]);

  const getBalanceForType = useCallback((type: string): LeaveBalance | undefined => {
    // Map different type names to the same balance
    const typeMapping: Record<string, string> = {
      vacation: 'conge_paye',
      sick: 'maladie',
      personal: 'autre',
      other: 'autre',
    };
    const normalizedType = typeMapping[type] || type;
    return balances.find(b => b.type === normalizedType || b.type === type);
  }, [balances]);

  const updateBalance = useCallback(async (
    targetEmployeeId: string,
    type: string,
    usedDays: number,
    operation: 'add' | 'subtract' = 'add'
  ) => {
    try {
      // Get current balance
      const { data: currentBalance } = await supabase
        .from('leave_balances')
        .select('*')
        .eq('employee_id', targetEmployeeId)
        .eq('type', type)
        .eq('year', currentYear)
        .maybeSingle();

      if (currentBalance) {
        // Update existing balance
        const newUsed = operation === 'add' 
          ? currentBalance.used + usedDays 
          : Math.max(0, currentBalance.used - usedDays);

        await supabase
          .from('leave_balances')
          .update({ used: newUsed })
          .eq('id', currentBalance.id);
      }

      // Refresh balances
      await fetchBalances();
    } catch (err) {
      console.error('Error updating leave balance:', err);
      throw err;
    }
  }, [currentYear, fetchBalances]);

  return {
    balances,
    loading,
    error,
    refetch: fetchBalances,
    getBalanceForType,
    updateBalance,
  };
}
