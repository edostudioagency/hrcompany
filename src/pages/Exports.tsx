import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { ExportForm } from '@/components/exports/ExportForm';
import { ExportHistory } from '@/components/exports/ExportHistory';
import { useApp } from '@/contexts/AppContext';
import { MonthlyExport } from '@/types/hr';

// Mock export history
const mockExports: MonthlyExport[] = [
  {
    id: '1',
    companyId: '1',
    month: 11,
    year: 2024,
    generatedAt: new Date('2024-12-01T10:30:00'),
    generatedById: '1',
    fileUrl: '#',
  },
  {
    id: '2',
    companyId: '1',
    month: 10,
    year: 2024,
    generatedAt: new Date('2024-11-02T14:15:00'),
    generatedById: '1',
    fileUrl: '#',
  },
];

const Exports = () => {
  const { currentCompany, companies, currentUser } = useApp();
  const [exports, setExports] = useState<MonthlyExport[]>(mockExports);

  if (!currentCompany) {
    return (
      <MainLayout title="Exports comptables">
        <div className="text-center py-20 text-muted-foreground">
          Sélectionnez une entreprise pour gérer les exports.
        </div>
      </MainLayout>
    );
  }

  const companyExports = exports.filter(
    (e) => e.companyId === currentCompany.id
  );

  const handleExport = (companyId: string, month: number, year: number) => {
    const newExport: MonthlyExport = {
      id: Date.now().toString(),
      companyId,
      month,
      year,
      generatedAt: new Date(),
      generatedById: currentUser?.id || '1',
      fileUrl: '#',
    };

    setExports([newExport, ...exports]);
  };

  return (
    <MainLayout
      title="Exports comptables"
      subtitle={`Génération des exports mensuels • ${currentCompany.name}`}
    >
      <div className="space-y-6">
        <ExportForm
          companies={companies}
          currentCompany={currentCompany}
          onExport={handleExport}
        />

        <ExportHistory exports={companyExports} />
      </div>
    </MainLayout>
  );
};

export default Exports;
