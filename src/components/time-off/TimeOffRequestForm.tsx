import { useState } from 'react';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import {
  Dialog,
  DialogContent,
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  TimeOffType,
  PartOfDay,
  TIME_OFF_TYPE_LABELS,
  PART_OF_DAY_LABELS,
} from '@/types/hr';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface TimeOffRequestFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: {
    type: TimeOffType;
    startDate: Date;
    endDate: Date;
    partOfDay: PartOfDay;
    reason?: string;
  }) => void;
}

export function TimeOffRequestForm({
  open,
  onClose,
  onSubmit,
}: TimeOffRequestFormProps) {
  const { toast } = useToast();
  const [type, setType] = useState<TimeOffType>('conge_paye');
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const [partOfDay, setPartOfDay] = useState<PartOfDay>('full_day');
  const [reason, setReason] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!startDate || !endDate) {
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: 'Veuillez sélectionner les dates de début et de fin.',
      });
      return;
    }

    if (endDate < startDate) {
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: 'La date de fin doit être après la date de début.',
      });
      return;
    }

    onSubmit({
      type,
      startDate,
      endDate,
      partOfDay,
      reason: reason.trim() || undefined,
    });

    toast({
      title: 'Demande envoyée',
      description: 'Votre demande de congé a été soumise avec succès.',
    });

    // Reset form
    setType('conge_paye');
    setStartDate(undefined);
    setEndDate(undefined);
    setPartOfDay('full_day');
    setReason('');
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Nouvelle demande de congé</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 mt-4">
          <div className="space-y-2">
            <Label>Type de congé</Label>
            <Select value={type} onValueChange={(v) => setType(v as TimeOffType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(TIME_OFF_TYPE_LABELS) as TimeOffType[]).map(
                  (t) => (
                    <SelectItem key={t} value={t}>
                      {TIME_OFF_TYPE_LABELS[t]}
                    </SelectItem>
                  )
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Date de début</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !startDate && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate
                      ? format(startDate, 'dd/MM/yyyy', { locale: fr })
                      : 'Sélectionner'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={setStartDate}
                    locale={fr}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label>Date de fin</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !endDate && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate
                      ? format(endDate, 'dd/MM/yyyy', { locale: fr })
                      : 'Sélectionner'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={setEndDate}
                    locale={fr}
                    initialFocus
                    disabled={(date) => startDate ? date < startDate : false}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Durée</Label>
            <Select
              value={partOfDay}
              onValueChange={(v) => setPartOfDay(v as PartOfDay)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(PART_OF_DAY_LABELS) as PartOfDay[]).map((p) => (
                  <SelectItem key={p} value={p}>
                    {PART_OF_DAY_LABELS[p]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Motif (optionnel)</Label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Précisez le motif de votre demande..."
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Annuler
            </Button>
            <Button type="submit">Soumettre la demande</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
