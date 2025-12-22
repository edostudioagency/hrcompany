import { useState, useMemo } from 'react';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday,
  addMonths,
  subMonths,
} from 'date-fns';
import { fr } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Shift, TimeOffRequest, Employee } from '@/types/hr';
import { cn } from '@/lib/utils';

interface ShiftCalendarProps {
  shifts: Shift[];
  timeOffRequests: TimeOffRequest[];
  employees: Employee[];
  onAddShift?: (date: Date) => void;
  onShiftClick?: (shift: Shift) => void;
}

const WEEKDAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

export function ShiftCalendar({
  shifts,
  timeOffRequests,
  employees,
  onAddShift,
  onShiftClick,
}: ShiftCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const getEmployee = (employeeId: string) =>
    employees.find((e) => e.id === employeeId);

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentDate), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(currentDate), { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [currentDate]);

  const getShiftsForDay = (day: Date) =>
    shifts.filter((s) => isSameDay(new Date(s.date), day));

  const getTimeOffForDay = (day: Date) =>
    timeOffRequests.filter(
      (t) =>
        t.status === 'approved' &&
        new Date(t.startDate) <= day &&
        new Date(t.endDate) >= day
    );

  const goToPreviousMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const goToNextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const goToToday = () => setCurrentDate(new Date());

  return (
    <div className="bg-card rounded-xl border border-border/50 shadow-sm overflow-hidden">
      {/* Calendar Header */}
      <div className="flex items-center justify-between p-4 border-b border-border/50">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={goToPreviousMonth}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={goToNextMonth}>
            <ChevronRight className="w-4 h-4" />
          </Button>
          <h2 className="text-lg font-semibold text-foreground capitalize ml-2">
            {format(currentDate, 'MMMM yyyy', { locale: fr })}
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={goToToday}>
            Aujourd'hui
          </Button>
        </div>
      </div>

      {/* Weekday Headers */}
      <div className="grid grid-cols-7 border-b border-border/50">
        {WEEKDAYS.map((day) => (
          <div key={day} className="calendar-day-header py-3">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7">
        {days.map((day, idx) => {
          const dayShifts = getShiftsForDay(day);
          const dayTimeOff = getTimeOffForDay(day);
          const isCurrentMonth = isSameMonth(day, currentDate);
          const isCurrentDay = isToday(day);

          return (
            <div
              key={idx}
              className={cn(
                'min-h-[120px] p-2 border-b border-r border-border/30 transition-colors',
                !isCurrentMonth && 'bg-muted/30',
                isCurrentDay && 'bg-primary/5'
              )}
            >
              <div className="flex items-center justify-between mb-1">
                <span
                  className={cn(
                    'calendar-day-number w-7 h-7 flex items-center justify-center rounded-full',
                    isCurrentDay && 'bg-primary text-primary-foreground',
                    !isCurrentMonth && 'text-muted-foreground'
                  )}
                >
                  {format(day, 'd')}
                </span>
                {onAddShift && isCurrentMonth && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="w-6 h-6 opacity-0 hover:opacity-100 transition-opacity"
                    onClick={() => onAddShift(day)}
                  >
                    <Plus className="w-3 h-3" />
                  </Button>
                )}
              </div>

              <div className="space-y-1">
                {/* Time off indicators */}
                {dayTimeOff.slice(0, 2).map((timeOff) => {
                  const employee = getEmployee(timeOff.employeeId);
                  return (
                    <div
                      key={timeOff.id}
                      className="calendar-event bg-destructive/20 text-destructive"
                    >
                      {employee?.firstName[0]}. {employee?.lastName} - Absent
                    </div>
                  );
                })}

                {/* Shifts */}
                {dayShifts.slice(0, 3 - dayTimeOff.length).map((shift) => {
                  const employee = getEmployee(shift.employeeId);
                  return (
                    <div
                      key={shift.id}
                      onClick={() => onShiftClick?.(shift)}
                      className="calendar-event bg-primary/20 text-primary cursor-pointer hover:bg-primary/30"
                    >
                      {shift.startTime} - {employee?.firstName}
                    </div>
                  );
                })}

                {/* Overflow indicator */}
                {dayShifts.length + dayTimeOff.length > 3 && (
                  <div className="text-xs text-muted-foreground pl-1">
                    +{dayShifts.length + dayTimeOff.length - 3} autres
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-6 p-4 border-t border-border/50 bg-secondary/20">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-primary/40" />
          <span className="text-sm text-muted-foreground">Shift planifié</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-destructive/40" />
          <span className="text-sm text-muted-foreground">Congé/Absence</span>
        </div>
      </div>
    </div>
  );
}
