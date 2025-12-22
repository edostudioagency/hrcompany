import { Clock, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/status-badge';
import { TIME_OFF_TYPE_LABELS, TimeOffRequest } from '@/types/hr';
import { mockEmployees } from '@/data/mockData';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface RecentRequestsProps {
  requests: TimeOffRequest[];
}

export function RecentRequests({ requests }: RecentRequestsProps) {
  const getEmployee = (employeeId: string) =>
    mockEmployees.find((e) => e.id === employeeId);

  return (
    <div className="bg-card rounded-xl border border-border/50 shadow-sm">
      <div className="flex items-center justify-between p-5 border-b border-border/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center">
            <Clock className="w-5 h-5 text-warning" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Demandes récentes</h3>
            <p className="text-sm text-muted-foreground">
              Congés et absences
            </p>
          </div>
        </div>
        <Button variant="ghost" size="sm" asChild>
          <Link to="/time-off" className="gap-1">
            Voir tout
            <ArrowRight className="w-4 h-4" />
          </Link>
        </Button>
      </div>

      <div className="divide-y divide-border/50">
        {requests.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            Aucune demande récente
          </div>
        ) : (
          requests.slice(0, 5).map((request) => {
            const employee = getEmployee(request.employeeId);
            return (
              <div
                key={request.id}
                className="p-4 flex items-center justify-between hover:bg-secondary/30 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-sm font-medium text-primary">
                      {employee?.firstName[0]}
                      {employee?.lastName[0]}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium text-foreground">
                      {employee?.firstName} {employee?.lastName}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {TIME_OFF_TYPE_LABELS[request.type]} •{' '}
                      {format(new Date(request.startDate), 'd MMM', {
                        locale: fr,
                      })}{' '}
                      -{' '}
                      {format(new Date(request.endDate), 'd MMM yyyy', {
                        locale: fr,
                      })}
                    </p>
                  </div>
                </div>
                <StatusBadge status={request.status} />
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
