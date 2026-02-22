import { useState, useEffect } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar, Clock, MapPin, Trash2, Undo2 } from "lucide-react";
import { formatEmployeeName, getEmployeeInitials, type EmployeeSortOrder } from "@/lib/utils";

interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  avatar_url: string | null;
  position: string | null;
}

interface EmployeeDayDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee: Employee | null;
  date: Date | null;
  startTime: string;
  endTime: string;
  location?: string;
  shiftId?: string;
  isFromSchedule: boolean;
  cancelledShiftId?: string;
  sortOrder?: EmployeeSortOrder;
  onSaveHours: (employeeId: string, date: Date, startTime: string, endTime: string, location: string) => Promise<void>;
  onCreateTimeOff: (employeeId: string, date: Date, type: string) => Promise<void>;
  onDeleteShift?: (shiftId: string) => Promise<void>;
  onRestoreShift?: (cancelledShiftId: string) => Promise<void>;
  locations: { id: string; name: string }[];
}

const LEAVE_TYPES = [
  { value: "conge_paye", label: "Congé payé", color: "bg-blue-500" },
  { value: "rtt", label: "RTT", color: "bg-purple-500" },
  { value: "maladie", label: "Maladie", color: "bg-red-500" },
  { value: "sans_solde", label: "Sans solde", color: "bg-orange-500" },
  { value: "autre", label: "Autre", color: "bg-gray-500" },
];

export function EmployeeDayDetailDialog({
  open,
  onOpenChange,
  employee,
  date,
  startTime: initialStartTime,
  endTime: initialEndTime,
  location: initialLocation = "",
  shiftId,
  isFromSchedule,
  cancelledShiftId,
  sortOrder = 'first_name',
  onSaveHours,
  onCreateTimeOff,
  onDeleteShift,
  onRestoreShift,
  locations,
}: EmployeeDayDetailDialogProps) {
  const [startTime, setStartTime] = useState(initialStartTime);
  const [endTime, setEndTime] = useState(initialEndTime);
  const [location, setLocation] = useState(initialLocation);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setStartTime(initialStartTime);
    setEndTime(initialEndTime);
    setLocation(initialLocation);
  }, [initialStartTime, initialEndTime, initialLocation, open]);

  if (!employee || !date) return null;

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  const handleSaveHours = async () => {
    setIsSaving(true);
    try {
      await onSaveHours(employee.id, date, startTime, endTime, location);
      onOpenChange(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateTimeOff = async (type: string) => {
    setIsSaving(true);
    try {
      await onCreateTimeOff(employee.id, date, type);
      onOpenChange(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteShift = async () => {
    if (!shiftId || !onDeleteShift) return;
    setIsSaving(true);
    try {
      await onDeleteShift(shiftId);
      onOpenChange(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleRestoreShift = async () => {
    if (!cancelledShiftId || !onRestoreShift) return;
    setIsSaving(true);
    try {
      await onRestoreShift(cancelledShiftId);
      onOpenChange(false);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12">
              <AvatarImage src={employee.avatar_url || undefined} />
              <AvatarFallback className="bg-primary text-primary-foreground">
                {getEmployeeInitials(employee.first_name, employee.last_name, sortOrder)}
              </AvatarFallback>
            </Avatar>
            <div>
              <DialogTitle className="text-left">
                {formatEmployeeName(employee.first_name, employee.last_name, sortOrder)}
              </DialogTitle>
              {employee.position && (
                <p className="text-sm text-muted-foreground">{employee.position}</p>
              )}
            </div>
          </div>
        </DialogHeader>

        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="h-4 w-4" />
          <span className="capitalize">
            {format(date, "EEEE d MMMM yyyy", { locale: fr })}
          </span>
          {isFromSchedule && (
            <Badge variant="secondary" className="ml-auto text-xs">
              Planning par défaut
            </Badge>
          )}
          {shiftId && (
            <Badge variant="outline" className="ml-auto text-xs">
              Horaires personnalisés
            </Badge>
          )}
        </div>

        <Separator />

        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Horaires de ce jour
            </Label>
            <div className="flex items-center gap-2">
              <Input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="flex-1"
              />
              <span className="text-muted-foreground">—</span>
              <Input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="flex-1"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Lieu (optionnel)
            </Label>
            <Select value={location || "__none__"} onValueChange={(value) => setLocation(value === "__none__" ? "" : value)}>
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
        </div>

        <Separator />

        <div className="space-y-2">
          <Label>Actions rapides</Label>
          <div className="flex flex-wrap gap-2">
            {LEAVE_TYPES.map((type) => (
              <Button
                key={type.value}
                variant="outline"
                size="sm"
                onClick={() => handleCreateTimeOff(type.value)}
                disabled={isSaving}
                className="text-xs"
              >
                <span className={`w-2 h-2 rounded-full ${type.color} mr-1.5`} />
                {type.label}
              </Button>
            ))}
          </div>
        </div>

        <DialogFooter className="flex-row justify-between sm:justify-between">
          <div className="flex gap-2">
            {shiftId && onDeleteShift && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDeleteShift}
                disabled={isSaving}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Supprimer
              </Button>
            )}
            {cancelledShiftId && onRestoreShift && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleRestoreShift}
                disabled={isSaving}
              >
                <Undo2 className="h-4 w-4 mr-1" />
                Restaurer planning
              </Button>
            )}
          </div>
          <div className="flex gap-2 ml-auto">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
              Annuler
            </Button>
            <Button onClick={handleSaveHours} disabled={isSaving}>
              {isSaving ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
