import { Check, X, ArrowRight, MoreHorizontal } from 'lucide-react';
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
import { ShiftSwapRequest } from '@/types/hr';
import { mockEmployees, mockShifts } from '@/data/mockData';

interface ShiftSwapTableProps {
  requests: ShiftSwapRequest[];
  showActions?: boolean;
  onAccept?: (request: ShiftSwapRequest) => void;
  onReject?: (request: ShiftSwapRequest) => void;
}

export function ShiftSwapTable({
  requests,
  showActions = true,
  onAccept,
  onReject,
}: ShiftSwapTableProps) {
  const getEmployee = (employeeId: string) =>
    mockEmployees.find((e) => e.id === employeeId);

  const getShift = (shiftId: string) =>
    mockShifts.find((s) => s.id === shiftId);

  return (
    <div className="table-container">
      <Table>
        <TableHeader>
          <TableRow className="bg-secondary/30 hover:bg-secondary/30">
            <TableHead className="font-semibold">Demandeur</TableHead>
            <TableHead className="font-semibold">Shift original</TableHead>
            <TableHead className="w-[50px]"></TableHead>
            <TableHead className="font-semibold">Cible</TableHead>
            <TableHead className="font-semibold">Shift proposé</TableHead>
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
                Aucune demande d'échange trouvée
              </TableCell>
            </TableRow>
          ) : (
            requests.map((request) => {
              const requester = getEmployee(request.requesterId);
              const target = getEmployee(request.targetEmployeeId);
              const fromShift = getShift(request.fromShiftId);
              const toShift = request.toShiftId
                ? getShift(request.toShiftId)
                : null;

              return (
                <TableRow
                  key={request.id}
                  className="group hover:bg-secondary/20"
                >
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-sm font-medium text-primary">
                          {requester?.firstName[0]}
                          {requester?.lastName[0]}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-foreground">
                          {requester?.firstName} {requester?.lastName}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {fromShift && (
                      <div className="text-sm">
                        <p className="font-medium text-foreground">
                          {format(new Date(fromShift.date), 'EEEE d MMM', {
                            locale: fr,
                          })}
                        </p>
                        <p className="text-muted-foreground">
                          {fromShift.startTime} - {fromShift.endTime}
                        </p>
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <ArrowRight className="w-4 h-4 text-muted-foreground" />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-accent/10 flex items-center justify-center">
                        <span className="text-sm font-medium text-accent">
                          {target?.firstName[0]}
                          {target?.lastName[0]}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-foreground">
                          {target?.firstName} {target?.lastName}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {toShift ? (
                      <div className="text-sm">
                        <p className="font-medium text-foreground">
                          {format(new Date(toShift.date), 'EEEE d MMM', {
                            locale: fr,
                          })}
                        </p>
                        <p className="text-muted-foreground">
                          {toShift.startTime} - {toShift.endTime}
                        </p>
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-sm">
                        Remplacement simple
                      </span>
                    )}
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
                            onClick={() => onAccept?.(request)}
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
