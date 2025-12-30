import { MainLayout } from '@/components/layout/MainLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Building2, MapPin, Scale, Calculator } from 'lucide-react';
import { CompanyInfoForm } from '@/components/settings/CompanyInfoForm';
import { LocationsManager } from '@/components/settings/LocationsManager';
import { RulesSettings } from '@/components/settings/RulesSettings';
import { AccountingSettings } from '@/components/settings/AccountingSettings';
import { useCompany } from '@/contexts/CompanyContext';

export default function Settings() {
  const { currentCompany } = useCompany();

  return (
    <MainLayout title="Paramètres Entreprise">
      <div className="space-y-6">
        <div>
          <p className="text-muted-foreground">
            Configurez les paramètres de votre entreprise
          </p>
        </div>

        <Tabs defaultValue="company" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
            <TabsTrigger value="company" className="gap-2">
              <Building2 className="h-4 w-4" />
              <span className="hidden sm:inline">Entreprise</span>
            </TabsTrigger>
            <TabsTrigger value="locations" className="gap-2">
              <MapPin className="h-4 w-4" />
              <span className="hidden sm:inline">Locaux</span>
            </TabsTrigger>
            <TabsTrigger value="rules" className="gap-2">
              <Scale className="h-4 w-4" />
              <span className="hidden sm:inline">Règles</span>
            </TabsTrigger>
            <TabsTrigger value="accounting" className="gap-2">
              <Calculator className="h-4 w-4" />
              <span className="hidden sm:inline">Comptabilité</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="company">
            <CompanyInfoForm companyId={currentCompany?.id} />
          </TabsContent>

          <TabsContent value="locations">
            <LocationsManager />
          </TabsContent>

          <TabsContent value="rules">
            <RulesSettings />
          </TabsContent>

          <TabsContent value="accounting">
            <AccountingSettings />
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
