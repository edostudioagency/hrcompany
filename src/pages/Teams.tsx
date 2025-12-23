import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { useApp } from '@/contexts/AppContext';
import { TeamApproversForm } from '@/components/teams/TeamApproversForm';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, UserCheck } from 'lucide-react';
import { mockTeams, mockEmployees } from '@/data/mockData';
import { Team } from '@/types/hr';

const Teams = () => {
  const { currentCompany } = useApp();
  const [teams, setTeams] = useState<Team[]>(mockTeams);

  if (!currentCompany) {
    return (
      <MainLayout title="Équipes">
        <div className="text-center py-20 text-muted-foreground">
          Sélectionnez une entreprise pour gérer les équipes.
        </div>
      </MainLayout>
    );
  }

  const companyTeams = teams.filter((t) => t.companyId === currentCompany.id);
  const companyEmployees = mockEmployees.filter(
    (e) => e.companyId === currentCompany.id
  );

  const handleUpdateApprovers = (
    teamId: string,
    primaryApproverId: string | undefined,
    backupApproverId: string | undefined
  ) => {
    setTeams((prev) =>
      prev.map((t) =>
        t.id === teamId ? { ...t, primaryApproverId, backupApproverId } : t
      )
    );
  };

  const getEmployeeName = (employeeId: string | undefined) => {
    if (!employeeId) return null;
    const employee = mockEmployees.find((e) => e.id === employeeId);
    return employee ? `${employee.firstName} ${employee.lastName}` : null;
  };

  const getTeamMemberCount = (teamId: string) => {
    return companyEmployees.filter((e) => e.teamId === teamId && e.active).length;
  };

  return (
    <MainLayout
      title="Gestion des équipes"
      subtitle={`Configuration des équipes et approbateurs • ${currentCompany.name}`}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {companyTeams.map((team) => {
          const primaryApproverName = getEmployeeName(team.primaryApproverId);
          const backupApproverName = getEmployeeName(team.backupApproverId);
          const memberCount = getTeamMemberCount(team.id);

          return (
            <Card key={team.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Users className="w-5 h-5 text-primary" />
                    {team.name}
                  </CardTitle>
                  <Badge variant="secondary">{memberCount} membres</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Approvers Info */}
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">
                    Approbateurs
                  </p>
                  {primaryApproverName ? (
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <UserCheck className="w-4 h-4 text-success" />
                        <span className="text-sm">{primaryApproverName}</span>
                        <Badge variant="outline" className="text-xs">
                          Principal
                        </Badge>
                      </div>
                      {backupApproverName && (
                        <div className="flex items-center gap-2">
                          <UserCheck className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm">{backupApproverName}</span>
                          <Badge variant="outline" className="text-xs">
                            Backup
                          </Badge>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground/70 italic">
                      Aucun approbateur défini
                    </p>
                  )}
                </div>

                {/* Edit Approvers Button */}
                <TeamApproversForm
                  team={team}
                  employees={companyEmployees}
                  onUpdate={handleUpdateApprovers}
                />
              </CardContent>
            </Card>
          );
        })}
      </div>
    </MainLayout>
  );
};

export default Teams;
