import { Check, X, Clock, MoreHorizontal } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { StatusBadge } from '@/components/ui/status-badge';
import {
  TimeOffRequest,
  TIME_OFF_TYPE_LABELS,
  PART_OF_DAY_LABELS,
} from '@/types/hr';
import { mockEmployees } from '@/data/mockData';
import { cn } from '@/lib/utils';

interface TimeOffRequestTableProps {
  requests: TimeOffRequest[];
  showActions?: boolean;
  onApprove?: (request: TimeOffRequest) => void;
  onReject?: (request: TimeOffRequest) => void;
}

export function TimeOffRequestTable({
  requests,
  showActions = true,
  onApprove,
  onReject,
}: TimeOffRequestTableProps) {
  const getEmployee = (employeeId: string) =>
    mockEmployees.find((e) => e.id === employeeId);

  return (
    <div className="table-container">
      <Table>
        <TableHeader>
          <TableRow className="bg-secondary/30 hover:bg-secondary/30">
            <TableHead className="font-semibold">Employé</TableHead>
            <TableHead className="font-semibold">Type</TableHead>
            <TableHead className="font-semibold">Période</TableHead>
            <TableHead className="font-semibold">Durée</TableHead>
            <TableHead className="font-semibold">Raison</TableHead>
            <TableHead className="font-semibold">Statut</TableHead>
            {showActions && <TableHead className="w-[100px]"></TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {requests.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={showActions ? 7 : 6}
                className="h-32 text-center text-muted-foreground"
              >
                Aucune demande trouvée
              </TableCell>
            </TableRow>
          ) : (
            requests.map((request) => {
              const employee = getEmployee(request.employeeId);
              const startDate = new Date(request.startDate);
              const endDate = new Date(request.endDate);
              const diffDays =
                Math.ceil(
                  (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
                ) + 1;

              return (
                <TableRow
                  key={request.id}
                  className="group hover:bg-secondary/20"
                >
                  <TableCell>
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
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span
                      className={cn(
                        'inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium',
                        request.type === 'conge_paye' &&
                          'bg-success/10 text-success',
                        request.type === 'rtt' && 'bg-info/10 text-info',
                        request.type === 'maladie' &&
                          'bg-warning/10 text-warning',
                        request.type === 'sans_solde' &&
                          'bg-muted text-muted-foreground',
                        request.type === 'autre' &&
                          'bg-secondary text-secondary-foreground'
                      )}
                    >
                      {TIME_OFF_TYPE_LABELS[request.type]}
                    </span>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    <div>
                      <p>
                        {format(startDate, 'd MMM yyyy', { locale: fr })}
                        {request.startDate !== request.endDate && (
                          <> - {format(endDate, 'd MMM yyyy', { locale: fr })}</>
                        )}
                      </p>
                      <p className="text-xs">
                        {PART_OF_DAY_LABELS[request.partOfDay]}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {diffDays} jour{diffDays > 1 ? 's' : ''}
                  </TableCell>
                  <TableCell className="text-muted-foreground max-w-[200px] truncate">
                    {request.reason || '-'}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={request.status} />
                  </TableCell>
                  {showActions && (
                    <TableCell>
                      {request.status === 'pending' ? (
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-success hover:text-success hover:bg-success/10"
                            onClick={() => onApprove?.(request)}
                          >
                            <Check className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => onReject?.(request)}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ) : (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 opacity-0 group-hover:opacity-100"
                            >
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>Voir détails</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}
