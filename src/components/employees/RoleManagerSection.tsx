import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Loader2, Shield, Users, Crown, UserCog, Calculator } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface RoleManagerSectionProps {
  employeeId: string;
  employeeUserId: string | null;
  managerId: string | null;
  onUpdate: () => void;
}

interface ManagerOption {
  id: string;
  first_name: string;
  last_name: string;
}

type AppRole = 'admin' | 'manager' | 'employee' | 'accountant';

const ROLE_LABELS: Record<AppRole, { label: string; icon: React.ElementType; color: string }> = {
  admin: { label: 'Administrateur', icon: Crown, color: 'bg-red-100 text-red-800' },
  manager: { label: 'Manager', icon: UserCog, color: 'bg-blue-100 text-blue-800' },
  employee: { label: 'Employé', icon: Users, color: 'bg-gray-100 text-gray-800' },
  accountant: { label: 'Comptable', icon: Calculator, color: 'bg-green-100 text-green-800' },
};

export function RoleManagerSection({
  employeeId,
  employeeUserId,
  managerId,
  onUpdate,
}: RoleManagerSectionProps) {
  const { role: currentUserRole } = useAuth();
  const [currentRole, setCurrentRole] = useState<AppRole | null>(null);
  const [managers, setManagers] = useState<ManagerOption[]>([]);
  const [selectedManager, setSelectedManager] = useState<string>(managerId || '');
  const [loading, setLoading] = useState(false);
  const [loadingRole, setLoadingRole] = useState(true);
  const [savingManager, setSavingManager] = useState(false);

  const isAdmin = currentUserRole === 'admin';

  useEffect(() => {
    fetchData();
  }, [employeeUserId]);

  const fetchData = async () => {
    setLoadingRole(true);
    try {
      // Fetch current role if user has an account
      if (employeeUserId) {
        const { data: roleData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', employeeUserId)
          .maybeSingle();

        if (roleData) {
          setCurrentRole(roleData.role as AppRole);
        }
      }

      // Fetch list of managers and admins
      const { data: managersData } = await supabase
        .from('employees')
        .select('id, first_name, last_name, user_id')
        .neq('id', employeeId);

      if (managersData) {
        // Filter to only show employees who have manager/admin role
        const managerIds = managersData.filter(m => m.user_id).map(m => m.user_id);
        
        if (managerIds.length > 0) {
          const { data: rolesData } = await supabase
            .from('user_roles')
            .select('user_id, role')
            .in('user_id', managerIds as string[])
            .in('role', ['manager', 'admin']);

          const managerUserIds = new Set(rolesData?.map(r => r.user_id) || []);
          
          const filteredManagers = managersData.filter(
            m => m.user_id && managerUserIds.has(m.user_id)
          );
          
          setManagers(filteredManagers);
        } else {
          setManagers([]);
        }
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoadingRole(false);
    }
  };

  const handleRoleChange = async (newRole: AppRole) => {
    if (!employeeUserId || !isAdmin) return;

    setLoading(true);
    try {
      // Update the role
      const { error } = await supabase
        .from('user_roles')
        .update({ role: newRole })
        .eq('user_id', employeeUserId);

      if (error) throw error;

      setCurrentRole(newRole);
      toast.success(`Rôle mis à jour: ${ROLE_LABELS[newRole].label}`);
      onUpdate();
      fetchData(); // Refresh managers list
    } catch (error) {
      console.error('Error updating role:', error);
      toast.error('Erreur lors de la mise à jour du rôle');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveManager = async () => {
    setSavingManager(true);
    try {
      const { error } = await supabase
        .from('employees')
        .update({ manager_id: selectedManager || null })
        .eq('id', employeeId);

      if (error) throw error;

      toast.success('Manager assigné avec succès');
      onUpdate();
    } catch (error) {
      console.error('Error updating manager:', error);
      toast.error("Erreur lors de l'assignation du manager");
    } finally {
      setSavingManager(false);
    }
  };

  const RoleIcon = currentRole ? ROLE_LABELS[currentRole].icon : Users;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Rôle et Hiérarchie
        </CardTitle>
        <CardDescription>
          Gérez le rôle et le manager de l'employé
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Current Role */}
        <div className="space-y-3">
          <Label>Rôle actuel</Label>
          {loadingRole ? (
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm text-muted-foreground">Chargement...</span>
            </div>
          ) : !employeeUserId ? (
            <p className="text-sm text-muted-foreground">
              L'employé doit activer son compte pour avoir un rôle.
            </p>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Badge className={currentRole ? ROLE_LABELS[currentRole].color : ''}>
                  <RoleIcon className="h-3 w-3 mr-1" />
                  {currentRole ? ROLE_LABELS[currentRole].label : 'Inconnu'}
                </Badge>
              </div>

              {isAdmin && currentRole && (
                <div className="flex flex-wrap gap-2 pt-2">
                  {(['employee', 'manager', 'admin', 'accountant'] as AppRole[]).map((role) => (
                    <AlertDialog key={role}>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant={currentRole === role ? 'default' : 'outline'}
                          size="sm"
                          disabled={currentRole === role || loading}
                        >
                          {loading && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
                          {React.createElement(ROLE_LABELS[role].icon, { className: 'h-3 w-3 mr-1' })}
                          {ROLE_LABELS[role].label}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Changer le rôle ?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Vous êtes sur le point de promouvoir cet employé au rôle de{' '}
                            <strong>{ROLE_LABELS[role].label}</strong>.
                            {role === 'admin' && (
                              <span className="block mt-2 text-destructive">
                                ⚠️ Un administrateur a un accès complet au système.
                              </span>
                            )}
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Annuler</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleRoleChange(role)}>
                            Confirmer
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  ))}
                </div>
              )}
              
              {!isAdmin && (
                <p className="text-xs text-muted-foreground">
                  Seuls les administrateurs peuvent modifier les rôles.
                </p>
              )}
            </div>
          )}
        </div>

        {/* Manager Assignment */}
        <div className="space-y-3 pt-4 border-t">
          <Label>Manager direct</Label>
          <Select 
            value={selectedManager} 
            onValueChange={setSelectedManager}
          >
            <SelectTrigger>
              <SelectValue placeholder="Sélectionner un manager" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Aucun manager</SelectItem>
              {managers.map((manager) => (
                <SelectItem key={manager.id} value={manager.id}>
                  {manager.first_name} {manager.last_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {managers.length === 0 && (
            <p className="text-xs text-muted-foreground">
              Aucun manager ou admin disponible. Promouvez d'abord un employé en manager.
            </p>
          )}
          <Button 
            onClick={handleSaveManager} 
            disabled={savingManager || selectedManager === (managerId || '')} 
            className="w-full"
          >
            {savingManager && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Enregistrer le manager
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
