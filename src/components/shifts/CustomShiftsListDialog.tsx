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
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Pencil, Trash2, Clock, MapPin } from 'lucide-react';
import { formatEmployeeName, getEmployeeInitials, type EmployeeSortOrder } from '@/lib/utils';

interface Shift {
  id: string;
  employee_id: string;
  date: string;
  start_time: string;
  end_time: string;
  location: string | null;
  status: string;
  notes: string | null;
  employee?: {
    id: string;
    first_name: string;
    last_name: string;
    avatar_url: string | null;
    position?: string | null;
  };
}

interface Location {
  id: string;
  name: string;
}

interface CustomShiftsListDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shifts: Shift[];
  locations: Location[];
  sortOrder?: EmployeeSortOrder;
  onEditShift?: (shift: Shift) => void;
  onDeleteShift?: (shiftId: string) => void;
}

export function CustomShiftsListDialog({
  open,
  onOpenChange,
  shifts,
  locations,
  sortOrder = 'first_name',
  onEditShift,
  onDeleteShift,
}: CustomShiftsListDialogProps) {
  const plannedShifts = shifts.filter((s) => s.status === 'planned');

  const getLocationName = (locationId: string | null) => {
    if (!locationId) return null;
    const location = locations.find((l) => l.id === locationId);
    return location?.name;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Shifts personnalisés ({plannedShifts.length})</DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[400px]">
          <div className="space-y-3">
            {plannedShifts.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Aucun shift personnalisé
              </p>
            ) : (
              plannedShifts.map((shift) => (
                <div
                  key={shift.id}
                  className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                >
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={shift.employee?.avatar_url || undefined} />
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {getEmployeeInitials(shift.employee?.first_name || '?', shift.employee?.last_name || '', sortOrder)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">
                      {shift.employee ? formatEmployeeName(shift.employee.first_name, shift.employee.last_name, sortOrder) : '?'}
                    </p>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {format(new Date(shift.date), 'd MMM', { locale: fr })} • {shift.start_time.slice(0, 5)} - {shift.end_time.slice(0, 5)}
                      </span>
                      {getLocationName(shift.location) && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {getLocationName(shift.location)}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => onEditShift?.(shift)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => onDeleteShift?.(shift.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
