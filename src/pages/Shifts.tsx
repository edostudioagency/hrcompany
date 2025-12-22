import { MainLayout } from '@/components/layout/MainLayout';
import { ShiftCalendar } from '@/components/calendar/ShiftCalendar';
import { useApp } from '@/contexts/AppContext';
import {
  mockShifts,
  mockTimeOffRequests,
  mockEmployees,
} from '@/data/mockData';
import { useToast } from '@/hooks/use-toast';

const Shifts = () => {
  const { currentCompany } = useApp();
  const { toast } = useToast();

  if (!currentCompany) {
    return (
      <MainLayout title="Planning">
        <div className="text-center py-20 text-muted-foreground">
          Sélectionnez une entreprise pour voir le planning.
        </div>
      </MainLayout>
    );
  }

  const shifts = mockShifts.filter((s) => s.companyId === currentCompany.id);
  const timeOffRequests = mockTimeOffRequests.filter(
    (t) => t.companyId === currentCompany.id
  );
  const employees = mockEmployees.filter(
    (e) => e.companyId === currentCompany.id
  );

  const handleAddShift = (date: Date) => {
    toast({
      title: 'Ajouter un shift',
      description: `Création d'un shift pour le ${date.toLocaleDateString('fr-FR')}`,
    });
    // In real app, open a modal to create a shift
  };

  const handleShiftClick = (shift: typeof shifts[0]) => {
    const employee = employees.find((e) => e.id === shift.employeeId);
    toast({
      title: 'Détails du shift',
      description: `${employee?.firstName} ${employee?.lastName} • ${shift.startTime} - ${shift.endTime}`,
    });
  };

  return (
    <MainLayout
      title="Planning"
      subtitle={`Gestion des shifts • ${currentCompany.name}`}
    >
      <ShiftCalendar
        shifts={shifts}
        timeOffRequests={timeOffRequests}
        employees={employees}
        onAddShift={handleAddShift}
        onShiftClick={handleShiftClick}
      />
    </MainLayout>
  );
};

export default Shifts;
