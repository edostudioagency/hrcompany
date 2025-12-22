import { useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Employee, Team, UserRole, ROLE_LABELS } from '@/types/hr';
import { useToast } from '@/hooks/use-toast';

interface EmployeeFormProps {
  employee?: Employee | null;
  teams: Team[];
  companyId: string;
  open: boolean;
  onClose: () => void;
  onSave: (employee: Partial<Employee>) => void;
}

export function EmployeeForm({
  employee,
  teams,
  companyId,
  open,
  onClose,
  onSave,
}: EmployeeFormProps) {
  const { toast } = useToast();
  const isEditing = !!employee;

  const [formData, setFormData] = useState({
    firstName: employee?.firstName || '',
    lastName: employee?.lastName || '',
    email: employee?.email || '',
    teamId: employee?.teamId || '',
    role: employee?.role || 'employee' as UserRole,
    hourlyRate: employee?.hourlyRate?.toString() || '',
    active: employee?.active ?? true,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.firstName || !formData.lastName || !formData.email) {
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: 'Veuillez remplir tous les champs obligatoires.',
      });
      return;
    }

    onSave({
      ...employee,
      companyId,
      firstName: formData.firstName,
      lastName: formData.lastName,
      email: formData.email,
      teamId: formData.teamId || undefined,
      role: formData.role,
      hourlyRate: formData.hourlyRate ? parseFloat(formData.hourlyRate) : undefined,
      active: formData.active,
    });

    toast({
      title: isEditing ? 'Employé modifié' : 'Employé ajouté',
      description: `${formData.firstName} ${formData.lastName} a été ${isEditing ? 'modifié' : 'ajouté'} avec succès.`,
    });

    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Modifier l\'employé' : 'Ajouter un employé'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 mt-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">Prénom *</Label>
              <Input
                id="firstName"
                value={formData.firstName}
                onChange={(e) =>
                  setFormData({ ...formData, firstName: e.target.value })
                }
                placeholder="Jean"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Nom *</Label>
              <Input
                id="lastName"
                value={formData.lastName}
                onChange={(e) =>
                  setFormData({ ...formData, lastName: e.target.value })
                }
                placeholder="Dupont"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
              placeholder="jean.dupont@entreprise.fr"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="team">Équipe</Label>
              <Select
                value={formData.teamId}
                onValueChange={(value) =>
                  setFormData({ ...formData, teamId: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner..." />
                </SelectTrigger>
                <SelectContent>
                  {teams.map((team) => (
                    <SelectItem key={team.id} value={team.id}>
                      {team.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Rôle *</Label>
              <Select
                value={formData.role}
                onValueChange={(value) =>
                  setFormData({ ...formData, role: value as UserRole })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(['employee', 'manager', 'admin'] as UserRole[]).map((role) => (
                    <SelectItem key={role} value={role}>
                      {ROLE_LABELS[role]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="hourlyRate">Taux horaire (€/h)</Label>
            <Input
              id="hourlyRate"
              type="number"
              step="0.01"
              value={formData.hourlyRate}
              onChange={(e) =>
                setFormData({ ...formData, hourlyRate: e.target.value })
              }
              placeholder="25.00"
            />
          </div>

          <div className="flex items-center justify-between py-2">
            <div>
              <Label htmlFor="active">Employé actif</Label>
              <p className="text-sm text-muted-foreground">
                Les employés inactifs ne peuvent pas être planifiés
              </p>
            </div>
            <Switch
              id="active"
              checked={formData.active}
              onCheckedChange={(checked) =>
                setFormData({ ...formData, active: checked })
              }
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Annuler
            </Button>
            <Button type="submit">
              {isEditing ? 'Enregistrer' : 'Ajouter'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
