import { useState, useEffect } from 'react';
import { Users, Shield, UserCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Team, Employee } from '@/types/hr';

interface TeamApproversFormProps {
  team: Team;
  employees: Employee[];
  onUpdate: (teamId: string, primaryApproverId: string | undefined, backupApproverId: string | undefined) => void;
}

export function TeamApproversForm({ team, employees, onUpdate }: TeamApproversFormProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [primaryApproverId, setPrimaryApproverId] = useState(team.primaryApproverId || '');
  const [backupApproverId, setBackupApproverId] = useState(team.backupApproverId || '');

  // Filter employees who can be approvers (managers or admins)
  const eligibleApprovers = employees.filter(
    (e) => (e.role === 'manager' || e.role === 'admin') && e.active
  );

  useEffect(() => {
    setPrimaryApproverId(team.primaryApproverId || '');
    setBackupApproverId(team.backupApproverId || '');
  }, [team]);

  const handleSave = () => {
    if (!primaryApproverId) {
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: 'Veuillez sélectionner un approbateur principal.',
      });
      return;
    }

    onUpdate(
      team.id,
      primaryApproverId || undefined,
      backupApproverId || undefined
    );

    toast({
      title: 'Approbateurs mis à jour',
      description: `Les approbateurs de l'équipe ${team.name} ont été mis à jour.`,
    });

    setOpen(false);
  };

  const primaryApprover = employees.find((e) => e.id === team.primaryApproverId);
  const backupApprover = employees.find((e) => e.id === team.backupApproverId);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Shield className="w-4 h-4" />
          Approbateurs
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            Approbateurs - {team.name}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-6 pt-4">
          {/* Current Approvers Display */}
          {(primaryApprover || backupApprover) && (
            <div className="p-3 bg-secondary/30 rounded-lg space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Approbateurs actuels</p>
              {primaryApprover && (
                <div className="flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-success" />
                  <span className="text-sm">
                    {primaryApprover.firstName} {primaryApprover.lastName}
                    <span className="text-muted-foreground ml-1">(principal)</span>
                  </span>
                </div>
              )}
              {backupApprover && (
                <div className="flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm">
                    {backupApprover.firstName} {backupApprover.lastName}
                    <span className="text-muted-foreground ml-1">(backup)</span>
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Primary Approver */}
          <div className="space-y-2">
            <Label>Approbateur principal *</Label>
            <Select value={primaryApproverId} onValueChange={setPrimaryApproverId}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner..." />
              </SelectTrigger>
              <SelectContent>
                {eligibleApprovers.map((employee) => (
                  <SelectItem
                    key={employee.id}
                    value={employee.id}
                    disabled={employee.id === backupApproverId}
                  >
                    {employee.firstName} {employee.lastName} ({employee.role})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Cette personne recevra les notifications et validera les demandes.
            </p>
          </div>

          {/* Backup Approver */}
          <div className="space-y-2">
            <Label>Approbateur de secours (optionnel)</Label>
            <Select value={backupApproverId} onValueChange={setBackupApproverId}>
              <SelectTrigger>
                <SelectValue placeholder="Aucun backup" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Aucun backup</SelectItem>
                {eligibleApprovers
                  .filter((e) => e.id !== primaryApproverId)
                  .map((employee) => (
                    <SelectItem key={employee.id} value={employee.id}>
                      {employee.firstName} {employee.lastName} ({employee.role})
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Sera notifié si l'approbateur principal est absent.
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleSave}>Enregistrer</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
