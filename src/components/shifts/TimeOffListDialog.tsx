import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CalendarDays } from 'lucide-react';

interface TimeOffRequest {
  id: string;
  employee_id: string;
  start_date: string;
  end_date: string;
  status: string;
  type: string;
}

interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  avatar_url: string | null;
}

interface TimeOffListDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  timeOffRequests: TimeOffRequest[];
  employees: Employee[];
  onTimeOffClick?: (request: TimeOffRequest) => void;
}

const getTypeLabel = (type: string) => {
  switch (type) {
    case 'paid_leave':
      return 'Congés payés';
    case 'rtt':
      return 'RTT';
    case 'sick_leave':
      return 'Maladie';
    case 'unpaid_leave':
      return 'Sans solde';
    case 'family_event':
      return 'Événement familial';
    default:
      return type;
  }
};

const getTypeBadgeVariant = (type: string) => {
  switch (type) {
    case 'paid_leave':
      return 'bg-blue-50 text-blue-700 border-blue-200';
    case 'rtt':
      return 'bg-purple-50 text-purple-700 border-purple-200';
    case 'sick_leave':
      return 'bg-red-50 text-red-700 border-red-200';
    case 'unpaid_leave':
      return 'bg-orange-50 text-orange-700 border-orange-200';
    case 'family_event':
      return 'bg-green-50 text-green-700 border-green-200';
    default:
      return 'bg-gray-50 text-gray-700 border-gray-200';
  }
};

export function TimeOffListDialog({
  open,
  onOpenChange,
  timeOffRequests,
  employees,
  onTimeOffClick,
}: TimeOffListDialogProps) {
  const getEmployee = (employeeId: string) => {
    return employees.find((e) => e.id === employeeId);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Congés en cours ({timeOffRequests.length})</DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[400px]">
          <div className="space-y-3">
            {timeOffRequests.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Aucun congé en cours
              </p>
            ) : (
              timeOffRequests.map((request) => {
                const employee = getEmployee(request.employee_id);
                return (
                  <div
                    key={request.id}
                    className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => onTimeOffClick?.(request)}
                  >
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={employee?.avatar_url || undefined} />
                      <AvatarFallback className="bg-destructive/10 text-destructive">
                        {employee?.first_name?.[0] || '?'}
                        {employee?.last_name?.[0] || ''}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">
                        {employee?.first_name} {employee?.last_name}
                      </p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <CalendarDays className="h-3 w-3" />
                        <span>
                          {format(new Date(request.start_date), 'd MMM', { locale: fr })} - {format(new Date(request.end_date), 'd MMM yyyy', { locale: fr })}
                        </span>
                      </div>
                    </div>
                    <Badge variant="outline" className={getTypeBadgeVariant(request.type)}>
                      {getTypeLabel(request.type)}
                    </Badge>
                  </div>
                );
              })
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
