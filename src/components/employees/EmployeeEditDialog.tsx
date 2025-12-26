import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Loader2, User, Briefcase, Clock, Mail, KeyRound } from 'lucide-react';
import { DateInput } from '@/components/ui/date-input';

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
  invitation_token: string | null;
  salary_type: string | null;
}

interface Schedule {
  id?: string;
  day_of_week: number;
  is_working_day: boolean;
  start_time: string | null;
  end_time: string | null;
}

interface EmployeeEditDialogProps {
  employee: Employee | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: () => void;
}

const CONTRACT_TYPES = [
  { value: 'cdi', label: 'CDI' },
  { value: 'cdd', label: 'CDD' },
  { value: 'alternance', label: 'Alternance' },
  { value: 'stage', label: 'Stage' },
  { value: 'freelance', label: 'Freelance' },
  { value: 'interim', label: 'Intérim' },
  { value: 'other', label: 'Autre' },
];

const DAYS_OF_WEEK = [
  { value: 1, label: 'Lundi' },
  { value: 2, label: 'Mardi' },
  { value: 3, label: 'Mercredi' },
  { value: 4, label: 'Jeudi' },
  { value: 5, label: 'Vendredi' },
  { value: 6, label: 'Samedi' },
  { value: 0, label: 'Dimanche' },
];

