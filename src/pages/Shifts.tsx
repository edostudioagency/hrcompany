import { useState, useEffect, useMemo } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useCompany } from '@/contexts/CompanyContext';
import { DayAvatars } from '@/components/calendar/DayAvatars';
import { DayDetailDialog } from '@/components/calendar/DayDetailDialog';
import { EmployeeDayDetailDialog } from '@/components/calendar/EmployeeDayDetailDialog';
import { EmployeesListDialog } from '@/components/shifts/EmployeesListDialog';
import { CustomShiftsListDialog } from '@/components/shifts/CustomShiftsListDialog';
import { TimeOffListDialog } from '@/components/shifts/TimeOffListDialog';
import { TimeOffEditDialog } from '@/components/time-off/TimeOffEditDialog';
import { ShiftStatsCards } from '@/components/shifts/ShiftStatsCards';
import { ShiftCalendarHeader } from '@/components/shifts/ShiftCalendarHeader';
import { ShiftFormDialog } from '@/components/shifts/ShiftFormDialog';
import { logger } from '@/lib/logger';
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
  addWeeks,
  subWeeks,
} from 'date-fns';
import { fr } from 'date-fns/locale';
import { Loader2, Plus, Maximize2 } from 'lucide-react';

interface Shift {
  id: string;
  employee_id: string;
  date: string;
  start_time: string;
  end_time: string;
  location: string | null;
  status: string;
  notes: string | null;
  isFromSchedule?: boolean;
  employee?: {
    id: string;
    first_name: string;
    last_name: string;
    avatar_url: string | null;
    position?: string | null;
  };
}

interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  status: string;
  avatar_url: string | null;
  position?: string | null;
}

interface EmployeeSchedule {
  id: string;
  employee_id: string;
  day_of_week: number;
  is_working_day: boolean;
  start_time: string | null;
  end_time: string | null;
}

interface TimeOffRequest {
  id: string;
  employee_id: string;
  start_date: string;
  end_date: string;
  status: string;
  type: string;
  reason?: string | null;
  employee?: {
    first_name: string;
    last_name: string;
  };
}

interface Location {
  id: string;
  name: string;
}

interface DragData {
  employee: Employee;
  shift: Shift;
  sourceDate: Date;
}

const WEEKDAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

const TIME_OFF_LABELS: Record<string, string> = {
  conge_paye: 'Congé',
  vacation: 'Congé',
  rtt: 'RTT',
  maladie: 'Maladie',
  sick: 'Maladie',
  sans_solde: 'Sans solde',
  personal: 'Personnel',
  autre: 'Autre',
  other: 'Autre',
};

const getTimeOffLabel = (type: string) => TIME_OFF_LABELS[type] || type;

