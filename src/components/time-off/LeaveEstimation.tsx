import { useMemo, useEffect, useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Calculator, AlertTriangle, CheckCircle } from 'lucide-react';
import { calculateWorkingDays, formatDaysCount, LEAVE_TYPE_LABELS } from '@/lib/leave-calculator';
import { useLeaveBalances } from '@/hooks/useLeaveBalances';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface EmployeeSchedule {
  day_of_week: number;
  is_working_day: boolean;
}

interface LeaveEstimationProps {
  employeeId: string;
  startDate?: Date;
  endDate?: Date;
  leaveType: string;
  partOfDay?: 'full_day' | 'morning' | 'afternoon';
  className?: string;
}

export function LeaveEstimation({
  employeeId,
  startDate,
  endDate,
  leaveType,
  partOfDay = 'full_day',
  className,
}: LeaveEstimationProps) {
  const { getBalanceForType, loading: balanceLoading } = useLeaveBalances(employeeId);
  const [schedule, setSchedule] = useState<EmployeeSchedule[]>([]);
  const [loadingSchedule, setLoadingSchedule] = useState(true);

  // Fetch employee schedule
  useEffect(() => {
    const fetchSchedule = async () => {
      if (!employeeId) {
        setLoadingSchedule(false);
        return;
      }

      try {
        const { data } = await supabase
          .from('employee_schedules')
          .select('day_of_week, is_working_day')
          .eq('employee_id', employeeId);

        setSchedule(data || []);
      } catch (err) {
        console.error('Error fetching schedule:', err);
      } finally {
        setLoadingSchedule(false);
      }
    };

    fetchSchedule();
  }, [employeeId]);

  const estimation = useMemo(() => {
    if (!startDate || !endDate) return null;

    const daysRequested = calculateWorkingDays(
      startDate,
      endDate,
      partOfDay,
      schedule.length > 0 ? schedule : undefined
    );

    const balance = getBalanceForType(leaveType);
    const currentBalance = balance?.balance ?? null;
    const remainingBalance = currentBalance !== null 
      ? currentBalance - daysRequested 
      : null;
    const hasInsufficientBalance = remainingBalance !== null && remainingBalance < 0;

    return {
      daysRequested,
      currentBalance,
      remainingBalance,
      hasInsufficientBalance,
      hasBalance: currentBalance !== null,
    };
  }, [startDate, endDate, partOfDay, schedule, leaveType, getBalanceForType]);

  if (balanceLoading || loadingSchedule) {
    return null;
  }

  if (!estimation || estimation.daysRequested === 0) {
    return null;
  }

  const typeLabel = LEAVE_TYPE_LABELS[leaveType] || leaveType;

  return (
    <Alert 
      className={cn(
        'border-2',
        estimation.hasInsufficientBalance 
          ? 'border-destructive/50 bg-destructive/5' 
          : 'border-primary/30 bg-primary/5',
        className
      )}
    >
      <Calculator className="h-4 w-4" />
      <AlertDescription className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="font-medium">Estimation de votre demande</span>
          <Badge variant="secondary">{typeLabel}</Badge>
        </div>

        <div className="grid gap-2 text-sm">
          <div className="flex justify-between items-center py-1 border-b border-border/50">
            <span className="text-muted-foreground">Jours ouvrés demandés</span>
            <span className="font-semibold">{formatDaysCount(estimation.daysRequested)}</span>
          </div>

          {estimation.hasBalance && (
            <>
              <div className="flex justify-between items-center py-1 border-b border-border/50">
                <span className="text-muted-foreground">Solde actuel</span>
                <span className="font-medium">{formatDaysCount(estimation.currentBalance!)}</span>
              </div>

              <div className={cn(
                'flex justify-between items-center py-2 rounded px-2 -mx-2',
                estimation.hasInsufficientBalance 
                  ? 'bg-destructive/10' 
                  : 'bg-green-50 dark:bg-green-950/20'
              )}>
                <span className="font-medium flex items-center gap-2">
                  {estimation.hasInsufficientBalance ? (
                    <AlertTriangle className="h-4 w-4 text-destructive" />
                  ) : (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  )}
                  Solde après validation
                </span>
                <span className={cn(
                  'font-bold',
                  estimation.hasInsufficientBalance 
                    ? 'text-destructive' 
                    : 'text-green-600'
                )}>
                  {formatDaysCount(estimation.remainingBalance!)}
                </span>
              </div>
            </>
          )}

          {!estimation.hasBalance && (
            <p className="text-muted-foreground text-xs">
              Aucun solde configuré pour ce type de congé.
            </p>
          )}

          {estimation.hasInsufficientBalance && (
            <p className="text-destructive text-xs font-medium">
              ⚠️ Solde insuffisant pour cette demande
            </p>
          )}
        </div>
      </AlertDescription>
    </Alert>
  );
}
