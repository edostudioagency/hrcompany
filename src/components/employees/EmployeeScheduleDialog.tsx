import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

interface EmployeeScheduleDialogProps {
  employeeId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface Schedule {
  id?: string;
  day_of_week: number;
  start_time: string | null;
  end_time: string | null;
  is_working_day: boolean;
}

const DAYS_OF_WEEK = [
  { value: 1, label: 'Lundi' },
  { value: 2, label: 'Mardi' },
  { value: 3, label: 'Mercredi' },
  { value: 4, label: 'Jeudi' },
  { value: 5, label: 'Vendredi' },
  { value: 6, label: 'Samedi' },
  { value: 0, label: 'Dimanche' },
];

export function EmployeeScheduleDialog({
  employeeId,
  open,
  onOpenChange,
}: EmployeeScheduleDialogProps) {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && employeeId) {
      fetchSchedules();
    }
  }, [open, employeeId]);

  const fetchSchedules = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('employee_schedules')
        .select('*')
        .eq('employee_id', employeeId)
        .order('day_of_week');

      if (error) throw error;

      // Initialize schedules for all days
      const existingSchedules = data || [];
      const allSchedules = DAYS_OF_WEEK.map((day) => {
        const existing = existingSchedules.find((s) => s.day_of_week === day.value);
        if (existing) {
          return {
            id: existing.id,
            day_of_week: existing.day_of_week,
            start_time: existing.start_time,
            end_time: existing.end_time,
            is_working_day: existing.is_working_day,
          };
        }
        return {
          day_of_week: day.value,
          start_time: null,
          end_time: null,
          is_working_day: false,
        };
      });

      setSchedules(allSchedules);
    } catch (error) {
      console.error('Error fetching schedules:', error);
      toast.error('Erreur lors du chargement du planning');
    } finally {
      setLoading(false);
    }
  };

  const updateSchedule = (dayOfWeek: number, field: keyof Schedule, value: unknown) => {
    setSchedules((prev) =>
      prev.map((s) =>
        s.day_of_week === dayOfWeek ? { ...s, [field]: value } : s
      )
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      for (const schedule of schedules) {
        const scheduleData = {
          employee_id: employeeId,
          day_of_week: schedule.day_of_week,
          start_time: schedule.is_working_day ? schedule.start_time : null,
          end_time: schedule.is_working_day ? schedule.end_time : null,
          is_working_day: schedule.is_working_day,
        };

        if (schedule.id) {
          await supabase
            .from('employee_schedules')
            .update(scheduleData)
            .eq('id', schedule.id);
        } else {
          await supabase.from('employee_schedules').insert(scheduleData);
        }
      }

      toast.success('Planning enregistré avec succès');
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving schedules:', error);
      toast.error('Erreur lors de la sauvegarde du planning');
    } finally {
      setSaving(false);
    }
  };

  const getDayLabel = (dayValue: number) => {
    return DAYS_OF_WEEK.find((d) => d.value === dayValue)?.label || '';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Planning hebdomadaire</DialogTitle>
          <DialogDescription>
            Définissez les horaires de travail par défaut pour cet employé
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4 py-4">
            {schedules.map((schedule) => (
              <div
                key={schedule.day_of_week}
                className="flex items-center gap-4 p-3 rounded-lg border bg-card"
              >
                <div className="w-24">
                  <span className="font-medium">{getDayLabel(schedule.day_of_week)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={schedule.is_working_day}
                    onCheckedChange={(checked) =>
                      updateSchedule(schedule.day_of_week, 'is_working_day', checked)
                    }
                  />
                  <Label className="text-sm text-muted-foreground">
                    {schedule.is_working_day ? 'Travaillé' : 'Repos'}
                  </Label>
                </div>
                {schedule.is_working_day && (
                  <div className="flex items-center gap-2 ml-auto">
                    <Input
                      type="time"
                      value={schedule.start_time || '09:00'}
                      onChange={(e) =>
                        updateSchedule(schedule.day_of_week, 'start_time', e.target.value)
                      }
                      className="w-28"
                    />
                    <span className="text-muted-foreground">à</span>
                    <Input
                      type="time"
                      value={schedule.end_time || '17:00'}
                      onChange={(e) =>
                        updateSchedule(schedule.day_of_week, 'end_time', e.target.value)
                      }
                      className="w-28"
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Enregistrer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
