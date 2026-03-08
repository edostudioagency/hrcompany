import { Card, CardContent } from '@/components/ui/card';
import { Users, Calendar, Clock } from 'lucide-react';

interface ShiftStatsCardsProps {
  employeeCount: number;
  customShiftCount: number;
  timeOffCount: number;
  onEmployeesClick: () => void;
  onCustomShiftsClick: () => void;
  onTimeOffClick: () => void;
}

export function ShiftStatsCards({
  employeeCount,
  customShiftCount,
  timeOffCount,
  onEmployeesClick,
  onCustomShiftsClick,
  onTimeOffClick,
}: ShiftStatsCardsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Card
        className="cursor-pointer hover:shadow-md transition-shadow"
        onClick={onEmployeesClick}
      >
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-lg bg-primary/10">
              <Users className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{employeeCount}</p>
              <p className="text-sm text-muted-foreground">Employés actifs</p>
            </div>
          </div>
        </CardContent>
      </Card>
      <Card
        className="cursor-pointer hover:shadow-md transition-shadow"
        onClick={onCustomShiftsClick}
      >
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-lg bg-accent/10">
              <Calendar className="h-6 w-6 text-accent" />
            </div>
            <div>
              <p className="text-2xl font-bold">{customShiftCount}</p>
              <p className="text-sm text-muted-foreground">Shifts personnalisés</p>
            </div>
          </div>
        </CardContent>
      </Card>
      <Card
        className="cursor-pointer hover:shadow-md transition-shadow"
        onClick={onTimeOffClick}
      >
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-lg bg-destructive/10">
              <Clock className="h-6 w-6 text-destructive" />
            </div>
            <div>
              <p className="text-2xl font-bold">{timeOffCount}</p>
              <p className="text-sm text-muted-foreground">Congés en cours</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
