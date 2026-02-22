import React from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Clock, MapPin, Calendar } from "lucide-react";
import { formatEmployeeName, getEmployeeInitials, type EmployeeSortOrder } from "@/lib/utils";

interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  avatar_url: string | null;
  position?: string | null;
}

interface Shift {
  id: string;
  employee_id: string;
  start_time: string;
  end_time: string;
  location?: string | null;
  isFromSchedule?: boolean;
  employee?: Employee;
}

interface TimeOff {
  id: string;
  employee_id: string;
  type: string;
}

interface DayDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  date: Date | null;
  shifts: Shift[];
  timeOffs: TimeOff[];
  employees: Employee[];
  sortOrder?: EmployeeSortOrder;
  getTimeOffLabel: (type: string) => string;
  onShiftClick?: (shift: Shift, employee: Employee) => void;
  onTimeOffClick?: (timeOff: TimeOff, employee: Employee) => void;
}

export function DayDetailDialog({
  open,
  onOpenChange,
  date,
  shifts,
  timeOffs,
  employees,
  sortOrder = 'first_name',
  getTimeOffLabel,
  onShiftClick,
  onTimeOffClick,
}: DayDetailDialogProps) {
  const getEmployee = (id: string) => employees.find((e) => e.id === id);

  const presentEmployees = shifts
    .map((s) => ({
      shift: s,
      employee: s.employee || getEmployee(s.employee_id),
    }))
    .filter((item) => item.employee) as { shift: Shift; employee: Employee }[];

  const absentEmployees = timeOffs
    .map((t) => ({
      timeOff: t,
      employee: getEmployee(t.employee_id),
    }))
    .filter((item) => item.employee) as { timeOff: TimeOff; employee: Employee }[];

  if (!date) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            {format(date, "EEEE d MMMM yyyy", { locale: fr })}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-6">
            {/* Present employees */}
            {presentEmployees.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-3 h-3 rounded-full bg-blue-500" />
                  <h3 className="font-medium text-sm">
                    Présents ({presentEmployees.length})
                  </h3>
                </div>
                <div className="space-y-2">
                  {presentEmployees.map(({ shift, employee }) => (
                    <div
                      key={shift.id}
                      className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted cursor-pointer transition-colors"
                      onClick={() => onShiftClick?.(shift, employee)}
                    >
                      <Avatar className="w-10 h-10 ring-2 ring-blue-500">
                        <AvatarImage src={employee.avatar_url || undefined} />
                        <AvatarFallback className="bg-blue-100 text-blue-700 font-medium">
                          {getEmployeeInitials(employee.first_name, employee.last_name, sortOrder)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">
                          {formatEmployeeName(employee.first_name, employee.last_name, sortOrder)}
                        </p>
                        {employee.position && (
                          <p className="text-xs text-muted-foreground truncate">
                            {employee.position}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Clock className="w-3.5 h-3.5" />
                          {shift.start_time?.slice(0, 5)} - {shift.end_time?.slice(0, 5)}
                        </div>
                        {shift.location && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <MapPin className="w-3 h-3" />
                            {shift.location}
                          </div>
                        )}
                        {shift.isFromSchedule ? (
                          <Badge variant="secondary" className="text-[10px]">
                            Planning
                          </Badge>
                        ) : (
                          <Badge variant="default" className="text-[10px]">
                            Personnalisé
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Absent employees */}
            {absentEmployees.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <h3 className="font-medium text-sm">
                    Absents ({absentEmployees.length})
                  </h3>
                </div>
                <div className="space-y-2">
                  {absentEmployees.map(({ timeOff, employee }) => (
                    <div
                      key={timeOff.id}
                      className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted cursor-pointer transition-colors"
                      onClick={() => onTimeOffClick?.(timeOff, employee)}
                    >
                      <Avatar className="w-10 h-10 ring-2 ring-red-500">
                        <AvatarImage src={employee.avatar_url || undefined} />
                        <AvatarFallback className="bg-red-100 text-red-700 font-medium">
                          {getEmployeeInitials(employee.first_name, employee.last_name, sortOrder)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">
                          {formatEmployeeName(employee.first_name, employee.last_name, sortOrder)}
                        </p>
                        {employee.position && (
                          <p className="text-xs text-muted-foreground truncate">
                            {employee.position}
                          </p>
                        )}
                      </div>
                      <Badge variant="destructive" className="text-xs">
                        {getTimeOffLabel(timeOff.type)}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {presentEmployees.length === 0 && absentEmployees.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                Aucun employé planifié ce jour
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
