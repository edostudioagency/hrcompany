import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Loader2, Calendar, Briefcase, HeartPulse, Clock } from 'lucide-react';
import { useLeaveBalances, LeaveBalance } from '@/hooks/useLeaveBalances';
import { LEAVE_TYPE_LABELS } from '@/lib/leave-calculator';
import { cn } from '@/lib/utils';

interface LeaveBalanceCardProps {
  employeeId?: string;
  className?: string;
}

const typeIcons: Record<string, React.ElementType> = {
  conge_paye: Calendar,
  vacation: Calendar,
  rtt: Briefcase,
  maladie: HeartPulse,
  sick: HeartPulse,
  sans_solde: Clock,
  autre: Clock,
  other: Clock,
};

const typeColors: Record<string, string> = {
  conge_paye: 'text-blue-600',
  vacation: 'text-blue-600',
  rtt: 'text-purple-600',
  maladie: 'text-red-600',
  sick: 'text-red-600',
  sans_solde: 'text-gray-600',
  autre: 'text-gray-600',
  other: 'text-gray-600',
};

const progressColors: Record<string, string> = {
  conge_paye: '[&>div]:bg-blue-500',
  vacation: '[&>div]:bg-blue-500',
  rtt: '[&>div]:bg-purple-500',
  maladie: '[&>div]:bg-red-500',
  sick: '[&>div]:bg-red-500',
  sans_solde: '[&>div]:bg-gray-500',
  autre: '[&>div]:bg-gray-500',
  other: '[&>div]:bg-gray-500',
};

function BalanceRow({ balance }: { balance: LeaveBalance }) {
  const Icon = typeIcons[balance.type] || Clock;
  const label = LEAVE_TYPE_LABELS[balance.type] || balance.type;
  const colorClass = typeColors[balance.type] || 'text-gray-600';
  const progressClass = progressColors[balance.type] || '[&>div]:bg-gray-500';
  
  const percentage = balance.annual_entitlement > 0 
    ? Math.round((balance.balance / balance.annual_entitlement) * 100)
    : 100;

  const isLowBalance = balance.annual_entitlement > 0 && percentage <= 20;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className={cn('h-4 w-4', colorClass)} />
          <span className="text-sm font-medium">{label}</span>
        </div>
        <span className={cn(
          'text-sm font-semibold',
          isLowBalance ? 'text-destructive' : 'text-foreground'
        )}>
          {balance.balance}/{balance.annual_entitlement} jours
        </span>
      </div>
      <Progress 
        value={percentage} 
        className={cn('h-2', progressClass)}
      />
    </div>
  );
}

export function LeaveBalanceCard({ employeeId, className }: LeaveBalanceCardProps) {
  const { balances, loading, error } = useLeaveBalances(employeeId);

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-lg">Mes soldes de congés</CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-lg">Mes soldes de congés</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-destructive">{error}</p>
        </CardContent>
      </Card>
    );
  }

  if (balances.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-lg">Mes soldes de congés</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Aucun solde de congé configuré pour cette année.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Mes soldes de congés
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {balances.map((balance) => (
          <BalanceRow key={balance.id} balance={balance} />
        ))}
      </CardContent>
    </Card>
  );
}
