import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  avatar_url: string | null;
}

interface Shift {
  id: string;
  employee_id: string;
  start_time: string;
  end_time: string;
  employee?: Employee;
}

interface TimeOff {
  id: string;
  employee_id: string;
  type: string;
}

interface DayAvatarsProps {
  shifts: Shift[];
  timeOffs: TimeOff[];
  employees: Employee[];
  maxVisible?: number;
  onShiftClick?: (shift: Shift) => void;
  getTimeOffLabel?: (type: string) => string;
}

export function DayAvatars({
  shifts,
  timeOffs,
  employees,
  maxVisible = 4,
  onShiftClick,
  getTimeOffLabel,
}: DayAvatarsProps) {
  const getEmployee = (id: string) => employees.find((e) => e.id === id);

  // Get unique employees with shifts (present)
  const presentEmployees = shifts.map((s) => ({
    shift: s,
    employee: s.employee || getEmployee(s.employee_id),
  })).filter((item) => item.employee);

  // Get unique employees with time off (absent)
  const absentEmployees = timeOffs.map((t) => ({
    timeOff: t,
    employee: getEmployee(t.employee_id),
  })).filter((item) => item.employee);

  const totalItems = presentEmployees.length + absentEmployees.length;
  const visiblePresent = presentEmployees.slice(0, maxVisible);
  const remainingSlots = Math.max(0, maxVisible - visiblePresent.length);
  const visibleAbsent = absentEmployees.slice(0, remainingSlots);
  const overflowCount = totalItems - visiblePresent.length - visibleAbsent.length;

  if (totalItems === 0) {
    return null;
  }

  return (
    <TooltipProvider>
      <div className="flex flex-wrap gap-1 items-center">
        {/* Present employees - blue ring */}
        {visiblePresent.map(({ shift, employee }) => (
          <Tooltip key={shift.id}>
            <TooltipTrigger asChild>
              <Avatar
                className={cn(
                  'w-7 h-7 ring-2 ring-blue-500 cursor-pointer hover:ring-blue-600 transition-all',
                  onShiftClick && 'hover:scale-110'
                )}
                onClick={() => onShiftClick?.(shift)}
              >
                <AvatarImage src={employee?.avatar_url || undefined} alt={employee?.first_name} />
                <AvatarFallback className="text-[10px] bg-blue-100 text-blue-700 font-medium">
                  {employee?.first_name?.[0]}{employee?.last_name?.[0]}
                </AvatarFallback>
              </Avatar>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">
              <p className="font-medium">{employee?.first_name} {employee?.last_name}</p>
              <p className="text-muted-foreground">{shift.start_time.slice(0, 5)} - {shift.end_time.slice(0, 5)}</p>
            </TooltipContent>
          </Tooltip>
        ))}

        {/* Absent employees - red ring */}
        {visibleAbsent.map(({ timeOff, employee }) => (
          <Tooltip key={timeOff.id}>
            <TooltipTrigger asChild>
              <Avatar className="w-7 h-7 ring-2 ring-red-500">
                <AvatarImage src={employee?.avatar_url || undefined} alt={employee?.first_name} />
                <AvatarFallback className="text-[10px] bg-red-100 text-red-700 font-medium">
                  {employee?.first_name?.[0]}{employee?.last_name?.[0]}
                </AvatarFallback>
              </Avatar>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">
              <p className="font-medium">{employee?.first_name} {employee?.last_name}</p>
              <p className="text-red-600">{getTimeOffLabel?.(timeOff.type) || 'Absent'}</p>
            </TooltipContent>
          </Tooltip>
        ))}

        {/* Overflow button */}
        {overflowCount > 0 && (
          <Popover>
            <PopoverTrigger asChild>
              <button className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-xs font-medium text-muted-foreground hover:bg-muted/80 transition-colors">
                <Plus className="w-3 h-3 mr-0.5" />
                {overflowCount}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-3" side="right" align="start">
              <div className="space-y-3">
                {/* Present section */}
                {presentEmployees.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-blue-500" />
                      Présents ({presentEmployees.length})
                    </p>
                    <div className="space-y-2">
                      {presentEmployees.map(({ shift, employee }) => (
                        <div
                          key={shift.id}
                          className="flex items-center gap-2 p-1.5 rounded hover:bg-muted/50 cursor-pointer transition-colors"
                          onClick={() => onShiftClick?.(shift)}
                        >
                          <Avatar className="w-6 h-6 ring-1 ring-blue-500">
                            <AvatarImage src={employee?.avatar_url || undefined} />
                            <AvatarFallback className="text-[9px] bg-blue-100 text-blue-700">
                              {employee?.first_name?.[0]}{employee?.last_name?.[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium truncate">
                              {employee?.first_name} {employee?.last_name}
                            </p>
                            <p className="text-[10px] text-muted-foreground">
                              {shift.start_time.slice(0, 5)} - {shift.end_time.slice(0, 5)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Absent section */}
                {absentEmployees.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-red-500" />
                      Absents ({absentEmployees.length})
                    </p>
                    <div className="space-y-2">
                      {absentEmployees.map(({ timeOff, employee }) => (
                        <div
                          key={timeOff.id}
                          className="flex items-center gap-2 p-1.5 rounded"
                        >
                          <Avatar className="w-6 h-6 ring-1 ring-red-500">
                            <AvatarImage src={employee?.avatar_url || undefined} />
                            <AvatarFallback className="text-[9px] bg-red-100 text-red-700">
                              {employee?.first_name?.[0]}{employee?.last_name?.[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium truncate">
                              {employee?.first_name} {employee?.last_name}
                            </p>
                            <p className="text-[10px] text-red-600">
                              {getTimeOffLabel?.(timeOff.type) || 'Absent'}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </PopoverContent>
          </Popover>
        )}
      </div>
    </TooltipProvider>
  );
}
