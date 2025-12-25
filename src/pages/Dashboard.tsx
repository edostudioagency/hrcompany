import { useState, useEffect } from 'react';
import {
  Users,
  Clock,
  ArrowLeftRight,
  Calendar,
  Loader2,
} from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { StatCard } from '@/components/ui/stat-card';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/status-badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Link } from 'react-router-dom';
import { format, startOfWeek, endOfWeek, isToday, isTomorrow } from 'date-fns';
import { fr } from 'date-fns/locale';

interface DashboardStats {
  activeEmployees: number;
  totalEmployees: number;
  pendingTimeOff: number;
  pendingSwaps: number;
  shiftsThisWeek: number;
}

interface TimeOffRequest {
  id: string;
  type: string;
  start_date: string;
  end_date: string;
  status: string;
  employee: {
    first_name: string;
    last_name: string;
  } | null;
}

interface Shift {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  location: string | null;
  employee: {
    first_name: string;
    last_name: string;
  } | null;
}

const TIME_OFF_LABELS: Record<string, string> = {
  conge_paye: 'Congé payé',
  rtt: 'RTT',
  maladie: 'Maladie',
  sans_solde: 'Sans solde',
  autre: 'Autre',
};

const Dashboard = () => {
  const { role } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    activeEmployees: 0,
    totalEmployees: 0,
    pendingTimeOff: 0,
    pendingSwaps: 0,
    shiftsThisWeek: 0,
  });
  const [recentRequests, setRecentRequests] = useState<TimeOffRequest[]>([]);
  const [upcomingShifts, setUpcomingShifts] = useState<Shift[]>([]);

  const isManagerOrAdmin = role === 'admin' || role === 'manager';

  useEffect(() => {
    const fetchData = async () => {
      try {
        const today = new Date();
        const weekStart = startOfWeek(today, { weekStartsOn: 1 });
        const weekEnd = endOfWeek(today, { weekStartsOn: 1 });

        const [
          employeesRes,
          timeOffRes,
          swapsRes,
          shiftsRes,
          recentTimeOffRes,
          upcomingShiftsRes,
        ] = await Promise.all([
          supabase.from('employees').select('id, status'),
          supabase.from('time_off_requests').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
          supabase.from('shift_swap_requests').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
          supabase.from('shifts').select('id', { count: 'exact', head: true })
            .gte('date', format(weekStart, 'yyyy-MM-dd'))
            .lte('date', format(weekEnd, 'yyyy-MM-dd')),
          supabase.from('time_off_requests')
            .select('id, type, start_date, end_date, status, employee_id')
            .order('created_at', { ascending: false })
            .limit(5),
          supabase.from('shifts')
            .select('id, date, start_time, end_time, location, employee_id')
            .gte('date', format(today, 'yyyy-MM-dd'))
            .order('date', { ascending: true })
            .order('start_time', { ascending: true })
            .limit(10),
        ]);

        const employees = employeesRes.data || [];
        const activeCount = employees.filter((e) => e.status === 'active').length;

        setStats({
          activeEmployees: activeCount,
          totalEmployees: employees.length,
          pendingTimeOff: timeOffRes.count || 0,
          pendingSwaps: swapsRes.count || 0,
          shiftsThisWeek: shiftsRes.count || 0,
        });

        // Fetch employee details for time off requests
        if (recentTimeOffRes.data) {
          const employeeIds = [...new Set(recentTimeOffRes.data.map((r) => r.employee_id))];
          const { data: employeeData } = await supabase
            .from('employees')
            .select('id, first_name, last_name')
            .in('id', employeeIds);

          const employeeMap = new Map(employeeData?.map((e) => [e.id, e]) || []);
          
          setRecentRequests(
            recentTimeOffRes.data.map((r) => ({
              ...r,
              employee: employeeMap.get(r.employee_id) || null,
            }))
          );
        }

        // Fetch employee details for shifts
        if (upcomingShiftsRes.data) {
          const employeeIds = [...new Set(upcomingShiftsRes.data.map((s) => s.employee_id))];
          const { data: employeeData } = await supabase
            .from('employees')
            .select('id, first_name, last_name')
            .in('id', employeeIds);

          const employeeMap = new Map(employeeData?.map((e) => [e.id, e]) || []);
          
          setUpcomingShifts(
            upcomingShiftsRes.data.map((s) => ({
              ...s,
              employee: employeeMap.get(s.employee_id) || null,
            }))
          );
        }
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const getDateLabel = (dateStr: string) => {
    const date = new Date(dateStr);
    if (isToday(date)) return "Aujourd'hui";
    if (isTomorrow(date)) return 'Demain';
    return format(date, 'EEEE d MMM', { locale: fr });
  };

  // Group shifts by date
  const groupedShifts = upcomingShifts.reduce((acc, shift) => {
    if (!acc[shift.date]) {
      acc[shift.date] = [];
    }
    acc[shift.date].push(shift);
    return acc;
  }, {} as Record<string, Shift[]>);

  const sortedDates = Object.keys(groupedShifts).sort().slice(0, 3);

  if (loading) {
    return (
      <MainLayout title="Tableau de bord">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout title="Tableau de bord" subtitle="Vue d'ensemble de votre entreprise">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Employés actifs"
          value={stats.activeEmployees}
          subtitle={`sur ${stats.totalEmployees} au total`}
          icon={Users}
          iconColor="primary"
        />
        {isManagerOrAdmin && (
          <>
            <StatCard
              title="Demandes en attente"
              value={stats.pendingTimeOff}
              subtitle="Congés à valider"
              icon={Clock}
              iconColor="warning"
            />
            <StatCard
              title="Échanges en attente"
              value={stats.pendingSwaps}
              subtitle="À valider"
              icon={ArrowLeftRight}
              iconColor="accent"
            />
          </>
        )}
        <StatCard
          title="Shifts cette semaine"
          value={stats.shiftsThisWeek}
          subtitle="Planifiés"
          icon={Calendar}
          iconColor="success"
        />
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Requests */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Clock className="w-5 h-5 text-warning" />
              Demandes récentes
            </CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/time-off">Voir tout</Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentRequests.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">
                  Aucune demande récente
                </p>
              ) : (
                recentRequests.map((request) => (
                  <div
                    key={request.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-secondary/30"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-sm font-medium text-primary">
                          {request.employee?.first_name?.[0]}
                          {request.employee?.last_name?.[0]}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-sm">
                          {request.employee?.first_name} {request.employee?.last_name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {TIME_OFF_LABELS[request.type] || request.type} •{' '}
                          {format(new Date(request.start_date), 'd MMM', { locale: fr })}
                        </p>
                      </div>
                    </div>
                    <StatusBadge status={request.status as any} />
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Upcoming Shifts */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Calendar className="w-5 h-5 text-accent" />
              Prochains shifts
            </CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/shifts">Voir planning</Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {sortedDates.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">
                  Aucun shift planifié
                </p>
              ) : (
                sortedDates.map((date) => (
                  <div key={date}>
                    <p className="text-sm font-medium mb-2 capitalize">
                      {getDateLabel(date)}
                    </p>
                    <div className="space-y-2">
                      {groupedShifts[date].slice(0, 3).map((shift) => (
                        <div
                          key={shift.id}
                          className="flex items-center gap-3 p-2 rounded-lg bg-secondary/30"
                        >
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <span className="text-xs font-medium text-primary">
                              {shift.employee?.first_name?.[0]}
                              {shift.employee?.last_name?.[0]}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">
                              {shift.employee?.first_name} {shift.employee?.last_name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {shift.start_time?.slice(0, 5)} - {shift.end_time?.slice(0, 5)}
                              {shift.location && ` • ${shift.location}`}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
};

export default Dashboard;
