import { useState, useEffect } from 'react';
import { Plus, Pencil } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { CalendarIcon, Check, X, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TimeOffEditDialog } from '@/components/time-off/TimeOffEditDialog';
import { LeaveBalanceCard } from '@/components/time-off/LeaveBalanceCard';
import { LeaveEstimation } from '@/components/time-off/LeaveEstimation';
import { useLeaveBalances } from '@/hooks/useLeaveBalances';
import { calculateWorkingDays, LEAVE_TYPE_LABELS } from '@/lib/leave-calculator';

interface TimeOffRequest {
  id: string;
  employee_id: string;
  start_date: string;
  end_date: string;
  type: string;
  reason: string | null;
  status: string;
  created_at: string;
  employee?: {
    first_name: string;
    last_name: string;
    email: string;
  };
}

const typeLabels: Record<string, string> = {
  vacation: 'Congés payés',
  conge_paye: 'Congés payés',
  sick: 'Maladie',
  maladie: 'Maladie',
  personal: 'Personnel',
  rtt: 'RTT',
  sans_solde: 'Sans solde',
  other: 'Autre',
  autre: 'Autre',
};

const statusBadge = (status: string) => {
  switch (status) {
    case 'approved':
      return <Badge className="bg-green-100 text-green-800">Approuvé</Badge>;
    case 'rejected':
      return <Badge variant="destructive">Refusé</Badge>;
    case 'pending':
      return <Badge variant="outline" className="border-yellow-500 text-yellow-700">En attente</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
};

const TimeOff = () => {
  const { role, user } = useAuth();
  const [requests, setRequests] = useState<TimeOffRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [employees, setEmployees] = useState<Array<{ id: string; first_name: string; last_name: string }>>([]);
  const [currentEmployeeId, setCurrentEmployeeId] = useState<string | null>(null);
  const [editingRequest, setEditingRequest] = useState<TimeOffRequest | null>(null);

  const { updateBalance, refetch: refetchBalances } = useLeaveBalances(currentEmployeeId || undefined);

  // Form state
  const [formData, setFormData] = useState({
    type: 'conge_paye',
    startDate: undefined as Date | undefined,
    endDate: undefined as Date | undefined,
    reason: '',
    employeeId: '',
  });

  const isManagerOrAdmin = role === 'manager' || role === 'admin';
  const canCreateRequest = isManagerOrAdmin || currentEmployeeId;

  const selectedEmployeeId = isManagerOrAdmin 
    ? (formData.employeeId || currentEmployeeId) 
    : currentEmployeeId;

  const fetchData = async () => {
    try {
      const { data: empData } = await supabase
        .from('employees')
        .select('id, first_name, last_name, user_id');
      
      setEmployees(empData || []);
      
      const currentEmp = empData?.find((e) => e.user_id === user?.id);
      setCurrentEmployeeId(currentEmp?.id || null);

      const { data, error } = await supabase
        .from('time_off_requests')
        .select(`
          *,
          employee:employees!time_off_requests_employee_id_fkey(first_name, last_name, email)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRequests(data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user?.id]);

  const handleSubmit = async () => {
    const targetEmployeeId = isManagerOrAdmin 
      ? (formData.employeeId || currentEmployeeId) 
      : currentEmployeeId;
    
    if (!formData.startDate || !formData.endDate) {
      toast.error('Veuillez sélectionner les dates');
      return;
    }
    
    if (!targetEmployeeId) {
      toast.error('Veuillez sélectionner un employé');
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.from('time_off_requests').insert({
        employee_id: targetEmployeeId,
        start_date: format(formData.startDate, 'yyyy-MM-dd'),
        end_date: format(formData.endDate, 'yyyy-MM-dd'),
        type: formData.type,
        reason: formData.reason || null,
      });

      if (error) throw error;

      toast.success('Demande soumise avec succès');
      setIsFormOpen(false);
      setFormData({ type: 'conge_paye', startDate: undefined, endDate: undefined, reason: '', employeeId: '' });
      fetchData();
    } catch (error) {
      console.error('Error submitting request:', error);
      toast.error('Erreur lors de la soumission');
    } finally {
      setSubmitting(false);
    }
  };

  const handleApprove = async (request: TimeOffRequest) => {
    try {
      const { error } = await supabase
        .from('time_off_requests')
        .update({ status: 'approved', reviewed_at: new Date().toISOString() })
        .eq('id', request.id);

      if (error) throw error;

      // Calculate working days and update balance
      const daysUsed = calculateWorkingDays(
        new Date(request.start_date),
        new Date(request.end_date),
        'full_day'
      );

      try {
        await updateBalance(request.employee_id, request.type, daysUsed, 'add');
      } catch (balanceError) {
        console.error('Error updating balance:', balanceError);
        // Don't fail the approval if balance update fails
      }

      // Send notification email
      if (request.employee?.email) {
        await supabase.functions.invoke('send-email', {
          body: {
            type: 'time_off',
            recipientEmail: request.employee.email,
            recipientName: `${request.employee.first_name} ${request.employee.last_name}`,
            data: {
              status: 'approved',
              startDate: request.start_date,
              endDate: request.end_date,
            },
          },
        });
      }

      toast.success('Demande approuvée');
      fetchData();
      refetchBalances();
    } catch (error) {
      console.error('Error approving request:', error);
      toast.error('Erreur lors de l\'approbation');
    }
  };

  const handleReject = async (request: TimeOffRequest) => {
    try {
      const { error } = await supabase
        .from('time_off_requests')
        .update({ status: 'rejected', reviewed_at: new Date().toISOString() })
        .eq('id', request.id);

      if (error) throw error;

      // Send notification email
      if (request.employee?.email) {
        await supabase.functions.invoke('send-email', {
          body: {
            type: 'time_off',
            recipientEmail: request.employee.email,
            recipientName: `${request.employee.first_name} ${request.employee.last_name}`,
            data: {
              status: 'rejected',
              startDate: request.start_date,
              endDate: request.end_date,
            },
          },
        });
      }

      toast.success('Demande refusée');
      fetchData();
    } catch (error) {
      console.error('Error rejecting request:', error);
      toast.error('Erreur lors du refus');
    }
  };

  const pendingRequests = requests.filter((r) => r.status === 'pending');
  const filteredRequests = statusFilter === 'all' 
    ? requests 
    : requests.filter((r) => r.status === statusFilter);

  return (
    <MainLayout
      title="Congés & Absences"
      subtitle={`${pendingRequests.length} demande(s) en attente`}
    >
      <div className="space-y-6">
        {/* Leave Balance Card for current employee */}
        {currentEmployeeId && (
          <LeaveBalanceCard employeeId={currentEmployeeId} />
        )}

        <Tabs defaultValue={isManagerOrAdmin ? 'pending' : 'all'}>
          <div className="flex flex-col sm:flex-row justify-between gap-4 mb-4">
            <TabsList>
              {isManagerOrAdmin && (
                <TabsTrigger value="pending" className="gap-2">
                  En attente
                  {pendingRequests.length > 0 && (
                    <span className="ml-1 px-1.5 py-0.5 text-xs bg-destructive text-destructive-foreground rounded-full">
                      {pendingRequests.length}
                    </span>
                  )}
                </TabsTrigger>
              )}
              <TabsTrigger value="all">Toutes les demandes</TabsTrigger>
            </TabsList>

            <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
              <DialogTrigger asChild>
                <Button disabled={!canCreateRequest}>
                  <Plus className="w-4 h-4 mr-2" />
                  Nouvelle demande
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[550px]">
                <DialogHeader>
                  <DialogTitle>Nouvelle demande de congé</DialogTitle>
                  <DialogDescription>
                    Remplissez le formulaire pour soumettre votre demande
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  {isManagerOrAdmin && (
                    <div className="space-y-2">
                      <Label>Employé</Label>
                      <Select 
                        value={formData.employeeId || currentEmployeeId || ''} 
                        onValueChange={(v) => setFormData({ ...formData, employeeId: v })}
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
                  )}
                  <div className="space-y-2">
                    <Label>Type de congé</Label>
                    <Select value={formData.type} onValueChange={(v) => setFormData({ ...formData, type: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="conge_paye">Congés payés</SelectItem>
                        <SelectItem value="rtt">RTT</SelectItem>
                        <SelectItem value="maladie">Maladie</SelectItem>
                        <SelectItem value="sans_solde">Sans solde</SelectItem>
                        <SelectItem value="autre">Autre</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Date de début</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              'w-full justify-start text-left font-normal',
                              !formData.startDate && 'text-muted-foreground'
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {formData.startDate ? format(formData.startDate, 'dd/MM/yyyy') : 'Sélectionner'}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={formData.startDate}
                            onSelect={(date) => setFormData({ ...formData, startDate: date })}
                            locale={fr}
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div className="space-y-2">
                      <Label>Date de fin</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              'w-full justify-start text-left font-normal',
                              !formData.endDate && 'text-muted-foreground'
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {formData.endDate ? format(formData.endDate, 'dd/MM/yyyy') : 'Sélectionner'}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={formData.endDate}
                            onSelect={(date) => setFormData({ ...formData, endDate: date })}
                            locale={fr}
                            disabled={(date) => formData.startDate ? date < formData.startDate : false}
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Motif (optionnel)</Label>
                    <Textarea
                      value={formData.reason}
                      onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                      placeholder="Précisez le motif de votre demande..."
                    />
                  </div>

                  {/* Leave Estimation */}
                  {selectedEmployeeId && (
                    <LeaveEstimation
                      employeeId={selectedEmployeeId}
                      startDate={formData.startDate}
                      endDate={formData.endDate}
                      leaveType={formData.type}
                      partOfDay="full_day"
                    />
                  )}
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsFormOpen(false)}>
                    Annuler
                  </Button>
                  <Button onClick={handleSubmit} disabled={submitting}>
                    {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Soumettre
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {isManagerOrAdmin && (
            <TabsContent value="pending">
              <Card>
                <CardHeader>
                  <CardTitle>Demandes en attente</CardTitle>
                  <CardDescription>Demandes nécessitant votre approbation</CardDescription>
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
                          <TableHead>Type</TableHead>
                          <TableHead>Dates</TableHead>
                          <TableHead>Motif</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {pendingRequests.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                              Aucune demande en attente
                            </TableCell>
                          </TableRow>
                        ) : (
                          pendingRequests.map((request) => (
                            <TableRow key={request.id}>
                              <TableCell>
                                <div>
                                  <p className="font-medium">
                                    {request.employee?.first_name} {request.employee?.last_name}
                                  </p>
                                  <p className="text-xs text-muted-foreground">{request.employee?.email}</p>
                                </div>
                              </TableCell>
                              <TableCell>{typeLabels[request.type] || request.type}</TableCell>
                              <TableCell>
                                {format(new Date(request.start_date), 'dd/MM/yyyy')} - {format(new Date(request.end_date), 'dd/MM/yyyy')}
                              </TableCell>
                              <TableCell className="max-w-[200px] truncate">
                                {request.reason || '-'}
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-2">
                                  <Button size="sm" variant="ghost" onClick={() => setEditingRequest(request)}>
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <Button size="sm" variant="outline" onClick={() => handleApprove(request)}>
                                    <Check className="h-4 w-4 mr-1" />
                                    Approuver
                                  </Button>
                                  <Button size="sm" variant="destructive" onClick={() => handleReject(request)}>
                                    <X className="h-4 w-4 mr-1" />
                                    Refuser
                                  </Button>
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
            </TabsContent>
          )}

          <TabsContent value="all">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>Toutes les demandes</CardTitle>
                    <CardDescription>Historique de toutes les demandes</CardDescription>
                  </div>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Filtrer par statut" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous les statuts</SelectItem>
                      <SelectItem value="pending">En attente</SelectItem>
                      <SelectItem value="approved">Approuvé</SelectItem>
                      <SelectItem value="rejected">Refusé</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
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
                        <TableHead>Type</TableHead>
                        <TableHead>Dates</TableHead>
                        <TableHead>Statut</TableHead>
                        <TableHead>Soumis le</TableHead>
                        {isManagerOrAdmin && <TableHead className="text-right">Actions</TableHead>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredRequests.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={isManagerOrAdmin ? 7 : 6} className="text-center text-muted-foreground py-8">
                            Aucune demande trouvée
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredRequests.map((request) => (
                          <TableRow key={request.id}>
                            <TableCell>
                              {request.employee?.first_name} {request.employee?.last_name}
                            </TableCell>
                            <TableCell>{typeLabels[request.type] || request.type}</TableCell>
                            <TableCell>
                              {format(new Date(request.start_date), 'dd/MM/yyyy')} - {format(new Date(request.end_date), 'dd/MM/yyyy')}
                            </TableCell>
                            <TableCell>{statusBadge(request.status)}</TableCell>
                            <TableCell>{format(new Date(request.created_at), 'dd/MM/yyyy')}</TableCell>
                            {isManagerOrAdmin && (
                              <TableCell className="text-right">
                                <Button size="sm" variant="ghost" onClick={() => setEditingRequest(request)}>
                                  <Pencil className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            )}
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <TimeOffEditDialog
          open={!!editingRequest}
          onClose={() => setEditingRequest(null)}
          request={editingRequest}
          onUpdate={fetchData}
        />
      </div>
    </MainLayout>
  );
};

export default TimeOff;
