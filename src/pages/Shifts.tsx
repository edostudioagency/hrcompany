import { useState, useEffect, useMemo, useRef } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { useCompany } from '@/contexts/CompanyContext';
import { DayAvatars } from '@/components/calendar/DayAvatars';
import { DayDetailDialog } from '@/components/calendar/DayDetailDialog';
import { EmployeeDayDetailDialog } from '@/components/calendar/EmployeeDayDetailDialog';
import { EmployeesListDialog } from '@/components/shifts/EmployeesListDialog';
import { CustomShiftsListDialog } from '@/components/shifts/CustomShiftsListDialog';
import { TimeOffListDialog } from '@/components/shifts/TimeOffListDialog';
import { TimeOffEditDialog } from '@/components/time-off/TimeOffEditDialog';
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
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Calendar,
  CalendarDays,
  Loader2,
  Users,
  Clock,
  Trash2,
  Maximize2,
  Filter,
} from 'lucide-react';

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

export default function ShiftsPage() {
  const { currentCompany } = useCompany();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'month' | 'week'>('month');
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [employeeSchedules, setEmployeeSchedules] = useState<EmployeeSchedule[]>([]);
  const [timeOffRequests, setTimeOffRequests] = useState<TimeOffRequest[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [editingShift, setEditingShift] = useState<Shift | null>(null);

  // Detail dialog state
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

  // Filter state
  const [showOnlyCustomShifts, setShowOnlyCustomShifts] = useState(false);

  // Stat cards dialogs state
  const [employeesListOpen, setEmployeesListOpen] = useState(false);
  const [customShiftsListOpen, setCustomShiftsListOpen] = useState(false);
  const [timeOffListOpen, setTimeOffListOpen] = useState(false);
  
  // Time off edit dialog state
  const [timeOffEditOpen, setTimeOffEditOpen] = useState(false);
  const [editingTimeOff, setEditingTimeOff] = useState<TimeOffRequest | null>(null);

  const [formData, setFormData] = useState({
    employee_id: '',
    start_time: '09:00',
    end_time: '17:00',
    location: '',
    notes: '',
  });

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
      // First get employees for this company
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
      console.error('Error fetching data:', error);
      toast.error('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchData();
  }, [currentCompany?.id]);

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
      (t) => new Date(t.start_date) <= day && new Date(t.end_date) >= day
    );

  // Get employees scheduled to work on a given day based on their weekly schedule
  // Also includes any custom shifts for that day
  const getScheduledEmployeesForDay = (day: Date) => {
    const dayOfWeek = day.getDay();
    const dateStr = format(day, 'yyyy-MM-dd');
    
    // Get employee IDs who are on time off this day
    const absentEmployeeIds = new Set(
      getTimeOffForDay(day).map(t => t.employee_id)
    );
    
    // Get custom shifts for this day
    const customShifts = getShiftsForDay(day);
    const customShiftEmployeeIds = new Set(customShifts.map(s => s.employee_id));
    
    // Find schedules for this day of week where is_working_day is true
    // Exclude employees who have custom shifts (they'll be shown from shifts instead)
    // Exclude employees who are absent
    const workingSchedules = employeeSchedules.filter(
      schedule => 
        schedule.day_of_week === dayOfWeek && 
        schedule.is_working_day &&
        !absentEmployeeIds.has(schedule.employee_id) &&
        !customShiftEmployeeIds.has(schedule.employee_id)
    );
    
    // Map schedules to shift-like objects
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
    
    // Combine custom shifts (excluding absent and cancelled) with schedule-based shifts
    // Note: cancelled shifts still block the schedule (via customShiftEmployeeIds) but aren't displayed
    const validCustomShifts = customShifts
      .filter(s => !absentEmployeeIds.has(s.employee_id) && s.status !== 'cancelled')
      .map(s => ({ ...s, isFromSchedule: false }));
    
    // If filter is active, only return custom shifts
    if (showOnlyCustomShifts) {
      return validCustomShifts;
    }
    
    return [...validCustomShifts, ...scheduleShifts];
  };

  const navigatePrevious = () => {
    if (viewMode === 'month') {
      setCurrentDate(subMonths(currentDate, 1));
    } else {
      setCurrentDate(subWeeks(currentDate, 1));
    }
  };

  const navigateNext = () => {
    if (viewMode === 'month') {
      setCurrentDate(addMonths(currentDate, 1));
    } else {
      setCurrentDate(addWeeks(currentDate, 1));
    }
  };

  const goToToday = () => setCurrentDate(new Date());

  const openAddShiftDialog = (date: Date) => {
    setSelectedDate(date);
    setEditingShift(null);
    setFormData({
      employee_id: '',
      start_time: '09:00',
      end_time: '17:00',
      location: '',
      notes: '',
    });
    setDialogOpen(true);
  };

  const openEditShiftDialog = (shift: Shift) => {
    setSelectedDate(new Date(shift.date));
    setEditingShift(shift);
    setFormData({
      employee_id: shift.employee_id,
      start_time: shift.start_time,
      end_time: shift.end_time,
      location: shift.location || '',
      notes: shift.notes || '',
    });
    setDialogOpen(true);
  };

  // Handle click on a shift/presence avatar
  const handleShiftClick = (shift: Shift, employee: Employee, date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    
    // Check if there's a cancelled shift for this employee on this date
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

  // Save custom hours for a specific day
  const handleSaveHours = async (
    employeeId: string,
    date: Date,
    startTime: string,
    endTime: string,
    location: string
  ) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    
    try {
      // Check if a shift already exists for this employee on this date
      const existingShift = shifts.find(
        s => s.employee_id === employeeId && s.date === dateStr
      );
      
      if (existingShift) {
        // Update existing shift
        const { error } = await supabase
          .from('shifts')
          .update({
            start_time: startTime,
            end_time: endTime,
            location: location || null,
          })
          .eq('id', existingShift.id);
        
        if (error) throw error;
        toast.success('Horaires mis à jour');
      } else {
        // Create new shift
        const { error } = await supabase.from('shifts').insert({
          employee_id: employeeId,
          date: dateStr,
          start_time: startTime,
          end_time: endTime,
          location: location || null,
          status: 'planned',
        });
        
        if (error) throw error;
        toast.success('Horaires personnalisés créés');
      }
      
      fetchData();
    } catch (error) {
      console.error('Error saving hours:', error);
      toast.error('Erreur lors de la sauvegarde');
      throw error;
    }
  };

  // Create a time off request for a specific day
  const handleCreateTimeOff = async (
    employeeId: string,
    date: Date,
    type: string
  ) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    
    try {
      // Create approved time off request (since manager is doing it)
      const { error } = await supabase.from('time_off_requests').insert({
        employee_id: employeeId,
        start_date: dateStr,
        end_date: dateStr,
        type,
        status: 'approved',
        reason: 'Créé depuis le planning',
      });
      
      if (error) throw error;
      
      // If there was a custom shift for this day, delete it
      const existingShift = shifts.find(
        s => s.employee_id === employeeId && s.date === dateStr
      );
      if (existingShift) {
        await supabase.from('shifts').delete().eq('id', existingShift.id);
      }
      
      toast.success('Absence enregistrée');
      fetchData();
    } catch (error) {
      console.error('Error creating time off:', error);
      toast.error("Erreur lors de l'enregistrement de l'absence");
      throw error;
    }
  };

  // Delete a custom shift
  const handleDeleteCustomShift = async (shiftId: string) => {
    try {
      const { error } = await supabase.from('shifts').delete().eq('id', shiftId);
      if (error) throw error;
      toast.success('Horaires personnalisés supprimés');
      fetchData();
    } catch (error) {
      console.error('Error deleting shift:', error);
      toast.error('Erreur lors de la suppression');
      throw error;
    }
  };

  // Restore a cancelled shift (delete the cancelled record to show original schedule)
  const handleRestoreShift = async (cancelledShiftId: string) => {
    try {
      const { error } = await supabase.from('shifts').delete().eq('id', cancelledShiftId);
      if (error) throw error;
      toast.success('Planning restauré');
      fetchData();
    } catch (error) {
      console.error('Error restoring shift:', error);
      toast.error('Erreur lors de la restauration');
      throw error;
    }
  };

  // Delete a time off request
  const handleDeleteTimeOff = async (request: TimeOffRequest) => {
    try {
      const { error } = await supabase.from('time_off_requests').delete().eq('id', request.id);
      if (error) throw error;
      toast.success('Congé supprimé');
      fetchData();
    } catch (error) {
      console.error('Error deleting time off:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  // Drag and drop handlers
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
    
    // Don't do anything if dropped on same day
    if (isSameDay(sourceDate, targetDate)) {
      setDragData(null);
      return;
    }
    
    const targetDateStr = format(targetDate, 'yyyy-MM-dd');
    
    try {
      // Check if employee is on time off on target date
      const isOnTimeOff = getTimeOffForDay(targetDate).some(
        t => t.employee_id === employee.id
      );
      
      if (isOnTimeOff) {
        toast.error('Impossible de déplacer : employé en congé ce jour');
        setDragData(null);
        return;
      }
      
      // Create a shift on the target date with the same hours
      const { error: insertError } = await supabase.from('shifts').insert({
        employee_id: employee.id,
        date: targetDateStr,
        start_time: shift.start_time,
        end_time: shift.end_time,
        location: shift.location,
        status: 'planned',
      });
      
      if (insertError) throw insertError;
      
      // Handle the source shift
      if (shift.isFromSchedule) {
        // For recurring schedule shifts, create a cancelled shift to hide the original
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
        // For custom shifts, delete the original
        const { error: deleteError } = await supabase
          .from('shifts')
          .delete()
          .eq('id', shift.id);
        
        if (deleteError) throw deleteError;
      }
      
      toast.success(`${employee.first_name} déplacé au ${format(targetDate, 'd MMMM', { locale: fr })}`);
      fetchData();
    } catch (error) {
      console.error('Error moving shift:', error);
      toast.error('Erreur lors du déplacement');
    }
    
    setDragData(null);
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
        const { error } = await supabase
          .from('shifts')
          .update(shiftData)
          .eq('id', editingShift.id);
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
      console.error('Error saving shift:', error);
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
      console.error('Error deleting shift:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  const getTimeOffLabel = (type: string) => {
    const labels: Record<string, string> = {
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
    return labels[type] || type;
  };

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
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card 
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => setEmployeesListOpen(true)}
          >
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-primary/10">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{employees.length}</p>
                  <p className="text-sm text-muted-foreground">Employés actifs</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card 
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => setCustomShiftsListOpen(true)}
          >
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-accent/10">
                  <Calendar className="h-6 w-6 text-accent" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{shifts.filter((s) => s.status === 'planned').length}</p>
                  <p className="text-sm text-muted-foreground">Shifts personnalisés</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card 
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => setTimeOffListOpen(true)}
          >
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-destructive/10">
                  <Clock className="h-6 w-6 text-destructive" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{timeOffRequests.length}</p>
                  <p className="text-sm text-muted-foreground">Congés en cours</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Calendar */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={navigatePrevious}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={navigateNext}>
                <ChevronRight className="w-4 h-4" />
              </Button>
              <CardTitle className="text-lg capitalize ml-2">
                {viewMode === 'month'
                  ? format(currentDate, 'MMMM yyyy', { locale: fr })
                  : `Semaine du ${format(days[0], 'd MMMM', { locale: fr })}`}
              </CardTitle>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant={showOnlyCustomShifts ? "default" : "outline"} 
                size="sm" 
                onClick={() => setShowOnlyCustomShifts(!showOnlyCustomShifts)}
              >
                <Filter className="h-4 w-4 mr-1" />
                Personnalisés
              </Button>
              <Button variant="outline" size="sm" onClick={goToToday}>
                Aujourd'hui
              </Button>
              <div className="flex border rounded-lg overflow-hidden">
                <Button
                  variant={viewMode === 'week' ? 'default' : 'ghost'}
                  size="sm"
                  className="rounded-none"
                  onClick={() => setViewMode('week')}
                >
                  <CalendarDays className="h-4 w-4 mr-1" />
                  Semaine
                </Button>
                <Button
                  variant={viewMode === 'month' ? 'default' : 'ghost'}
                  size="sm"
                  className="rounded-none"
                  onClick={() => setViewMode('month')}
                >
                  <Calendar className="h-4 w-4 mr-1" />
                  Mois
                </Button>
              </div>
            </div>
          </CardHeader>
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
                <span>💡</span>
                <span>Cliquez sur un avatar pour modifier, glissez pour déplacer</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Day Detail Dialog - Full view of a day */}
      <DayDetailDialog
        open={dayDetailDialogOpen}
        onOpenChange={setDayDetailDialogOpen}
        date={dayDetailDate}
        shifts={dayDetailDate ? getScheduledEmployeesForDay(dayDetailDate) : []}
        timeOffs={dayDetailDate ? getTimeOffForDay(dayDetailDate) : []}
        employees={employees}
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
        employee={selectedEmployee as any}
        date={selectedDayDate}
        startTime={selectedShiftData?.startTime || '09:00'}
        endTime={selectedShiftData?.endTime || '17:00'}
        location={selectedShiftData?.location}
        shiftId={selectedShiftData?.shiftId}
        isFromSchedule={selectedShiftData?.isFromSchedule || false}
        cancelledShiftId={selectedShiftData?.cancelledShiftId}
        onSaveHours={handleSaveHours}
        onCreateTimeOff={handleCreateTimeOff}
        onDeleteShift={selectedShiftData?.shiftId ? handleDeleteCustomShift : undefined}
        onRestoreShift={selectedShiftData?.cancelledShiftId ? handleRestoreShift : undefined}
        locations={locations}
      />

      {/* Add/Edit Shift Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingShift ? 'Modifier le shift' : 'Nouveau shift'}
            </DialogTitle>
            <DialogDescription>
              {selectedDate && format(selectedDate, 'EEEE d MMMM yyyy', { locale: fr })}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Employé *</Label>
              <Select
                value={formData.employee_id}
                onValueChange={(value) => setFormData({ ...formData, employee_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un employé" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.first_name} {emp.last_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Heure de début</Label>
                <Input
                  type="time"
                  value={formData.start_time}
                  onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Heure de fin</Label>
                <Input
                  type="time"
                  value={formData.end_time}
                  onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Lieu (optionnel)</Label>
              <Select
                value={formData.location || "__none__"}
                onValueChange={(value) => setFormData({ ...formData, location: value === "__none__" ? "" : value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un lieu" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Aucun lieu</SelectItem>
                  {locations.map((loc) => (
                    <SelectItem key={loc.id} value={loc.name}>
                      {loc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Notes (optionnel)</Label>
              <Input
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Notes supplémentaires..."
              />
            </div>
          </div>
          <DialogFooter className="flex justify-between">
            {editingShift && (
              <Button
                variant="destructive"
                onClick={() => handleDeleteShift(editingShift.id)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Supprimer
              </Button>
            )}
            <div className="flex gap-2 ml-auto">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Annuler
              </Button>
              <Button onClick={handleSubmit}>
                {editingShift ? 'Enregistrer' : 'Créer'}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
          setEditingTimeOff({
            ...request,
            employee: employees.find(e => e.id === request.employee_id) as any,
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
        request={editingTimeOff as any}
        onUpdate={fetchData}
      />
    </MainLayout>
  );
}
