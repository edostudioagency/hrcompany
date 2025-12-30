import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2, Plus, Search, Mail, Edit, Trash2, Clock, FileText, UserCheck, UserX } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
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
import { EmployeeScheduleDialog } from '@/components/employees/EmployeeScheduleDialog';
import { EmployeeDetailDialog } from '@/components/employees/EmployeeDetailDialog';
import { EmployeeEditDialog } from '@/components/employees/EmployeeEditDialog';
import { useCompany } from '@/contexts/CompanyContext';

interface EmployeeInvitation {
  invitation_token: string;
  sent_at: string | null;
}

interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  position: string | null;
  hourly_rate: number | null;
  status: string;
  contract_type: string | null;
  contract_start_date: string | null;
  contract_end_date: string | null;
  contract_hours: number | null;
  gross_salary: number | null;
  invitation_sent_at: string | null;
  salary_type: string | null;
  user_id: string | null;
  manager_id: string | null;
  created_at: string;
  is_executive: boolean;
  avatar_url: string | null;
  // From employee_invitations table (joined) - can be single object or array depending on query
  employee_invitations?: EmployeeInvitation | EmployeeInvitation[] | null;
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

const getStatusBadge = (status: string, hasAccount: boolean) => {
  if (status === 'active' && hasAccount) {
    return (
      <Badge variant="default" className="bg-green-100 text-green-800 gap-1">
        <UserCheck className="w-3 h-3" />
        Actif
      </Badge>
    );
  }
  if (status === 'inactive') {
    return <Badge variant="secondary">Inactif</Badge>;
  }
  // Pending or active without account
  return (
    <Badge variant="outline" className="border-yellow-500 text-yellow-700 gap-1">
      <UserX className="w-3 h-3" />
      En attente
    </Badge>
  );
};

const getContractTypeBadge = (type: string | null) => {
  const labels: Record<string, { label: string; className: string }> = {
    cdi: { label: 'CDI', className: 'bg-blue-100 text-blue-800' },
    cdd: { label: 'CDD', className: 'bg-orange-100 text-orange-800' },
    alternance: { label: 'Alternance', className: 'bg-purple-100 text-purple-800' },
    stage: { label: 'Stage', className: 'bg-pink-100 text-pink-800' },
    freelance: { label: 'Freelance', className: 'bg-teal-100 text-teal-800' },
    interim: { label: 'Intérim', className: 'bg-amber-100 text-amber-800' },
    other: { label: 'Autre', className: 'bg-gray-100 text-gray-800' },
  };
  
  if (!type) return <span className="text-muted-foreground">-</span>;
  const found = labels[type];
  if (!found) return <Badge variant="outline">{type}</Badge>;
  return <Badge className={found.className}>{found.label}</Badge>;
};

