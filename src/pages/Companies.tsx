import { useState } from 'react';
import { Plus, Edit, Trash2, Building2, Users, Settings2 } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { mockCompanies, mockTeams, mockEmployees } from '@/data/mockData';
import { useApp } from '@/contexts/AppContext';
import { cn } from '@/lib/utils';

const Companies = () => {
  const { setCurrentCompany, currentCompany } = useApp();

  const getCompanyStats = (companyId: string) => {
    const teams = mockTeams.filter((t) => t.companyId === companyId);
    const employees = mockEmployees.filter((e) => e.companyId === companyId);
    const activeEmployees = employees.filter((e) => e.active);

    return {
      teams: teams.length,
      employees: employees.length,
      activeEmployees: activeEmployees.length,
    };
  };

  return (
    <MainLayout
      title="Entreprises"
      subtitle="Gestion des sociétés et de leurs configurations"
    >
      {/* Actions */}
      <div className="flex justify-end mb-6">
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Nouvelle entreprise
        </Button>
      </div>

      {/* Companies Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {mockCompanies.map((company) => {
          const stats = getCompanyStats(company.id);
          const isSelected = currentCompany?.id === company.id;

          return (
            <Card
              key={company.id}
              className={cn(
                'relative overflow-hidden transition-all duration-200 cursor-pointer hover:shadow-lg',
                isSelected && 'ring-2 ring-primary shadow-lg'
              )}
              onClick={() => setCurrentCompany(company)}
            >
              {isSelected && (
                <div className="absolute top-0 left-0 right-0 h-1 bg-primary" />
              )}
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Building2 className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{company.name}</CardTitle>
                      <CardDescription>{company.legalName}</CardDescription>
                    </div>
                  </div>
                  {isSelected && (
                    <Badge className="bg-primary/10 text-primary border-0">
                      Sélectionnée
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">SIRET</span>
                    <span className="font-medium">{company.siret || '-'}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-3 border-t border-border/50">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center">
                        <Users className="w-4 h-4 text-accent" />
                      </div>
                      <div>
                        <p className="text-lg font-semibold">
                          {stats.activeEmployees}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Employés actifs
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-warning/10 flex items-center justify-center">
                        <Settings2 className="w-4 h-4 text-warning" />
                      </div>
                      <div>
                        <p className="text-lg font-semibold">{stats.teams}</p>
                        <p className="text-xs text-muted-foreground">Équipes</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-3">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={(e) => {
                        e.stopPropagation();
                        // Open edit modal
                      }}
                    >
                      <Edit className="w-4 h-4 mr-1" />
                      Modifier
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={(e) => {
                        e.stopPropagation();
                        // Open settings
                      }}
                    >
                      <Settings2 className="w-4 h-4 mr-1" />
                      Config
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </MainLayout>
  );
};

export default Companies;