export default function ShiftsPage() {
  const { currentCompany, companySettings } = useCompany();
  const sortOrder = companySettings?.employee_sort_order || 'first_name';

  // Core data state
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [employeeSchedules, setEmployeeSchedules] = useState<EmployeeSchedule[]>([]);
  const [timeOffRequests, setTimeOffRequests] = useState<TimeOffRequest[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);

  // Calendar state
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'month' | 'week'>('month');
  const [showOnlyCustomShifts, setShowOnlyCustomShifts] = useState(false);

  // Shift form dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [editingShift, setEditingShift] = useState<Shift | null>(null);
  const [formData, setFormData] = useState({
    employee_id: '',
    start_time: '09:00',
    end_time: '17:00',
    location: '',
    notes: '',
  });

  // Employee detail dialog state
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [selectedDayDate, setSelectedDayDate] = useState<Date | null>(null);
  const [selectedShiftData, setSelectedShiftData] = useState<{
    startTime: string;
    endTime: string;
    location: string;
    shiftId?: string;
    isFromSchedule: boolean;
    cancelledShiftId?: string;
  } | null>(null);

  // Drag and drop state
  const [dragData, setDragData] = useState<DragData | null>(null);
  const [dragOverDate, setDragOverDate] = useState<Date | null>(null);

  // Day detail dialog state
  const [dayDetailDialogOpen, setDayDetailDialogOpen] = useState(false);
  const [dayDetailDate, setDayDetailDate] = useState<Date | null>(null);

  // Stat cards dialogs state
  const [employeesListOpen, setEmployeesListOpen] = useState(false);
  const [customShiftsListOpen, setCustomShiftsListOpen] = useState(false);
  const [timeOffListOpen, setTimeOffListOpen] = useState(false);

  // Time off edit dialog state
  const [timeOffEditOpen, setTimeOffEditOpen] = useState(false);
  const [editingTimeOff, setEditingTimeOff] = useState<TimeOffRequest | null>(null);

  // --- Data fetching ---

  const fetchData = async () => {
    if (!currentCompany?.id) {
      setShifts([]);
      setEmployees([]);
      setEmployeeSchedules([]);
      setTimeOffRequests([]);
      setLocations([]);
      setLoading(false);
      return;
    }

    try {
      const { data: employeesData, error: employeesError } = await supabase
        .from('employees')
        .select('id, first_name, last_name, status, avatar_url, position')
        .eq('company_id', currentCompany.id);

      if (employeesError) throw employeesError;
      setEmployees(employeesData || []);

      const employeeIds = employeesData?.map(e => e.id) || [];

      if (employeeIds.length === 0) {
        setShifts([]);
        setEmployeeSchedules([]);
        setTimeOffRequests([]);
        setLoading(false);
        return;
      }

      const [shiftsRes, schedulesRes, timeOffRes, locationsRes] = await Promise.all([
        supabase
          .from('shifts')
          .select('*, employee:employees(id, first_name, last_name, avatar_url, position)')
          .in('employee_id', employeeIds)
          .order('date'),
        supabase
          .from('employee_schedules')
          .select('*')
          .in('employee_id', employeeIds),
        supabase
          .from('time_off_requests')
          .select('*')
          .eq('status', 'approved')
          .in('employee_id', employeeIds),
        supabase
          .from('company_locations')
          .select('id, name')
          .eq('company_id', currentCompany.id)
          .eq('is_active', true),
      ]);

      if (shiftsRes.error) throw shiftsRes.error;
      if (schedulesRes.error) throw schedulesRes.error;
      if (timeOffRes.error) throw timeOffRes.error;

      setShifts(shiftsRes.data || []);
      setEmployeeSchedules(schedulesRes.data || []);
      setTimeOffRequests(timeOffRes.data || []);
      setLocations(locationsRes.data || []);
    } catch (error) {
      logger.error('Error fetching shifts data', { error: String(error) });
      toast.error('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchData();
  }, [currentCompany?.id]);

  // --- Computed values ---

  const days = useMemo(() => {
    if (viewMode === 'month') {
      const start = startOfWeek(startOfMonth(currentDate), { weekStartsOn: 1 });
      const end = endOfWeek(endOfMonth(currentDate), { weekStartsOn: 1 });
      return eachDayOfInterval({ start, end });
    } else {
      const start = startOfWeek(currentDate, { weekStartsOn: 1 });
      const end = endOfWeek(currentDate, { weekStartsOn: 1 });
      return eachDayOfInterval({ start, end });
    }
  }, [currentDate, viewMode]);

  const getShiftsForDay = (day: Date) =>
    shifts.filter((s) => isSameDay(new Date(s.date), day));

  const getTimeOffForDay = (day: Date) =>
    timeOffRequests.filter(
      (t) => new Date(t.start_date + 'T00:00:00') <= day && new Date(t.end_date + 'T00:00:00') >= day
    );

  const getScheduledEmployeesForDay = (day: Date) => {
    const dayOfWeek = day.getDay();
    const dateStr = format(day, 'yyyy-MM-dd');
    const absentEmployeeIds = new Set(getTimeOffForDay(day).map(t => t.employee_id));
    const customShifts = getShiftsForDay(day);
    const customShiftEmployeeIds = new Set(customShifts.map(s => s.employee_id));

    const workingSchedules = employeeSchedules.filter(
      schedule =>
        schedule.day_of_week === dayOfWeek &&
        schedule.is_working_day &&
        !absentEmployeeIds.has(schedule.employee_id) &&
        !customShiftEmployeeIds.has(schedule.employee_id)
    );

    const scheduleShifts = workingSchedules.map(schedule => {
      const employee = employees.find(e => e.id === schedule.employee_id);
      return {
        id: `schedule-${schedule.employee_id}-${dateStr}`,
        employee_id: schedule.employee_id,
        date: dateStr,
        start_time: schedule.start_time || '09:00',
        end_time: schedule.end_time || '17:00',
        location: null,
        status: 'planned',
        notes: null,
        isFromSchedule: true,
        employee: employee ? {
          id: employee.id,
          first_name: employee.first_name,
          last_name: employee.last_name,
          avatar_url: employee.avatar_url,
          position: employee.position,
        } : undefined,
      };
    });

    const validCustomShifts = customShifts
      .filter(s => !absentEmployeeIds.has(s.employee_id) && s.status !== 'cancelled')
      .map(s => ({ ...s, isFromSchedule: false }));

    if (showOnlyCustomShifts) {
      return validCustomShifts;
    }

    return [...validCustomShifts, ...scheduleShifts];
  };

  // --- Navigation ---

  const navigatePrevious = () => {
    setCurrentDate(viewMode === 'month' ? subMonths(currentDate, 1) : subWeeks(currentDate, 1));
  };

  const navigateNext = () => {
    setCurrentDate(viewMode === 'month' ? addMonths(currentDate, 1) : addWeeks(currentDate, 1));
  };

  const goToToday = () => setCurrentDate(new Date());

  // --- Dialog handlers ---

  const openAddShiftDialog = (date: Date) => {
    setSelectedDate(date);
    setEditingShift(null);
    setFormData({ employee_id: '', start_time: '09:00', end_time: '17:00', location: '', notes: '' });
    setDialogOpen(true);
  };

  const handleShiftClick = (shift: Shift, employee: Employee, date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const cancelledShift = shifts.find(
      s => s.employee_id === employee.id && s.date === dateStr && s.status === 'cancelled'
    );

    setSelectedEmployee(employee);
    setSelectedDayDate(date);
    setSelectedShiftData({
      startTime: shift.start_time?.slice(0, 5) || '09:00',
      endTime: shift.end_time?.slice(0, 5) || '17:00',
      location: shift.location || '',
      shiftId: shift.isFromSchedule ? undefined : shift.id,
      isFromSchedule: shift.isFromSchedule || false,
      cancelledShiftId: cancelledShift?.id,
    });
    setDetailDialogOpen(true);
  };

  // --- CRUD operations ---

  const handleSaveHours = async (employeeId: string, date: Date, startTime: string, endTime: string, location: string) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    try {
      const existingShift = shifts.find(s => s.employee_id === employeeId && s.date === dateStr);
      if (existingShift) {
        const { error } = await supabase.from('shifts').update({ start_time: startTime, end_time: endTime, location: location || null }).eq('id', existingShift.id);
        if (error) throw error;
        toast.success('Horaires mis à jour');
      } else {
        const { error } = await supabase.from('shifts').insert({ employee_id: employeeId, date: dateStr, start_time: startTime, end_time: endTime, location: location || null, status: 'planned' });
        if (error) throw error;
        toast.success('Horaires personnalisés créés');
      }
      fetchData();
    } catch (error) {
      logger.error('Error saving hours', { error: String(error) });
      toast.error('Erreur lors de la sauvegarde');
      throw error;
    }
  };

  const handleCreateTimeOff = async (employeeId: string, date: Date, type: string) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    try {
      const { error } = await supabase.from('time_off_requests').insert({ employee_id: employeeId, start_date: dateStr, end_date: dateStr, type, status: 'approved', reason: 'Créé depuis le planning' });
      if (error) throw error;
      const existingShift = shifts.find(s => s.employee_id === employeeId && s.date === dateStr);
      if (existingShift) {
        await supabase.from('shifts').delete().eq('id', existingShift.id);
      }
      toast.success('Absence enregistrée');
      fetchData();
    } catch (error) {
      logger.error('Error creating time off', { error: String(error) });
      toast.error("Erreur lors de l'enregistrement de l'absence");
      throw error;
    }
  };

  const handleDeleteCustomShift = async (shiftId: string) => {
    try {
      const { error } = await supabase.from('shifts').delete().eq('id', shiftId);
      if (error) throw error;
      toast.success('Horaires personnalisés supprimés');
      fetchData();
    } catch (error) {
      logger.error('Error deleting shift', { error: String(error) });
      toast.error('Erreur lors de la suppression');
      throw error;
    }
  };

  const handleRestoreShift = async (cancelledShiftId: string) => {
    try {
      const { error } = await supabase.from('shifts').delete().eq('id', cancelledShiftId);
      if (error) throw error;
      toast.success('Planning restauré');
      fetchData();
    } catch (error) {
      logger.error('Error restoring shift', { error: String(error) });
      toast.error('Erreur lors de la restauration');
      throw error;
    }
  };

  const handleDeleteTimeOff = async (request: TimeOffRequest) => {
    try {
      const { error } = await supabase.from('time_off_requests').delete().eq('id', request.id);
      if (error) throw error;
      toast.success('Congé supprimé');
      fetchData();
    } catch (error) {
      logger.error('Error deleting time off', { error: String(error) });
      toast.error('Erreur lors de la suppression');
    }
  };

  const handleSubmit = async () => {
    if (!formData.employee_id || !selectedDate) {
      toast.error('Veuillez sélectionner un employé');
      return;
    }
    try {
      const shiftData = {
        employee_id: formData.employee_id,
        date: format(selectedDate, 'yyyy-MM-dd'),
        start_time: formData.start_time,
        end_time: formData.end_time,
        location: formData.location || null,
        notes: formData.notes || null,
        status: 'planned',
      };
      if (editingShift) {
        const { error } = await supabase.from('shifts').update(shiftData).eq('id', editingShift.id);
        if (error) throw error;
        toast.success('Shift modifié');
      } else {
        const { error } = await supabase.from('shifts').insert(shiftData);
        if (error) throw error;
        toast.success('Shift créé');
      }
      setDialogOpen(false);
      fetchData();
    } catch (error) {
      logger.error('Error saving shift', { error: String(error) });
      toast.error('Erreur lors de la sauvegarde');
    }
  };

  const handleDeleteShift = async (shiftId: string) => {
    try {
      const { error } = await supabase.from('shifts').delete().eq('id', shiftId);
      if (error) throw error;
      toast.success('Shift supprimé');
      setDialogOpen(false);
      fetchData();
    } catch (error) {
      logger.error('Error deleting shift', { error: String(error) });
      toast.error('Erreur lors de la suppression');
    }
  };

  // --- Drag and drop ---

  const handleDragStart = (e: React.DragEvent, employee: Employee, shift: Shift, date: Date) => {
    setDragData({ employee, shift, sourceDate: date });
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnd = () => {
    setDragData(null);
    setDragOverDate(null);
  };

  const handleDragOver = (e: React.DragEvent, date: Date) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (!dragOverDate || !isSameDay(dragOverDate, date)) {
      setDragOverDate(date);
    }
  };

  const handleDragLeave = () => {
    setDragOverDate(null);
  };

  const handleDrop = async (e: React.DragEvent, targetDate: Date) => {
    e.preventDefault();
    setDragOverDate(null);
    if (!dragData) return;

    const { employee, shift, sourceDate } = dragData;
    if (isSameDay(sourceDate, targetDate)) {
      setDragData(null);
      return;
    }

    const targetDateStr = format(targetDate, 'yyyy-MM-dd');
    const targetDayOfWeek = targetDate.getDay();

    try {
      if (getTimeOffForDay(targetDate).some(t => t.employee_id === employee.id)) {
        toast.error('Impossible de déplacer : employé en congé ce jour');
        setDragData(null);
        return;
      }

      if (shifts.some(s => s.employee_id === employee.id && s.date === targetDateStr && s.status !== 'cancelled')) {
        toast.error('Impossible de déplacer : employé déjà planifié ce jour');
        setDragData(null);
        return;
      }

      if (employeeSchedules.some(s => s.employee_id === employee.id && s.day_of_week === targetDayOfWeek && s.is_working_day)) {
        toast.error('Impossible de déplacer : employé travaille déjà ce jour selon son planning');
        setDragData(null);
        return;
      }

      const { error: insertError } = await supabase.from('shifts').insert({
        employee_id: employee.id,
        date: targetDateStr,
        start_time: shift.start_time,
        end_time: shift.end_time,
        location: shift.location,
        status: 'planned',
      });
      if (insertError) throw insertError;

      if (shift.isFromSchedule) {
        const sourceDateStr = format(sourceDate, 'yyyy-MM-dd');
        const { error: cancelError } = await supabase.from('shifts').insert({
          employee_id: employee.id,
          date: sourceDateStr,
          start_time: shift.start_time,
          end_time: shift.end_time,
          location: shift.location,
          status: 'cancelled',
        });
        if (cancelError) throw cancelError;
      } else if (shift.id) {
        const { error: deleteError } = await supabase.from('shifts').delete().eq('id', shift.id);
        if (deleteError) throw deleteError;
      }

      toast.success(`${employee.first_name} déplacé au ${format(targetDate, 'd MMMM', { locale: fr })}`);
      fetchData();
    } catch (error) {
      logger.error('Error moving shift', { error: String(error) });
      toast.error('Erreur lors du déplacement');
    }
    setDragData(null);
  };

  // --- Render ---

  if (!currentCompany) {
    return (
      <MainLayout title="Planning">
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Veuillez sélectionner une entreprise</p>
        </div>
      </MainLayout>
    );
  }

  if (loading) {
    return (
      <MainLayout title="Planning">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout title="Planning" subtitle="Gérez les shifts et le planning des employés">
      <div className="space-y-6">
        <ShiftStatsCards
          employeeCount={employees.length}
          customShiftCount={shifts.filter(s => s.status === 'planned').length}
          timeOffCount={timeOffRequests.length}
          onEmployeesClick={() => setEmployeesListOpen(true)}
          onCustomShiftsClick={() => setCustomShiftsListOpen(true)}
          onTimeOffClick={() => setTimeOffListOpen(true)}
        />

        <Card>
          <ShiftCalendarHeader
            currentDate={currentDate}
            viewMode={viewMode}
            showOnlyCustomShifts={showOnlyCustomShifts}
            days={days}
            onNavigatePrevious={navigatePrevious}
            onNavigateNext={navigateNext}
            onGoToToday={goToToday}
            onViewModeChange={setViewMode}
            onToggleCustomShifts={() => setShowOnlyCustomShifts(!showOnlyCustomShifts)}
          />
          <CardContent>
            {/* Weekday Headers */}
            <div className="grid grid-cols-7 border-b border-border/50 mb-1">
              {WEEKDAYS.map((day) => (
                <div key={day} className="calendar-day-header py-3 text-center font-medium">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-px bg-border/30">
              {days.map((day, idx) => {
                const dayScheduledShifts = getScheduledEmployeesForDay(day);
                const dayTimeOff = getTimeOffForDay(day);
                const isCurrentMonth = isSameMonth(day, currentDate);
                const isCurrentDay = isToday(day);
                const isDragOver = dragOverDate && isSameDay(dragOverDate, day);

                return (
                  <div
                    key={idx}
                    className={cn(
                      'min-h-[100px] p-2 bg-card transition-colors relative group',
                      viewMode === 'week' && 'min-h-[200px]',
                      !isCurrentMonth && 'bg-muted/30',
                      isCurrentDay && 'bg-primary/5 ring-1 ring-primary/20',
                      isDragOver && 'bg-primary/10 ring-2 ring-primary/40'
                    )}
                    onDragOver={(e) => handleDragOver(e, day)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, day)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span
                        className={cn(
                          'calendar-day-number w-7 h-7 flex items-center justify-center rounded-full text-sm',
                          isCurrentDay && 'bg-primary text-primary-foreground font-semibold',
                          !isCurrentMonth && 'text-muted-foreground'
                        )}
                      >
                        {format(day, 'd')}
                      </span>
                      {isCurrentMonth && (
                        <div className="flex gap-0.5">
                          {(dayScheduledShifts.length + dayTimeOff.length > (viewMode === 'week' ? 6 : 4)) && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="w-6 h-6 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => {
                                setDayDetailDate(day);
                                setDayDetailDialogOpen(true);
                              }}
                            >
                              <Maximize2 className="w-3 h-3" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="w-6 h-6 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => openAddShiftDialog(day)}
                          >
                            <Plus className="w-3 h-3" />
                          </Button>
                        </div>
                      )}
                    </div>

                    <DayAvatars
                      shifts={dayScheduledShifts}
                      timeOffs={dayTimeOff}
                      employees={employees}
                      maxVisible={viewMode === 'week' ? 6 : 4}
                      sortOrder={sortOrder}
                      getTimeOffLabel={getTimeOffLabel}
                      onShiftClick={(shift, employee) => handleShiftClick(shift as Shift, employee as Employee, day)}
                      onDragStart={(e, employee, shift) => handleDragStart(e, employee as Employee, shift as Shift, day)}
                      onDragEnd={handleDragEnd}
                      isDragging={dragData?.employee?.id ? dayScheduledShifts.some(s => s.employee_id === dragData.employee.id) : false}
                    />
                  </div>
                );
              })}
            </div>

            {/* Legend */}
            <div className="flex items-center gap-6 pt-4 border-t border-border/50 mt-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full ring-2 ring-blue-500 bg-blue-100" />
                <span className="text-sm text-muted-foreground">Présent (jour travaillé)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full ring-2 ring-red-500 bg-red-100" />
                <span className="text-sm text-muted-foreground">Absent (congé/absence)</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>Cliquez sur un avatar pour modifier, glissez pour déplacer</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Day Detail Dialog */}
      <DayDetailDialog
        open={dayDetailDialogOpen}
        onOpenChange={setDayDetailDialogOpen}
        date={dayDetailDate}
        shifts={dayDetailDate ? getScheduledEmployeesForDay(dayDetailDate) : []}
        timeOffs={dayDetailDate ? getTimeOffForDay(dayDetailDate) : []}
        employees={employees}
        sortOrder={sortOrder}
        getTimeOffLabel={getTimeOffLabel}
        onShiftClick={(shift, employee) => {
          setDayDetailDialogOpen(false);
          if (dayDetailDate) {
            handleShiftClick(shift as Shift, employee as Employee, dayDetailDate);
          }
        }}
      />

      {/* Employee Day Detail Dialog */}
      <EmployeeDayDetailDialog
        open={detailDialogOpen}
        onOpenChange={setDetailDialogOpen}
        employee={selectedEmployee}
        date={selectedDayDate}
        startTime={selectedShiftData?.startTime || '09:00'}
        endTime={selectedShiftData?.endTime || '17:00'}
        location={selectedShiftData?.location}
        shiftId={selectedShiftData?.shiftId}
        isFromSchedule={selectedShiftData?.isFromSchedule || false}
        cancelledShiftId={selectedShiftData?.cancelledShiftId}
        sortOrder={sortOrder}
        onSaveHours={handleSaveHours}
        onCreateTimeOff={handleCreateTimeOff}
        onDeleteShift={selectedShiftData?.shiftId ? handleDeleteCustomShift : undefined}
        onRestoreShift={selectedShiftData?.cancelledShiftId ? handleRestoreShift : undefined}
        locations={locations}
      />

      {/* Add/Edit Shift Dialog */}
      <ShiftFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        selectedDate={selectedDate}
        isEditing={!!editingShift}
        formData={formData}
        onFormDataChange={setFormData}
        employees={employees}
        locations={locations}
        sortOrder={sortOrder}
        onSubmit={handleSubmit}
        onDelete={editingShift ? () => handleDeleteShift(editingShift.id) : undefined}
      />

      {/* Stat cards dialogs */}
      <EmployeesListDialog
        open={employeesListOpen}
        onOpenChange={setEmployeesListOpen}
        employees={employees}
      />

      <CustomShiftsListDialog
        open={customShiftsListOpen}
        onOpenChange={setCustomShiftsListOpen}
        shifts={shifts}
        locations={locations}
        sortOrder={sortOrder}
        onEditShift={(shift) => {
          setCustomShiftsListOpen(false);
          setEditingShift(shift);
          setSelectedDate(new Date(shift.date));
          setFormData({
            employee_id: shift.employee_id,
            start_time: shift.start_time.slice(0, 5),
            end_time: shift.end_time.slice(0, 5),
            location: shift.location || '',
            notes: shift.notes || '',
          });
          setDialogOpen(true);
        }}
        onDeleteShift={handleDeleteShift}
      />

      <TimeOffListDialog
        open={timeOffListOpen}
        onOpenChange={setTimeOffListOpen}
        timeOffRequests={timeOffRequests}
        employees={employees}
        onEditTimeOff={(request) => {
          setTimeOffListOpen(false);
          const employee = employees.find(e => e.id === request.employee_id);
          setEditingTimeOff({
            ...request,
            employee: employee ? { first_name: employee.first_name, last_name: employee.last_name } : undefined,
          });
          setTimeOffEditOpen(true);
        }}
        onDeleteTimeOff={handleDeleteTimeOff}
      />

      <TimeOffEditDialog
        open={timeOffEditOpen}
        onClose={() => {
          setTimeOffEditOpen(false);
          setEditingTimeOff(null);
        }}
        request={editingTimeOff}
        onUpdate={fetchData}
      />
    </MainLayout>
  );
}
