import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2, Plus, Euro, TrendingUp, Users, Pencil, Trash2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useCompany } from '@/contexts/CompanyContext';
import { AddCommissionDialog } from '@/components/commissions/AddCommissionDialog';
import { formatEmployeeName, getEmployeeInitials } from '@/lib/utils';

interface Commission {
  id: string;
  employee_id: string;
  month: number;
  year: number;
  amount: number;
  description: string | null;
  status: string;
  created_at: string;
  employee?: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
  };
}

interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  status: string;
  salary_type: string | null;
}

const MONTHS = [
  { value: 1, label: 'Janvier' },
  { value: 2, label: 'Février' },
  { value: 3, label: 'Mars' },
  { value: 4, label: 'Avril' },
  { value: 5, label: 'Mai' },
  { value: 6, label: 'Juin' },
  { value: 7, label: 'Juillet' },
  { value: 8, label: 'Août' },
  { value: 9, label: 'Septembre' },
  { value: 10, label: 'Octobre' },
  { value: 11, label: 'Novembre' },
  { value: 12, label: 'Décembre' },
];

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'approved':
      return <Badge className="bg-green-100 text-green-800">Validé</Badge>;
    case 'pending':
      return <Badge variant="outline" className="border-yellow-500 text-yellow-700">En attente</Badge>;
    case 'sent':
      return <Badge className="bg-blue-100 text-blue-800">Envoyé</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
};

export default function CommissionsPage() {
  const { currentCompany, companySettings } = useCompany();
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCommission, setEditingCommission] = useState<Commission | null>(null);
  const [deletingCommissionId, setDeletingCommissionId] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const fetchData = async () => {
    if (!currentCompany?.id) {
      setCommissions([]);
      setEmployees([]);
      setLoading(false);
      return;
    }

    try {
      // Fetch employees for this company
      const { data: employeesData, error: employeesError } = await supabase
        .from('employees')
        .select('id, first_name, last_name, email, status, salary_type')
        .eq('company_id', currentCompany.id)
        .eq('status', 'active');

      if (employeesError) throw employeesError;
      setEmployees(employeesData || []);

      const employeeIds = employeesData?.map(e => e.id) || [];

      if (employeeIds.length === 0) {
        setCommissions([]);
        setLoading(false);
        return;
      }

      const { data: commissionsData, error: commissionsError } = await supabase
        .from('commissions')
        .select('*, employee:employees(id, first_name, last_name, email)')
        .in('employee_id', employeeIds)
        .order('year', { ascending: false })
        .order('month', { ascending: false });

      if (commissionsError) throw commissionsError;
      setCommissions(commissionsData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchData();
  }, [currentCompany?.id]);

  const handleDialogSuccess = () => {
    fetchData();
    setEditingCommission(null);
  };

  const handleEdit = (commission: Commission) => {
    setEditingCommission(commission);
    setDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!deletingCommissionId) return;
    try {
      const { error } = await supabase
        .from('commissions')
        .delete()
        .eq('id', deletingCommissionId);
      if (error) throw error;
      toast.success('Commission supprimée');
      fetchData();
    } catch (error) {
      console.error('Error deleting commission:', error);
      toast.error('Erreur lors de la suppression');
    } finally {
      setDeletingCommissionId(null);
    }
  };

  const filteredCommissions = commissions.filter(
    (c) => c.month === selectedMonth && c.year === selectedYear
  );

  const totalCommissions = filteredCommissions.reduce(
    (sum, c) => sum + Number(c.amount),
    0
  );

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

  if (!currentCompany) {
    return (
      <MainLayout title="Commissions">
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Veuillez sélectionner une entreprise</p>
        </div>
      </MainLayout>
    );
  }

  if (loading) {
    return (
      <MainLayout title="Commissions">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout title="Commissions" subtitle="Gérez les commissions des employés">
      <div className="space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-primary/10">
                  <Euro className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{totalCommissions.toFixed(2)}€</p>
                  <p className="text-sm text-muted-foreground">
                    Total {MONTHS.find((m) => m.value === selectedMonth)?.label}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-accent/10">
                  <Users className="h-6 w-6 text-accent" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{filteredCommissions.length}</p>
                  <p className="text-sm text-muted-foreground">Employés avec commission</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-green-500/10">
                  <TrendingUp className="h-6 w-6 text-green-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {filteredCommissions.filter((c) => c.status === 'sent').length}
                  </p>
                  <p className="text-sm text-muted-foreground">Envoyées au comptable</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Actions & Filters */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between">
          <div className="flex gap-2">
            <Select
              value={selectedMonth.toString()}
              onValueChange={(v) => setSelectedMonth(parseInt(v))}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MONTHS.map((m) => (
                  <SelectItem key={m.value} value={m.value.toString()}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={selectedYear.toString()}
              onValueChange={(v) => setSelectedYear(parseInt(v))}
            >
              <SelectTrigger className="w-[100px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {years.map((y) => (
                  <SelectItem key={y} value={y.toString()}>
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={() => { setEditingCommission(null); setDialogOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" />
            Ajouter une commission
          </Button>
        </div>

        {/* Commissions Table */}
        <Card>
          <CardHeader>
            <CardTitle>
              Commissions - {MONTHS.find((m) => m.value === selectedMonth)?.label} {selectedYear}
            </CardTitle>
            <CardDescription>
              {filteredCommissions.length} commission{filteredCommissions.length > 1 ? 's' : ''} enregistrée{filteredCommissions.length > 1 ? 's' : ''}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employé</TableHead>
                  <TableHead>Montant</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCommissions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      Aucune commission pour cette période
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredCommissions.map((commission) => (
                    <TableRow key={commission.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
                            <span className="text-sm font-medium text-primary">
                              {commission.employee ? getEmployeeInitials(commission.employee.first_name, commission.employee.last_name, companySettings?.employee_sort_order || 'first_name') : ''}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium">
                              {commission.employee ? formatEmployeeName(commission.employee.first_name, commission.employee.last_name, companySettings?.employee_sort_order || 'first_name') : ''}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {commission.employee?.email}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="font-semibold text-primary">
                        {Number(commission.amount).toFixed(2)}€
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {commission.description || '-'}
                      </TableCell>
                      <TableCell>{getStatusBadge(commission.status)}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(commission.created_at), 'dd/MM/yyyy', { locale: fr })}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            disabled={commission.status === 'sent'}
                            onClick={() => handleEdit(commission)}
                            title="Modifier"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            disabled={commission.status === 'sent'}
                            onClick={() => setDeletingCommissionId(commission.id)}
                            title="Supprimer"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Add/Edit Commission Dialog */}
      <AddCommissionDialog
        open={dialogOpen}
        onOpenChange={(open) => { setDialogOpen(open); if (!open) setEditingCommission(null); }}
        employees={employees}
        onSuccess={handleDialogSuccess}
        editCommission={editingCommission}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingCommissionId} onOpenChange={(open) => { if (!open) setDeletingCommissionId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette commission ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. La commission sera définitivement supprimée.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MainLayout>
  );
}