export function EmployeeEditDialog({
  employee,
  open,
  onOpenChange,
  onUpdate,
}: EmployeeEditDialogProps) {
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [resettingPassword, setResettingPassword] = useState(false);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loadingSchedules, setLoadingSchedules] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    position: '',
  });
  
  // Contract state
  const [contractType, setContractType] = useState('');
  const [salaryType, setSalaryType] = useState('fixed');
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [contractHours, setContractHours] = useState('');
  const [grossSalary, setGrossSalary] = useState('');

  useEffect(() => {
    if (employee) {
      setFormData({
        first_name: employee.first_name,
        last_name: employee.last_name,
        email: employee.email,
        phone: employee.phone || '',
        position: employee.position || '',
      });
      setContractType(employee.contract_type || '');
      setSalaryType(employee.salary_type || 'fixed');
      setStartDate(employee.contract_start_date ? new Date(employee.contract_start_date) : undefined);
      setEndDate(employee.contract_end_date ? new Date(employee.contract_end_date) : undefined);
      setContractHours(employee.contract_hours?.toString() || '');
      setGrossSalary(employee.gross_salary?.toString() || '');
      fetchSchedules();
    }
  }, [employee]);

  const fetchSchedules = async () => {
    if (!employee) return;
    setLoadingSchedules(true);
    try {
      const { data, error } = await supabase
        .from('employee_schedules')
        .select('*')
        .eq('employee_id', employee.id)
        .order('day_of_week');

      if (error) throw error;

      // Initialize all days
      const allDays = DAYS_OF_WEEK.map((day) => {
        const existing = data?.find((s) => s.day_of_week === day.value);
        return existing || {
          day_of_week: day.value,
          is_working_day: day.value >= 1 && day.value <= 5,
          start_time: day.value >= 1 && day.value <= 5 ? '09:00' : null,
          end_time: day.value >= 1 && day.value <= 5 ? '18:00' : null,
        };
      });
      setSchedules(allDays);
    } catch (error) {
      console.error('Error fetching schedules:', error);
    } finally {
      setLoadingSchedules(false);
    }
  };

  const handleSaveInfo = async () => {
    if (!employee) return;
    if (!formData.first_name || !formData.last_name || !formData.email) {
      toast.error('Veuillez remplir les champs obligatoires');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('employees')
        .update({
          first_name: formData.first_name,
          last_name: formData.last_name,
          email: formData.email,
          phone: formData.phone || null,
          position: formData.position || null,
        })
        .eq('id', employee.id);

      if (error) throw error;
      toast.success('Informations mises à jour');
      onUpdate();
    } catch (error) {
      console.error('Error updating employee:', error);
      toast.error('Erreur lors de la mise à jour');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveContract = async () => {
    if (!employee) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('employees')
        .update({
          contract_type: contractType || null,
          salary_type: salaryType || 'fixed',
          contract_start_date: startDate ? format(startDate, 'yyyy-MM-dd') : null,
          contract_end_date: endDate ? format(endDate, 'yyyy-MM-dd') : null,
          contract_hours: contractHours ? parseFloat(contractHours) : null,
          gross_salary: grossSalary ? parseFloat(grossSalary) : null,
        })
        .eq('id', employee.id);

      if (error) throw error;
      toast.success('Contrat mis à jour');
      onUpdate();
    } catch (error) {
      console.error('Error updating contract:', error);
      toast.error('Erreur lors de la mise à jour');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSchedules = async () => {
    if (!employee) return;

    setLoading(true);
    try {
      // Delete existing schedules
      await supabase
        .from('employee_schedules')
        .delete()
        .eq('employee_id', employee.id);

      // Insert new schedules
      const { error } = await supabase
        .from('employee_schedules')
        .insert(
          schedules.map((s) => ({
            employee_id: employee.id,
            day_of_week: s.day_of_week,
            is_working_day: s.is_working_day,
            start_time: s.start_time,
            end_time: s.end_time,
          }))
        );

      if (error) throw error;
      toast.success('Planning mis à jour');
    } catch (error) {
      console.error('Error saving schedules:', error);
      toast.error('Erreur lors de la sauvegarde');
    } finally {
      setLoading(false);
    }
  };

  const handleSendInvitation = async () => {
    if (!employee) return;

    // Ensure we have a valid invitation token from the database
    if (!employee.invitation_token) {
      toast.error("Aucun token d'invitation trouvé. Veuillez contacter l'administrateur.");
      return;
    }

    setSending(true);
    try {
      const { error } = await supabase.functions.invoke('send-email', {
        body: {
          type: 'invitation',
          recipientEmail: employee.email,
          recipientName: `${employee.first_name} ${employee.last_name}`,
          data: {
            invitationToken: employee.invitation_token, // Use existing token from DB
            email: employee.email,
          },
        },
      });

      if (error) throw error;

      await supabase
        .from('employees')
        .update({ invitation_sent_at: new Date().toISOString() })
        .eq('id', employee.id);

      toast.success(`Invitation envoyée à ${employee.email}`);
      onUpdate();
    } catch (error) {
      console.error('Error sending invitation:', error);
      toast.error("Erreur lors de l'envoi de l'invitation");
    } finally {
      setSending(false);
    }
  };

  const handleResetPassword = async () => {
    if (!employee) return;

    setResettingPassword(true);
    try {
      const { data, error } = await supabase.functions.invoke('reset-password', {
        body: {
          employeeId: employee.id,
          employeeEmail: employee.email,
          employeeName: `${employee.first_name} ${employee.last_name}`,
        },
      });

      if (error) throw error;

      if (data.error) {
        toast.error(data.error);
        return;
      }

      toast.success(`Email de réinitialisation envoyé à ${employee.email}`);
    } catch (error) {
      console.error('Error resetting password:', error);
      toast.error('Erreur lors de l\'envoi de l\'email de réinitialisation');
    } finally {
      setResettingPassword(false);
    }
  };

  const updateSchedule = (dayValue: number, field: keyof Schedule, value: string | boolean) => {
    setSchedules((prev) =>
      prev.map((s) =>
        s.day_of_week === dayValue ? { ...s, [field]: value } : s
      )
    );
  };

  if (!employee) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="font-medium text-primary">
                {employee.first_name[0]}{employee.last_name[0]}
              </span>
            </div>
            <div>
              <span>{employee.first_name} {employee.last_name}</span>
              <p className="text-sm font-normal text-muted-foreground">{employee.email}</p>
            </div>
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="info" className="mt-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="info" className="gap-2">
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">Infos</span>
            </TabsTrigger>
            <TabsTrigger value="contract" className="gap-2">
              <Briefcase className="h-4 w-4" />
              <span className="hidden sm:inline">Contrat</span>
            </TabsTrigger>
            <TabsTrigger value="schedule" className="gap-2">
              <Clock className="h-4 w-4" />
              <span className="hidden sm:inline">Planning</span>
            </TabsTrigger>
            <TabsTrigger value="invitation" className="gap-2">
              <Mail className="h-4 w-4" />
              <span className="hidden sm:inline">Invitation</span>
            </TabsTrigger>
          </TabsList>

          {/* Info Tab */}
          <TabsContent value="info" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Informations personnelles</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Prénom *</Label>
                    <Input
                      value={formData.first_name}
                      onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Nom *</Label>
                    <Input
                      value={formData.last_name}
                      onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Email *</Label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Téléphone</Label>
                  <Input
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Poste</Label>
                  <Input
                    value={formData.position}
                    onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                  />
                </div>
                <Button onClick={handleSaveInfo} disabled={loading} className="w-full">
                  {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Enregistrer
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Contract Tab */}
          <TabsContent value="contract" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Informations du contrat</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Type de contrat</Label>
                  <Select value={contractType} onValueChange={setContractType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner le type" />
                    </SelectTrigger>
                    <SelectContent>
                      {CONTRACT_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Type de rémunération</Label>
                  <Select value={salaryType} onValueChange={setSalaryType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner le type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fixed">Salaire fixe</SelectItem>
                      <SelectItem value="commission">Avec commission</SelectItem>
                      <SelectItem value="hourly">À l'heure</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Date d'entrée</Label>
                    <DateInput
                      value={startDate}
                      onChange={setStartDate}
                      placeholder="JJ/MM/AAAA"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Date de sortie</Label>
                    <DateInput
                      value={endDate}
                      onChange={setEndDate}
                      placeholder="JJ/MM/AAAA"
                      minDate={startDate}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Heures hebdomadaires</Label>
                    <Input
                      type="number"
                      value={contractHours}
                      onChange={(e) => setContractHours(e.target.value)}
                      placeholder="35"
                      min="0"
                      step="0.5"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Salaire brut mensuel (€)</Label>
                    <Input
                      type="number"
                      value={grossSalary}
                      onChange={(e) => setGrossSalary(e.target.value)}
                      placeholder="2500"
                      min="0"
                      step="0.01"
                    />
                  </div>
                </div>
                <Button onClick={handleSaveContract} disabled={loading} className="w-full">
                  {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Enregistrer
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Schedule Tab */}
          <TabsContent value="schedule" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Planning hebdomadaire</CardTitle>
                <CardDescription>Définissez les horaires de travail</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {loadingSchedules ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : (
                  <>
                    {DAYS_OF_WEEK.map((day) => {
                      const schedule = schedules.find((s) => s.day_of_week === day.value);
                      return (
                        <div key={day.value} className="flex items-center gap-4 py-2 border-b last:border-0">
                          <div className="w-24 font-medium">{day.label}</div>
                          <Switch
                            checked={schedule?.is_working_day || false}
                            onCheckedChange={(checked) => updateSchedule(day.value, 'is_working_day', checked)}
                          />
                          {schedule?.is_working_day && (
                            <>
                              <Input
                                type="time"
                                value={schedule.start_time || '09:00'}
                                onChange={(e) => updateSchedule(day.value, 'start_time', e.target.value)}
                                className="w-28"
                              />
                              <span>à</span>
                              <Input
                                type="time"
                                value={schedule.end_time || '18:00'}
                                onChange={(e) => updateSchedule(day.value, 'end_time', e.target.value)}
                                className="w-28"
                              />
                            </>
                          )}
                        </div>
                      );
                    })}
                    <Button onClick={handleSaveSchedules} disabled={loading} className="w-full mt-4">
                      {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      Enregistrer le planning
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Invitation Tab */}
          <TabsContent value="invitation" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Accès au compte</CardTitle>
                <CardDescription>
                  Gérez l'accès de l'employé à son espace personnel
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm">
                    <strong>Email:</strong> {employee.email}
                  </p>
                  <p className="text-sm mt-2">
                    <strong>Statut:</strong>{' '}
                    {employee.status === 'active' ? (
                      <span className="text-green-600 font-medium">Compte actif</span>
                    ) : (
                      <span className="text-amber-600 font-medium">En attente d'activation</span>
                    )}
                  </p>
                  <p className="text-sm mt-2">
                    <strong>Dernière invitation:</strong>{' '}
                    {employee.invitation_sent_at
                      ? format(new Date(employee.invitation_sent_at), 'dd/MM/yyyy à HH:mm')
                      : 'Jamais envoyée'}
                  </p>
                </div>

                {employee.status !== 'active' && (
                  <Button onClick={handleSendInvitation} disabled={sending} className="w-full">
                    {sending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    <Mail className="h-4 w-4 mr-2" />
                    Envoyer l'invitation
                  </Button>
                )}

                <div className="pt-2 border-t">
                  <p className="text-sm text-muted-foreground mb-3">
                    Réinitialiser le mot de passe de l'employé
                  </p>
                  <Button 
                    onClick={handleResetPassword} 
                    disabled={resettingPassword} 
                    variant="outline" 
                    className="w-full"
                  >
                    {resettingPassword && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    <KeyRound className="h-4 w-4 mr-2" />
                    Envoyer un email de réinitialisation
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
