import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2, Plus, Send, Euro, TrendingUp, Users } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useCompany } from '@/contexts/CompanyContext';
import { AddCommissionDialog } from '@/components/commissions/AddCommissionDialog';

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

interface AccountantSettings {
  id: string;
  email: string | null;
  send_commissions_monthly: boolean;
  notify_on_new_commission: boolean;
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
  const { currentCompany } = useCompany();
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [settings, setSettings] = useState<AccountantSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const [settingsForm, setSettingsForm] = useState({
    email: '',
    send_commissions_monthly: true,
    notify_on_new_commission: false,
  });

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

      const [commissionsRes, settingsRes] = await Promise.all([
        supabase
          .from('commissions')
          .select('*, employee:employees(id, first_name, last_name, email)')
          .in('employee_id', employeeIds)
          .order('year', { ascending: false })
          .order('month', { ascending: false }),
        supabase.from('accountant_settings').select('*').limit(1).maybeSingle(),
      ]);

      if (commissionsRes.error) throw commissionsRes.error;

      setCommissions(commissionsRes.data || []);

      if (settingsRes.data) {
        setSettings(settingsRes.data);
        setSettingsForm({
          email: settingsRes.data.email || '',
          send_commissions_monthly: settingsRes.data.send_commissions_monthly,
          notify_on_new_commission: settingsRes.data.notify_on_new_commission,
        });
      }
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
  };

  const handleSaveSettings = async () => {
    try {
      if (settings?.id) {
        const { error } = await supabase
          .from('accountant_settings')
          .update(settingsForm)
          .eq('id', settings.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('accountant_settings').insert(settingsForm);
        if (error) throw error;
      }

      toast.success('Paramètres enregistrés');
      setSettingsDialogOpen(false);
      fetchData();
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error("Erreur lors de l'enregistrement");
    }
  };

  const handleSendToAccountant = async () => {
    if (!settings?.email) {
      toast.error("Veuillez configurer l'email du comptable");
      setSettingsDialogOpen(true);
      return;
    }

    const monthCommissions = filteredCommissions.filter((c) => c.status !== 'sent');
    if (monthCommissions.length === 0) {
      toast.info('Aucune commission à envoyer');
      return;
    }

    try {
      // Build email content
      const commissionsList = monthCommissions
        .map((c) => `${c.employee?.first_name} ${c.employee?.last_name}: ${c.amount}€`)
        .join('\n');

      const totalAmount = monthCommissions.reduce((sum, c) => sum + Number(c.amount), 0);

      const { error } = await supabase.functions.invoke('send-email', {
        body: {
          type: 'commissions',
          recipientEmail: settings.email,
          recipientName: 'Comptable',
          data: {
            month: MONTHS.find((m) => m.value === selectedMonth)?.label,
            year: selectedYear,
            commissions: commissionsList,
            total: totalAmount,
          },
        },
      });

      if (error) throw error;

      // Update commission statuses
      const ids = monthCommissions.map((c) => c.id);
      await supabase.from('commissions').update({ status: 'sent' }).in('id', ids);

      toast.success('Commissions envoyées au comptable');
      fetchData();
    } catch (error) {
      console.error('Error sending commissions:', error);
      toast.error("Erreur lors de l'envoi");
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
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setSettingsDialogOpen(true)}>
              Paramètres comptable
            </Button>
            <Button variant="outline" onClick={handleSendToAccountant}>
              <Send className="h-4 w-4 mr-2" />
              Envoyer au comptable
            </Button>
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Ajouter une commission
            </Button>
          </div>
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
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCommissions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
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
                              {commission.employee?.first_name[0]}
                              {commission.employee?.last_name[0]}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium">
                              {commission.employee?.first_name} {commission.employee?.last_name}
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
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Add Commission Dialog */}
      <AddCommissionDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        employees={employees}
        onSuccess={handleDialogSuccess}
      />

      {/* Settings Dialog */}
      <Dialog open={settingsDialogOpen} onOpenChange={setSettingsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Paramètres comptable</DialogTitle>
            <DialogDescription>
              Configurez les options d'envoi des commissions
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Email du comptable</Label>
              <Input
                type="email"
                value={settingsForm.email}
                onChange={(e) => setSettingsForm({ ...settingsForm, email: e.target.value })}
                placeholder="comptable@exemple.com"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSettingsDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleSaveSettings}>Enregistrer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
