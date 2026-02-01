import { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
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
import { useCompany } from '@/contexts/CompanyContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { CalendarIcon, Check, X, Loader2, ArrowRightLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ShiftSwapRequest {
  id: string;
  requester_id: string;
  target_id: string;
  original_date: string;
  swap_date: string;
  reason: string | null;
  status: string;
  created_at: string;
  requester?: {
    first_name: string;
    last_name: string;
    email: string;
  };
  target?: {
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
  user_id: string | null;
}

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

const Swaps = () => {
  const { role, user } = useAuth();
  const { currentCompany } = useCompany();
  const [requests, setRequests] = useState<ShiftSwapRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [currentEmployeeId, setCurrentEmployeeId] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    targetId: '',
    originalDate: undefined as Date | undefined,
    swapDate: undefined as Date | undefined,
    reason: '',
  });

  const isManagerOrAdmin = role === 'manager' || role === 'admin';

  const fetchData = async () => {
    if (!currentCompany?.id) {
      setRequests([]);
      setEmployees([]);
      setLoading(false);
      return;
    }

    try {
      // Fetch employees for this company
      const { data: empData } = await supabase
        .from('employees')
        .select('id, first_name, last_name, email, user_id')
        .eq('company_id', currentCompany.id);
      
      setEmployees(empData || []);
      
      // Find current user's employee record
      const currentEmp = empData?.find((e) => e.user_id === user?.id);
      setCurrentEmployeeId(currentEmp?.id || null);

      const employeeIds = empData?.map(e => e.id) || [];
      
      if (employeeIds.length === 0) {
        setRequests([]);
        setLoading(false);
        return;
      }

      // Fetch swap requests for employees in this company
      const { data, error } = await supabase
        .from('shift_swap_requests')
        .select(`
          *,
          requester:employees!shift_swap_requests_requester_id_fkey(first_name, last_name, email),
          target:employees!shift_swap_requests_target_id_fkey(first_name, last_name, email)
        `)
        .in('requester_id', employeeIds)
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
    setLoading(true);
    fetchData();
  }, [user?.id, currentCompany?.id]);

  const handleSubmit = async () => {
    if (!formData.targetId || !formData.originalDate || !formData.swapDate || !currentEmployeeId) {
      toast.error('Veuillez remplir tous les champs obligatoires');
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.from('shift_swap_requests').insert({
        requester_id: currentEmployeeId,
        target_id: formData.targetId,
        original_date: format(formData.originalDate, 'yyyy-MM-dd'),
        swap_date: format(formData.swapDate, 'yyyy-MM-dd'),
        reason: formData.reason || null,
      });

      if (error) throw error;

      // Send notification to target employee
      const targetEmployee = employees.find((e) => e.id === formData.targetId);
      const requesterEmployee = employees.find((e) => e.id === currentEmployeeId);
      
      if (targetEmployee) {
        await supabase.functions.invoke('send-email', {
          body: {
            type: 'shift_swap',
            recipientEmail: targetEmployee.email,
            recipientName: `${targetEmployee.first_name} ${targetEmployee.last_name}`,
            data: {
              action: 'request',
              requesterName: `${requesterEmployee?.first_name} ${requesterEmployee?.last_name}`,
              originalDate: format(formData.originalDate, 'dd/MM/yyyy'),
              swapDate: format(formData.swapDate, 'dd/MM/yyyy'),
            },
          },
        });
      }

      toast.success('Demande d\'échange soumise');
      setIsFormOpen(false);
      setFormData({ targetId: '', originalDate: undefined, swapDate: undefined, reason: '' });
      fetchData();
    } catch (error) {
      console.error('Error submitting request:', error);
      toast.error('Erreur lors de la soumission');
    } finally {
      setSubmitting(false);
    }
  };

  const handleApprove = async (request: ShiftSwapRequest) => {
    try {
      const { error } = await supabase
        .from('shift_swap_requests')
        .update({ status: 'approved', reviewed_at: new Date().toISOString() })
        .eq('id', request.id);

      if (error) throw error;

      // Notify requester
      if (request.requester?.email) {
        await supabase.functions.invoke('send-email', {
          body: {
            type: 'shift_swap',
            recipientEmail: request.requester.email,
            recipientName: `${request.requester.first_name} ${request.requester.last_name}`,
            data: { action: 'approved' },
          },
        });
      }

      toast.success('Échange approuvé');
      fetchData();
    } catch (error) {
      console.error('Error approving request:', error);
      toast.error('Erreur lors de l\'approbation');
    }
  };

  const handleReject = async (request: ShiftSwapRequest) => {
    try {
      const { error } = await supabase
        .from('shift_swap_requests')
        .update({ status: 'rejected', reviewed_at: new Date().toISOString() })
        .eq('id', request.id);

      if (error) throw error;

      // Notify requester
      if (request.requester?.email) {
        await supabase.functions.invoke('send-email', {
          body: {
            type: 'shift_swap',
            recipientEmail: request.requester.email,
            recipientName: `${request.requester.first_name} ${request.requester.last_name}`,
            data: { action: 'rejected' },
          },
        });
      }

      toast.success('Échange refusé');
      fetchData();
    } catch (error) {
      console.error('Error rejecting request:', error);
      toast.error('Erreur lors du refus');
    }
  };

  const pendingRequests = requests.filter((r) => r.status === 'pending');
  const otherEmployees = employees.filter((e) => e.id !== currentEmployeeId);

  if (!currentCompany) {
    return (
      <MainLayout title="Échanges de shifts">
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Veuillez sélectionner une entreprise</p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout
      title="Échanges de shifts"
      subtitle={`${pendingRequests.length} échange(s) en attente`}
    >
      <div className="space-y-6">
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
              <TabsTrigger value="all">Tous les échanges</TabsTrigger>
            </TabsList>

            <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
              <DialogTrigger asChild>
                <Button disabled={!currentEmployeeId || otherEmployees.length === 0}>
                  <Plus className="w-4 h-4 mr-2" />
                  Demander un échange
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Demande d'échange de shift</DialogTitle>
                  <DialogDescription>
                    Proposez un échange de shift avec un collègue
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Échanger avec</Label>
                    <Select value={formData.targetId} onValueChange={(v) => setFormData({ ...formData, targetId: v })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner un collègue" />
                      </SelectTrigger>
                      <SelectContent>
                        {[...otherEmployees]
                          .sort((a, b) => `${a.first_name} ${a.last_name}`.toLowerCase().localeCompare(`${b.first_name} ${b.last_name}`.toLowerCase(), 'fr'))
                          .map((emp) => (
                            <SelectItem key={emp.id} value={emp.id}>
                              {emp.first_name} {emp.last_name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Votre shift (date)</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              'w-full justify-start text-left font-normal',
                              !formData.originalDate && 'text-muted-foreground'
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {formData.originalDate ? format(formData.originalDate, 'dd/MM/yyyy') : 'Sélectionner'}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={formData.originalDate}
                            onSelect={(date) => setFormData({ ...formData, originalDate: date })}
                            locale={fr}
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div className="space-y-2">
                      <Label>Shift demandé (date)</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              'w-full justify-start text-left font-normal',
                              !formData.swapDate && 'text-muted-foreground'
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {formData.swapDate ? format(formData.swapDate, 'dd/MM/yyyy') : 'Sélectionner'}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={formData.swapDate}
                            onSelect={(date) => setFormData({ ...formData, swapDate: date })}
                            locale={fr}
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
                      placeholder="Expliquez la raison de votre demande..."
                    />
                  </div>
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
                  <CardTitle>Échanges en attente</CardTitle>
                  <CardDescription>Demandes d'échange nécessitant votre approbation</CardDescription>
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
                          <TableHead>Demandeur</TableHead>
                          <TableHead>Échange avec</TableHead>
                          <TableHead>Dates</TableHead>
                          <TableHead>Motif</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {pendingRequests.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                              Aucun échange en attente
                            </TableCell>
                          </TableRow>
                        ) : (
                          pendingRequests.map((request) => (
                            <TableRow key={request.id}>
                              <TableCell>
                                <div>
                                  <p className="font-medium">
                                    {request.requester?.first_name} {request.requester?.last_name}
                                  </p>
                                </div>
                              </TableCell>
                              <TableCell>
                                {request.target?.first_name} {request.target?.last_name}
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <span>{format(new Date(request.original_date), 'dd/MM')}</span>
                                  <ArrowRightLeft className="h-4 w-4 text-muted-foreground" />
                                  <span>{format(new Date(request.swap_date), 'dd/MM')}</span>
                                </div>
                              </TableCell>
                              <TableCell className="max-w-[200px] truncate">
                                {request.reason || '-'}
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-2">
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
                <CardTitle>Tous les échanges</CardTitle>
                <CardDescription>Historique des demandes d'échange</CardDescription>
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
                        <TableHead>Demandeur</TableHead>
                        <TableHead>Échange avec</TableHead>
                        <TableHead>Dates</TableHead>
                        <TableHead>Statut</TableHead>
                        <TableHead>Date demande</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {requests.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                            Aucune demande d'échange
                          </TableCell>
                        </TableRow>
                      ) : (
                        requests.map((request) => (
                          <TableRow key={request.id}>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                                  <span className="text-xs font-medium text-primary">
                                    {request.requester?.first_name?.[0]}{request.requester?.last_name?.[0]}
                                  </span>
                                </div>
                                <p className="font-medium">
                                  {request.requester?.first_name} {request.requester?.last_name}
                                </p>
                              </div>
                            </TableCell>
                            <TableCell>
                              {request.target?.first_name} {request.target?.last_name}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <span>{format(new Date(request.original_date), 'dd/MM')}</span>
                                <ArrowRightLeft className="h-4 w-4 text-muted-foreground" />
                                <span>{format(new Date(request.swap_date), 'dd/MM')}</span>
                              </div>
                            </TableCell>
                            <TableCell>{statusBadge(request.status)}</TableCell>
                            <TableCell className="text-muted-foreground">
                              {format(new Date(request.created_at), 'dd/MM/yyyy')}
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
        </Tabs>
      </div>
    </MainLayout>
  );
};

export default Swaps;
