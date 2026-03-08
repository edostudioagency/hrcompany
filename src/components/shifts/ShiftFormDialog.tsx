import { Button } from '@/components/ui/button';
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
import { Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { sortEmployees, formatEmployeeName } from '@/lib/utils';

interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  status: string;
  avatar_url: string | null;
  position?: string | null;
}

interface Location {
  id: string;
  name: string;
}

interface ShiftFormData {
  employee_id: string;
  start_time: string;
  end_time: string;
  location: string;
  notes: string;
}

interface ShiftFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedDate: Date | null;
  isEditing: boolean;
  formData: ShiftFormData;
  onFormDataChange: (data: ShiftFormData) => void;
  employees: Employee[];
  locations: Location[];
  sortOrder: string;
  onSubmit: () => void;
  onDelete?: () => void;
}

export function ShiftFormDialog({
  open,
  onOpenChange,
  selectedDate,
  isEditing,
  formData,
  onFormDataChange,
  employees,
  locations,
  sortOrder,
  onSubmit,
  onDelete,
}: ShiftFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Modifier le shift' : 'Nouveau shift'}
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
              onValueChange={(value) => onFormDataChange({ ...formData, employee_id: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner un employé" />
              </SelectTrigger>
              <SelectContent>
                {sortEmployees(employees, (sortOrder as 'first_name' | 'last_name') || 'first_name')
                  .map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {formatEmployeeName(emp.first_name, emp.last_name, (sortOrder as 'first_name' | 'last_name') || 'first_name')}
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
                onChange={(e) => onFormDataChange({ ...formData, start_time: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Heure de fin</Label>
              <Input
                type="time"
                value={formData.end_time}
                onChange={(e) => onFormDataChange({ ...formData, end_time: e.target.value })}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Lieu (optionnel)</Label>
            <Select
              value={formData.location || '__none__'}
              onValueChange={(value) =>
                onFormDataChange({ ...formData, location: value === '__none__' ? '' : value })
              }
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
              onChange={(e) => onFormDataChange({ ...formData, notes: e.target.value })}
              placeholder="Notes supplémentaires..."
            />
          </div>
        </div>
        <DialogFooter className="flex justify-between">
          {isEditing && onDelete && (
            <Button variant="destructive" onClick={onDelete}>
              <Trash2 className="h-4 w-4 mr-2" />
              Supprimer
            </Button>
          )}
          <div className="flex gap-2 ml-auto">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button onClick={onSubmit}>
              {isEditing ? 'Enregistrer' : 'Créer'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
