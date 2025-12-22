import { Calendar, ArrowRight, MapPin } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Shift } from '@/types/hr';
import { mockEmployees } from '@/data/mockData';
import { format, isToday, isTomorrow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface UpcomingShiftsProps {
  shifts: Shift[];
}

export function UpcomingShifts({ shifts }: UpcomingShiftsProps) {
  const getEmployee = (employeeId: string) =>
    mockEmployees.find((e) => e.id === employeeId);

  const getDateLabel = (dateStr: string) => {
    const date = new Date(dateStr);
    if (isToday(date)) return "Aujourd'hui";
    if (isTomorrow(date)) return 'Demain';
    return format(date, 'EEEE d MMM', { locale: fr });
  };

  // Group shifts by date
  const groupedShifts = shifts.reduce((acc, shift) => {
    const date = shift.date;
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(shift);
    return acc;
  }, {} as Record<string, Shift[]>);

  const sortedDates = Object.keys(groupedShifts).sort();

  return (
    <div className="bg-card rounded-xl border border-border/50 shadow-sm">
      <div className="flex items-center justify-between p-5 border-b border-border/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
            <Calendar className="w-5 h-5 text-accent" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Prochains shifts</h3>
            <p className="text-sm text-muted-foreground">Planning à venir</p>
          </div>
        </div>
        <Button variant="ghost" size="sm" asChild>
          <Link to="/shifts" className="gap-1">
            Voir planning
            <ArrowRight className="w-4 h-4" />
          </Link>
        </Button>
      </div>

      <div className="divide-y divide-border/50">
        {sortedDates.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            Aucun shift planifié
          </div>
        ) : (
          sortedDates.slice(0, 3).map((date) => (
            <div key={date} className="p-4">
              <p className="text-sm font-medium text-foreground mb-3 capitalize">
                {getDateLabel(date)}
              </p>
              <div className="space-y-2">
                {groupedShifts[date].map((shift) => {
                  const employee = getEmployee(shift.employeeId);
                  return (
                    <div
                      key={shift.id}
                      className="flex items-center gap-3 p-2 rounded-lg bg-secondary/30"
                    >
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-xs font-medium text-primary">
                          {employee?.firstName[0]}
                          {employee?.lastName[0]}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {employee?.firstName} {employee?.lastName}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>
                            {shift.startTime} - {shift.endTime}
                          </span>
                          {shift.location && (
                            <>
                              <span>•</span>
                              <span className="flex items-center gap-1">
                                <MapPin className="w-3 h-3" />
                                {shift.location}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
