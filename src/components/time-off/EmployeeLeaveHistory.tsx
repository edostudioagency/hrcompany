import { useState, useEffect } from 'react';
import { format, parseISO, differenceInCalendarDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, History, Calendar } from 'lucide-react';
import { LEAVE_TYPE_LABELS } from '@/lib/leave-calculator';
import { LeaveBalanceCard } from './LeaveBalanceCard';

interface TimeOffRequest {
  id: string;
  start_date: string;
  end_date: string;
  type: string;
  status: string;
  reason: string | null;
  created_at: string;
}

interface EmployeeLeaveHistoryProps {
  employeeId: string;
  showBalances?: boolean;
}

const statusLabels: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  approved: { label: 'Approuvé', variant: 'default' },
  rejected: { label: 'Refusé', variant: 'destructive' },
  pending: { label: 'En attente', variant: 'outline' },
};

export function EmployeeLeaveHistory({ employeeId, showBalances = true }: EmployeeLeaveHistoryProps) {
  const [requests, setRequests] = useState<TimeOffRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    fetchHistory();
  }, [employeeId]);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('time_off_requests')
        .select('*')
        .eq('employee_id', employeeId)
        .order('start_date', { ascending: false });

      if (error) throw error;
      setRequests(data || []);
    } catch (error) {
      console.error('Error fetching leave history:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredRequests = requests.filter(req => {
    if (typeFilter !== 'all' && req.type !== typeFilter) return false;
    if (statusFilter !== 'all' && req.status !== statusFilter) return false;
    return true;
  });

  const calculateDuration = (startDate: string, endDate: string) => {
    const start = parseISO(startDate);
    const end = parseISO(endDate);
    const days = differenceInCalendarDays(end, start) + 1;
    return days;
  };

  const uniqueTypes = [...new Set(requests.map(r => r.type))];

  if (loading) {
    return (
      <div className="space-y-4">
        {showBalances && <LeaveBalanceCard employeeId={employeeId} />}
        <Card>
          <CardContent className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {showBalances && <LeaveBalanceCard employeeId={employeeId} />}
      
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <History className="h-4 w-4" />
            Historique des congés
          </CardTitle>
          <CardDescription>
            {requests.length} demande(s) au total
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-wrap gap-3 mb-4">
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les types</SelectItem>
                {uniqueTypes.map(type => (
                  <SelectItem key={type} value={type}>
                    {LEAVE_TYPE_LABELS[type] || type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                <SelectItem value="approved">Approuvé</SelectItem>
                <SelectItem value="pending">En attente</SelectItem>
                <SelectItem value="rejected">Refusé</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {filteredRequests.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              Aucune demande de congé trouvée.
            </p>
          ) : (
            <div className="rounded-md border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Dates</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Durée</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Motif</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRequests.map((request) => {
                    const duration = calculateDuration(request.start_date, request.end_date);
                    const statusConfig = statusLabels[request.status] || { label: request.status, variant: 'outline' as const };
                    
                    return (
                      <TableRow key={request.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <div className="text-sm">
                              {format(parseISO(request.start_date), 'dd MMM yyyy', { locale: fr })}
                              {request.start_date !== request.end_date && (
                                <>
                                  <span className="text-muted-foreground"> → </span>
                                  {format(parseISO(request.end_date), 'dd MMM yyyy', { locale: fr })}
                                </>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">
                            {LEAVE_TYPE_LABELS[request.type] || request.type}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {duration} jour{duration > 1 ? 's' : ''}
                        </TableCell>
                        <TableCell>
                          <Badge variant={statusConfig.variant}>
                            {statusConfig.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate text-muted-foreground">
                          {request.reason || '-'}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
