import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Loader2, Users, Calendar, Briefcase, HeartPulse, Clock, Eye } from 'lucide-react';
import { cn, sortEmployees } from '@/lib/utils';
import { LEAVE_TYPE_LABELS } from '@/lib/leave-calculator';
import { EmployeeLeaveHistory } from './EmployeeLeaveHistory';
import { useCompany } from '@/contexts/CompanyContext';

interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  position: string | null;
  is_executive: boolean;
}

interface LeaveBalance {
  id: string;
  employee_id: string;
  type: string;
  year: number;
  annual_entitlement: number;
  used: number;
  balance: number;
}

interface EmployeeWithBalances extends Employee {
  balances: LeaveBalance[];
}

const typeColors: Record<string, string> = {
  conge_paye: 'bg-blue-500',
  rtt: 'bg-purple-500',
  maladie: 'bg-red-500',
  sans_solde: 'bg-gray-500',
  autre: 'bg-gray-500',
};

function BalanceGauge({ balance }: { balance: LeaveBalance }) {
  const percentage = balance.annual_entitlement > 0 
    ? Math.round((balance.balance / balance.annual_entitlement) * 100)
    : 100;
  const bgColor = typeColors[balance.type] || 'bg-gray-500';
  const label = LEAVE_TYPE_LABELS[balance.type] || balance.type;

  return (
    <div className="flex items-center gap-2 min-w-0">
      <span className="text-xs text-muted-foreground truncate w-12" title={label}>
        {label.substring(0, 3)}
      </span>
      <div className="flex-1 min-w-[60px]">
        <Progress 
          value={percentage} 
          className={cn('h-2', `[&>div]:${bgColor}`)}
        />
      </div>
      <span className="text-xs font-medium w-14 text-right">
        {balance.balance}/{balance.annual_entitlement}
      </span>
    </div>
  );
}

function EmployeeCard({ 
  employee, 
  onViewHistory 
}: { 
  employee: EmployeeWithBalances;
  onViewHistory: (employee: EmployeeWithBalances) => void;
}) {
  const initials = `${employee.first_name[0]}${employee.last_name[0]}`.toUpperCase();
  
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
            <span className="text-sm font-medium text-primary">{initials}</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <h4 className="font-medium text-sm truncate">
                  {employee.first_name} {employee.last_name}
                </h4>
                <p className="text-xs text-muted-foreground truncate">
                  {employee.position || 'Non défini'}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {employee.is_executive && (
                  <Badge variant="secondary" className="text-xs">Cadre</Badge>
                )}
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => onViewHistory(employee)}
                  className="h-8 px-2"
                >
                  <Eye className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            <div className="mt-3 space-y-2">
              {employee.balances.length > 0 ? (
                employee.balances.slice(0, 3).map((balance) => (
                  <BalanceGauge key={balance.id} balance={balance} />
                ))
              ) : (
                <p className="text-xs text-muted-foreground">Aucun solde configuré</p>
              )}
              {employee.balances.length > 3 && (
                <p className="text-xs text-muted-foreground">
                  +{employee.balances.length - 3} autres...
                </p>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function TeamLeaveOverview() {
  const { role, user } = useAuth();
  const { companySettings } = useCompany();
  const [employees, setEmployees] = useState<EmployeeWithBalances[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeWithBalances | null>(null);

  const isAdmin = role === 'admin';
  const currentYear = new Date().getFullYear();
  const sortOrder = companySettings?.employee_sort_order || 'first_name';

  useEffect(() => {
    fetchTeamData();
  }, [user?.id, role]);

  const fetchTeamData = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);

      // First get current employee if manager
      let managerId: string | null = null;
      if (role === 'manager') {
        const { data: currentEmp } = await supabase
          .from('employees')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();
        managerId = currentEmp?.id || null;
      }

      // Fetch employees based on role
      let employeesQuery = supabase
        .from('employees')
        .select('id, first_name, last_name, position, is_executive, user_id')
        .eq('status', 'active');

      // If manager, only get their direct reports
      if (role === 'manager' && managerId) {
        employeesQuery = employeesQuery.eq('manager_id', managerId);
      }

      const { data: employeesData, error: empError } = await employeesQuery;
      if (empError) throw empError;

      if (!employeesData || employeesData.length === 0) {
        setEmployees([]);
        return;
      }

      // Fetch all leave balances for these employees
      const employeeIds = employeesData.map(e => e.id);
      const { data: balancesData, error: balError } = await supabase
        .from('leave_balances')
        .select('*')
        .in('employee_id', employeeIds)
        .eq('year', currentYear);

      if (balError) throw balError;

      // Combine employees with their balances
      const employeesWithBalances: EmployeeWithBalances[] = employeesData.map(emp => ({
        ...emp,
        balances: (balancesData || []).filter(b => b.employee_id === emp.id),
      }));

      // Sort by name with French locale
      employeesWithBalances.sort((a, b) => 
        `${a.first_name} ${a.last_name}`.toLowerCase().localeCompare(`${b.first_name} ${b.last_name}`.toLowerCase(), 'fr')
      );

      setEmployees(employeesWithBalances);
    } catch (error) {
      console.error('Error fetching team data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Vue équipe
          </CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (employees.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Vue équipe
          </CardTitle>
          <CardDescription>
            {isAdmin ? 'Tous les employés' : 'Votre équipe'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            {isAdmin 
              ? "Aucun employé actif dans l'entreprise."
              : "Aucun employé n'est assigné à votre équipe."}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Vue équipe
          </CardTitle>
          <CardDescription>
            {isAdmin 
              ? `${employees.length} employé(s) - Tous les employés` 
              : `${employees.length} employé(s) dans votre équipe`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sortEmployees(employees, sortOrder).map((employee) => (
              <EmployeeCard 
                key={employee.id} 
                employee={employee}
                onViewHistory={setSelectedEmployee}
              />
            ))}
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!selectedEmployee} onOpenChange={(open) => !open && setSelectedEmployee(null)}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              {selectedEmployee && (
                <>
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="font-medium text-primary">
                      {selectedEmployee.first_name[0]}{selectedEmployee.last_name[0]}
                    </span>
                  </div>
                  <div>
                    <span>{selectedEmployee.first_name} {selectedEmployee.last_name}</span>
                    <p className="text-sm font-normal text-muted-foreground">
                      Historique des congés
                    </p>
                  </div>
                </>
              )}
            </DialogTitle>
          </DialogHeader>
          
          {selectedEmployee && (
            <EmployeeLeaveHistory employeeId={selectedEmployee.id} />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
