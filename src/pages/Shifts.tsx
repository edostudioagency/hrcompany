import { useState, useEffect, useMemo } from 'react';
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
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
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
  employee?: {
    id: string;
    first_name: string;
    last_name: string;
  };
}

interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  status: string;
}

interface TimeOffRequest {
  id: string;
  employee_id: string;
  start_date: string;
  end_date: string;
  status: string;
  type: string;
}

const WEEKDAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

export default function ShiftsPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'month' | 'week'>('month');
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [timeOffRequests, setTimeOffRequests] = useState<TimeOffRequest[]>([]);
  const [loading, setLoading] = useState(true);
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

  const fetchData = async () => {
    try {
      const [shiftsRes, employeesRes, timeOffRes] = await Promise.all([
        supabase
          .from('shifts')
          .select('*, employee:employees(id, first_name, last_name)')
          .order('date'),
        supabase
          .from('employees')
          .select('id, first_name, last_name, status')
          .eq('status', 'active'),
        supabase
          .from('time_off_requests')
          .select('*')
          .eq('status', 'approved'),
      ]);

      if (shiftsRes.error) throw shiftsRes.error;
      if (employeesRes.error) throw employeesRes.error;
      if (timeOffRes.error) throw timeOffRes.error;

      setShifts(shiftsRes.data || []);
      setEmployees(employeesRes.data || []);
      setTimeOffRequests(timeOffRes.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

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

  const getEmployeeById = (id: string) =>
    employees.find((e) => e.id === id);

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
      rtt: 'RTT',
      maladie: 'Maladie',
      sans_solde: 'Sans solde',
      autre: 'Autre',
    };
    return labels[type] || type;
  };

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
          <Card>
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
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-accent/10">
                  <Calendar className="h-6 w-6 text-accent" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{shifts.filter((s) => s.status === 'planned').length}</p>
                  <p className="text-sm text-muted-foreground">Shifts planifiés</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
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
                const dayShifts = getShiftsForDay(day);
                const dayTimeOff = getTimeOffForDay(day);
                const isCurrentMonth = isSameMonth(day, currentDate);
                const isCurrentDay = isToday(day);

                return (
                  <div
                    key={idx}
                    className={cn(
                      'min-h-[100px] p-2 bg-card transition-colors relative group',
                      viewMode === 'week' && 'min-h-[200px]',
                      !isCurrentMonth && 'bg-muted/30',
                      isCurrentDay && 'bg-primary/5 ring-1 ring-primary/20'
                    )}
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
                        <Button
                          variant="ghost"
                          size="icon"
                          className="w-6 h-6 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => openAddShiftDialog(day)}
                        >
                          <Plus className="w-3 h-3" />
                        </Button>
                      )}
                    </div>

                    <div className="space-y-1 overflow-hidden">
                      {/* Time off indicators */}
                      {dayTimeOff.slice(0, 2).map((timeOff) => {
                        const employee = getEmployeeById(timeOff.employee_id);
                        return (
                          <div
                            key={timeOff.id}
                            className="calendar-event bg-destructive/20 text-destructive text-xs px-1.5 py-0.5 rounded truncate"
                          >
                            {employee?.first_name[0]}. {employee?.last_name} - {getTimeOffLabel(timeOff.type)}
                          </div>
                        );
                      })}

                      {/* Shifts */}
                      {dayShifts.slice(0, viewMode === 'week' ? 10 : 3).map((shift) => (
                        <div
                          key={shift.id}
                          onClick={() => openEditShiftDialog(shift)}
                          className="calendar-event bg-primary/20 text-primary text-xs px-1.5 py-0.5 rounded truncate cursor-pointer hover:bg-primary/30"
                        >
                          {shift.start_time.slice(0, 5)} - {shift.employee?.first_name}
                        </div>
                      ))}

                      {/* Overflow indicator */}
                      {dayShifts.length + dayTimeOff.length > (viewMode === 'week' ? 10 : 3) && (
                        <div className="text-xs text-muted-foreground pl-1">
                          +{dayShifts.length + dayTimeOff.length - (viewMode === 'week' ? 10 : 3)} autres
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Legend */}
            <div className="flex items-center gap-6 pt-4 border-t border-border/50 mt-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-primary/40" />
                <span className="text-sm text-muted-foreground">Shift planifié</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-destructive/40" />
                <span className="text-sm text-muted-foreground">Congé/Absence</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

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
                <Label>Heure début</Label>
                <Input
                  type="time"
                  value={formData.start_time}
                  onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Heure fin</Label>
                <Input
                  type="time"
                  value={formData.end_time}
                  onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Lieu</Label>
              <Input
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="Ex: Bureau, Télétravail..."
              />
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Input
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Notes optionnelles..."
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
            <div className="flex gap-2">
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
    </MainLayout>
  );
}
