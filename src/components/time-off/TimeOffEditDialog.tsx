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
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface TimeOffRequest {
  id: string;
  employee_id: string;
  start_date: string;
  end_date: string;
  type: string;
  reason: string | null;
  status: string;
  employee?: {
    first_name: string;
    last_name: string;
  };
}

interface TimeOffEditDialogProps {
  open: boolean;
  onClose: () => void;
  request: TimeOffRequest | null;
  onUpdate: () => void;
}

const typeLabels: Record<string, string> = {
  vacation: 'Congés payés',
  sick: 'Maladie',
  personal: 'Personnel',
  other: 'Autre',
};

export function TimeOffEditDialog({ open, onClose, request, onUpdate }: TimeOffEditDialogProps) {
  const [type, setType] = useState('vacation');
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (request) {
      setType(request.type);
      setStartDate(parseISO(request.start_date));
      setEndDate(parseISO(request.end_date));
      setReason(request.reason || '');
    }
  }, [request]);

  const handleSubmit = async () => {
    if (!request) return;
    
    if (!startDate || !endDate) {
      toast.error('Veuillez sélectionner les dates');
      return;
    }

    if (endDate < startDate) {
      toast.error('La date de fin doit être après la date de début');
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('time_off_requests')
        .update({
          type,
          start_date: format(startDate, 'yyyy-MM-dd'),
          end_date: format(endDate, 'yyyy-MM-dd'),
          reason: reason || null,
        })
        .eq('id', request.id);

      if (error) throw error;

      toast.success('Demande modifiée avec succès');
      onUpdate();
      onClose();
    } catch (error) {
      console.error('Error updating request:', error);
      toast.error('Erreur lors de la modification');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!request) return;

    if (!confirm('Êtes-vous sûr de vouloir supprimer cette demande ?')) {
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('time_off_requests')
        .delete()
        .eq('id', request.id);

      if (error) throw error;

      toast.success('Demande supprimée');
      onUpdate();
      onClose();
    } catch (error) {
      console.error('Error deleting request:', error);
      toast.error('Erreur lors de la suppression');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Modifier la demande de congé</DialogTitle>
          <DialogDescription>
            {request?.employee?.first_name} {request?.employee?.last_name}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Type de congé</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(typeLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
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
                    {startDate ? format(startDate, 'dd/MM/yyyy') : 'Sélectionner'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={setStartDate}
                    locale={fr}
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
                    {endDate ? format(endDate, 'dd/MM/yyyy') : 'Sélectionner'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={setEndDate}
                    locale={fr}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Motif (optionnel)</Label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Précisez le motif..."
            />
          </div>
        </div>
        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button 
            variant="destructive" 
            onClick={handleDelete} 
            disabled={submitting}
            className="sm:mr-auto"
          >
            Supprimer
          </Button>
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            Annuler
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Enregistrer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
