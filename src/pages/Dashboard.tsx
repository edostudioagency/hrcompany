import {
  Users,
  Clock,
  ArrowLeftRight,
  Calendar,
  TrendingUp,
  Building2,
} from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { StatCard } from '@/components/ui/stat-card';
import { RecentRequests } from '@/components/dashboard/RecentRequests';
import { UpcomingShifts } from '@/components/dashboard/UpcomingShifts';
import { useApp } from '@/contexts/AppContext';
import {
  getMockDashboardStats,
  getTimeOffRequestsWithEmployees,
  getShiftsWithEmployees,
} from '@/data/mockData';

const Dashboard = () => {
  const { currentCompany } = useApp();

  if (!currentCompany) {
    return (
      <MainLayout title="Tableau de bord">
        <div className="flex items-center justify-center h-[60vh]">
          <div className="text-center">
            <Building2 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-foreground mb-2">
              Aucune entreprise sélectionnée
            </h2>
            <p className="text-muted-foreground">
              Sélectionnez une entreprise dans le menu pour commencer.
            </p>
          </div>
        </div>
      </MainLayout>
    );
  }

  const stats = getMockDashboardStats(currentCompany.id);
  const timeOffRequests = getTimeOffRequestsWithEmployees(currentCompany.id);
  const shifts = getShiftsWithEmployees(currentCompany.id);

  return (
    <MainLayout
      title="Tableau de bord"
      subtitle={`Vue d'ensemble de ${currentCompany.name}`}
    >
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Employés actifs"
          value={stats.activeEmployees}
          subtitle={`sur ${stats.totalEmployees} au total`}
          icon={Users}
          iconColor="primary"
        />
        <StatCard
          title="Demandes en attente"
          value={stats.pendingTimeOffRequests}
          subtitle="Congés à valider"
          icon={Clock}
          iconColor="warning"
        />
        <StatCard
          title="Échanges en attente"
          value={stats.pendingShiftSwaps}
          subtitle="À valider"
          icon={ArrowLeftRight}
          iconColor="accent"
        />
        <StatCard
          title="Shifts cette semaine"
          value={stats.shiftsThisWeek}
          subtitle={`${stats.upcomingTimeOff} absence(s) prévue(s)`}
          icon={Calendar}
          iconColor="success"
        />
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RecentRequests requests={timeOffRequests} />
        <UpcomingShifts shifts={shifts} />
      </div>
    </MainLayout>
  );
};

export default Dashboard;
