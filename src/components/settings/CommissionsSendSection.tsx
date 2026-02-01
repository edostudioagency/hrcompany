import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';
import { toast } from 'sonner';
import { Loader2, Send, FileText, Euro } from 'lucide-react';

interface Commission {
  id: string;
  amount: number;
  status: string;
  employee: {
    first_name: string;
    last_name: string;
  } | null;
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

interface CommissionsSendSectionProps {
  accountantEmail: string | null;
}

export function CommissionsSendSection({ accountantEmail }: CommissionsSendSectionProps) {
  const { currentCompany } = useCompany();
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

  useEffect(() => {
    if (currentCompany?.id) {
      fetchCommissions();
    }
  }, [currentCompany?.id, selectedMonth, selectedYear]);

  const fetchCommissions = async () => {
    if (!currentCompany?.id) return;
    
    setLoading(true);
    try {
      // Get employees for this company
      const { data: employees } = await supabase
        .from('employees')
        .select('id')
        .eq('company_id', currentCompany.id);

      const employeeIds = employees?.map(e => e.id) || [];
      
      if (employeeIds.length === 0) {
        setCommissions([]);
        return;
      }

      const { data, error } = await supabase
        .from('commissions')
        .select('id, amount, status, employee:employees(first_name, last_name)')
        .in('employee_id', employeeIds)
        .eq('month', selectedMonth)
        .eq('year', selectedYear);

      if (error) throw error;
      setCommissions(data || []);
    } catch (error) {
      console.error('Error fetching commissions:', error);
    } finally {
      setLoading(false);
    }
  };

  const pendingCommissions = commissions.filter(c => c.status !== 'sent');
  const totalPending = pendingCommissions.reduce((sum, c) => sum + Number(c.amount), 0);

  const handleSendToAccountant = async () => {
    if (!accountantEmail) {
      toast.error("Veuillez configurer l'email du comptable ci-dessus");
      return;
    }

    if (pendingCommissions.length === 0) {
      toast.info('Aucune commission à envoyer pour cette période');
      return;
    }

    setSending(true);
    try {
      const commissionsList = pendingCommissions
        .map(c => `${c.employee?.first_name} ${c.employee?.last_name}: ${Number(c.amount).toFixed(2)}€`)
        .join('\n');

      const { error } = await supabase.functions.invoke('send-email', {
        body: {
          type: 'commissions',
          recipientEmail: accountantEmail,
          recipientName: 'Comptable',
          data: {
            month: MONTHS.find(m => m.value === selectedMonth)?.label,
            year: selectedYear,
            commissions: commissionsList,
            total: totalPending,
          },
        },
      });

      if (error) throw error;

      // Update commission statuses to 'sent'
      const ids = pendingCommissions.map(c => c.id);
      await supabase
        .from('commissions')
        .update({ status: 'sent' })
        .in('id', ids);

      toast.success('Commissions envoyées au comptable');
      fetchCommissions();
    } catch (error) {
      console.error('Error sending commissions:', error);
      toast.error("Erreur lors de l'envoi des commissions");
    } finally {
      setSending(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          <CardTitle className="text-lg">Envoi des commissions</CardTitle>
        </div>
        <CardDescription>
          Envoyez les commissions au comptable pour une période donnée
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
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

        {loading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="rounded-lg border bg-muted/50 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Commissions en attente</span>
              <span className="font-medium">{pendingCommissions.length}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Montant total</span>
              <div className="flex items-center gap-1 font-semibold text-primary">
                <Euro className="h-4 w-4" />
                {totalPending.toFixed(2)}
              </div>
            </div>
            {commissions.filter(c => c.status === 'sent').length > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Déjà envoyées</span>
                <span className="text-green-600">
                  {commissions.filter(c => c.status === 'sent').length}
                </span>
              </div>
            )}
          </div>
        )}

        <Button
          onClick={handleSendToAccountant}
          disabled={sending || loading || pendingCommissions.length === 0 || !accountantEmail}
          className="w-full"
        >
          {sending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Send className="mr-2 h-4 w-4" />
          )}
          Envoyer au comptable
        </Button>

        {!accountantEmail && (
          <p className="text-sm text-destructive text-center">
            Configurez l'email du comptable ci-dessus pour activer l'envoi
          </p>
        )}
      </CardContent>
    </Card>
  );
}
