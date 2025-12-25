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
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [settings, setSettings] = useState<AccountantSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const [formData, setFormData] = useState({
    employee_id: '',
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    amount: '',
    description: '',
  });

  const [settingsForm, setSettingsForm] = useState({
    email: '',
    send_commissions_monthly: true,
    notify_on_new_commission: false,
  });

  const fetchData = async () => {
    try {
      const [commissionsRes, employeesRes, settingsRes] = await Promise.all([
        supabase
          .from('commissions')
          .select('*, employee:employees(id, first_name, last_name, email)')
          .order('year', { ascending: false })
          .order('month', { ascending: false }),
        supabase
          .from('employees')
          .select('id, first_name, last_name, email, status')
          .eq('status', 'active'),
        supabase.from('accountant_settings').select('*').limit(1).single(),
      ]);

      if (commissionsRes.error && commissionsRes.error.code !== 'PGRST116') throw commissionsRes.error;
      if (employeesRes.error) throw employeesRes.error;

      setCommissions(commissionsRes.data || []);
      setEmployees(employeesRes.data || []);

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
    fetchData();
  }, []);

  const handleSubmit = async () => {
    if (!formData.employee_id || !formData.amount) {
      toast.error('Veuillez remplir tous les champs obligatoires');
      return;
    }

    try {
      const { error } = await supabase.from('commissions').upsert(
        {
          employee_id: formData.employee_id,
          month: formData.month,
          year: formData.year,
          amount: parseFloat(formData.amount),
          description: formData.description || null,
          status: 'pending',
        },
        {
          onConflict: 'employee_id,month,year',
        }
      );

      if (error) throw error;

      toast.success('Commission enregistrée');
      setDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      console.error('Error saving commission:', error);
      toast.error("Erreur lors de l'enregistrement");
    }
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

  const resetForm = () => {
    setFormData({
      employee_id: '',
      month: new Date().getMonth() + 1,
      year: new Date().getFullYear(),
      amount: '',
      description: '',
    });
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
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajouter une commission</DialogTitle>
            <DialogDescription>
              Enregistrez une commission pour un employé
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Employé *</Label>
              <Select
                value={formData.employee_id}
                onValueChange={(value) => setFormData({ ...formData, employee_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un employé" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.first_name} {emp.last_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Mois</Label>
                <Select
                  value={formData.month.toString()}
                  onValueChange={(v) => setFormData({ ...formData, month: parseInt(v) })}
                >
                  <SelectTrigger>
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
              </div>
              <div className="space-y-2">
                <Label>Année</Label>
                <Select
                  value={formData.year.toString()}
                  onValueChange={(v) => setFormData({ ...formData, year: parseInt(v) })}
                >
                  <SelectTrigger>
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
            </div>
            <div className="space-y-2">
              <Label>Montant (€) *</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Description optionnelle..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleSubmit}>Enregistrer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Accountant Settings Dialog */}
      <Dialog open={settingsDialogOpen} onOpenChange={setSettingsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Paramètres comptable</DialogTitle>
            <DialogDescription>
              Configurez les paramètres d'envoi au comptable
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Email du comptable</Label>
              <Input
                type="email"
                value={settingsForm.email}
                onChange={(e) => setSettingsForm({ ...settingsForm, email: e.target.value })}
                placeholder="comptable@exemple.fr"
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