export default function EmployeesPage() {
  const { currentCompany } = useCompany();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    position: '',
    hourly_rate: '',
    contract_type: '',
  });

  const fetchEmployees = async () => {
    if (!currentCompany?.id) {
      setEmployees([]);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('employees')
        .select('*, employee_invitations(invitation_token, sent_at)')
        .eq('company_id', currentCompany.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setEmployees(data || []);
    } catch (error) {
      console.error('Error fetching employees:', error);
      toast.error('Erreur lors du chargement des employés');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchEmployees();
  }, [currentCompany?.id]);

  const handleSubmit = async () => {
    if (!formData.first_name || !formData.last_name || !formData.email) {
      toast.error('Veuillez remplir les champs obligatoires');
      return;
    }

    if (!currentCompany?.id) {
      toast.error('Veuillez sélectionner une entreprise');
      return;
    }

    try {
      const employeeData = {
        first_name: formData.first_name,
        last_name: formData.last_name,
        email: formData.email,
        phone: formData.phone || null,
        position: formData.position || null,
        hourly_rate: formData.hourly_rate ? parseFloat(formData.hourly_rate) : null,
        contract_type: formData.contract_type || null,
        company_id: currentCompany.id,
      };

      if (editingEmployee) {
        const { error } = await supabase
          .from('employees')
          .update(employeeData)
          .eq('id', editingEmployee.id);

        if (error) throw error;
        toast.success('Employé modifié avec succès');
      } else {
        const { data, error } = await supabase
          .from('employees')
          .insert(employeeData)
          .select()
          .single();

        if (error) throw error;
        
        // Create invitation token in secure table
        const { error: invitationError } = await supabase
          .from('employee_invitations')
          .insert({
            employee_id: data.id,
            invitation_token: crypto.randomUUID(),
          });

        if (invitationError) {
          console.error('Error creating invitation:', invitationError);
        }
        
        // Create default schedule for new employee (Mon-Fri 9-17)
        const scheduleData = DAYS_OF_WEEK.map((day) => ({
          employee_id: data.id,
          day_of_week: day.value,
          start_time: day.value >= 1 && day.value <= 5 ? '09:00' : null,
          end_time: day.value >= 1 && day.value <= 5 ? '17:00' : null,
          is_working_day: day.value >= 1 && day.value <= 5,
        }));

        await supabase.from('employee_schedules').insert(scheduleData);
        
        toast.success('Employé créé avec succès');
      }

      setDialogOpen(false);
      resetForm();
      fetchEmployees();
    } catch (error: unknown) {
      console.error('Error saving employee:', error);
      const message = error instanceof Error ? error.message : 'Erreur lors de la sauvegarde';
      toast.error(message);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from('employees').delete().eq('id', id);
      if (error) throw error;
      toast.success('Employé supprimé');
      fetchEmployees();
    } catch (error) {
      console.error('Error deleting employee:', error);
      toast.error("Erreur lors de la suppression");
    }
  };

  const openEditDialog = (employee: Employee) => {
    setEditingEmployee(employee);
    setEditDialogOpen(true);
  };

  const openDetailDialog = (employee: Employee) => {
    setSelectedEmployee(employee);
    setDetailDialogOpen(true);
  };

  const resetForm = () => {
    setEditingEmployee(null);
    setFormData({
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      position: '',
      hourly_rate: '',
      contract_type: '',
    });
  };

  const filteredEmployees = employees.filter((e) => {
    const search = searchQuery.toLowerCase();
    return (
      e.first_name.toLowerCase().includes(search) ||
      e.last_name.toLowerCase().includes(search) ||
      e.email.toLowerCase().includes(search) ||
      (e.position?.toLowerCase() || '').includes(search)
    );
  });

  if (!currentCompany) {
    return (
      <MainLayout title="Employés">
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Veuillez sélectionner une entreprise</p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout title="Employés" subtitle="Gérez vos employés et leurs plannings">
      <div className="space-y-6">
        {/* Header Actions */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher un employé..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Ajouter un employé
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>
                  {editingEmployee ? 'Modifier l\'employé' : 'Nouvel employé'}
                </DialogTitle>
                <DialogDescription>
                  {editingEmployee 
                    ? 'Modifiez les informations de l\'employé'
                    : 'Ajoutez un nouvel employé à votre équipe'}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="first_name">Prénom *</Label>
                    <Input
                      id="first_name"
                      value={formData.first_name}
                      onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="last_name">Nom *</Label>
                    <Input
                      id="last_name"
                      value={formData.last_name}
                      onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Téléphone</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="position">Poste</Label>
                    <Input
                      id="position"
                      value={formData.position}
                      onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="hourly_rate">Taux horaire (€)</Label>
                    <Input
                      id="hourly_rate"
                      type="number"
                      step="0.01"
                      value={formData.hourly_rate}
                      onChange={(e) => setFormData({ ...formData, hourly_rate: e.target.value })}
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Annuler
                </Button>
                <Button onClick={handleSubmit}>
                  {editingEmployee ? 'Enregistrer' : 'Créer'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Employees Table */}
        <Card>
          <CardHeader>
            <CardTitle>Liste des employés</CardTitle>
            <CardDescription>
              {employees.length} employé{employees.length > 1 ? 's' : ''} enregistré{employees.length > 1 ? 's' : ''}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employé</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Poste</TableHead>
                    <TableHead>Contrat</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEmployees.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        Aucun employé trouvé
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredEmployees.map((employee) => (
                      <TableRow key={employee.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-9 w-9">
                              <AvatarImage src={employee.avatar_url || undefined} alt={`${employee.first_name} ${employee.last_name}`} />
                              <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
                                {employee.first_name[0]}{employee.last_name[0]}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">{employee.first_name} {employee.last_name}</p>
                              {employee.phone && (
                                <p className="text-xs text-muted-foreground">{employee.phone}</p>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{employee.email}</TableCell>
                        <TableCell>{employee.position || '-'}</TableCell>
                        <TableCell>{getContractTypeBadge(employee.contract_type)}</TableCell>
                        <TableCell>{getStatusBadge(employee.status, !!employee.user_id)}</TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openDetailDialog(employee)}
                              title="Documents"
                            >
                              <FileText className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEditDialog(employee)}
                              title="Modifier"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Supprimer l'employé ?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Cette action est irréversible. Toutes les données associées seront supprimées.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Annuler</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDelete(employee.id)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    Supprimer
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Edit Employee Dialog */}
      <EmployeeEditDialog
        employee={editingEmployee}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onUpdate={fetchEmployees}
      />

      {/* Employee Detail Dialog */}
      <EmployeeDetailDialog
        employee={selectedEmployee}
        open={detailDialogOpen}
        onOpenChange={setDetailDialogOpen}
        onUpdate={fetchEmployees}
      />
    </MainLayout>
  );
}
