import { MainLayout } from '@/components/layout/MainLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ShiftSwapTable } from '@/components/swaps/ShiftSwapTable';
import { useApp } from '@/contexts/AppContext';
import { mockShiftSwapRequests } from '@/data/mockData';
import { ShiftSwapRequest } from '@/types/hr';
import { useToast } from '@/hooks/use-toast';

const Swaps = () => {
  const { currentCompany, currentUser } = useApp();
  const { toast } = useToast();

  if (!currentCompany) {
    return (
      <MainLayout title="Échanges de shifts">
        <div className="text-center py-20 text-muted-foreground">
          Sélectionnez une entreprise pour voir les échanges.
        </div>
      </MainLayout>
    );
  }

  const allRequests = mockShiftSwapRequests.filter(
    (s) => s.companyId === currentCompany.id
  );

  const pendingRequests = allRequests.filter((r) => r.status === 'pending');
  const processedRequests = allRequests.filter((r) => r.status !== 'pending');

  const isManagerOrAdmin =
    currentUser?.role === 'manager' || currentUser?.role === 'admin';

  const handleAccept = (request: ShiftSwapRequest) => {
    toast({
      title: 'Échange accepté',
      description: "L'échange de shift a été validé. Les shifts ont été mis à jour.",
    });
  };

  const handleReject = (request: ShiftSwapRequest) => {
    toast({
      variant: 'destructive',
      title: 'Échange refusé',
      description: "L'échange de shift a été refusé.",
    });
  };

  return (
    <MainLayout
      title="Échanges de shifts"
      subtitle={`${pendingRequests.length} échange(s) en attente • ${currentCompany.name}`}
    >
      <Tabs defaultValue={isManagerOrAdmin ? 'pending' : 'all'}>
        <TabsList className="mb-4">
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
          <TabsTrigger value="history">Historique</TabsTrigger>
        </TabsList>

        {isManagerOrAdmin && (
          <TabsContent value="pending" className="mt-0">
            <ShiftSwapTable
              requests={pendingRequests}
              showActions={true}
              onAccept={handleAccept}
              onReject={handleReject}
            />
          </TabsContent>
        )}

        <TabsContent value="all" className="mt-0">
          <ShiftSwapTable
            requests={allRequests}
            showActions={isManagerOrAdmin}
            onAccept={handleAccept}
            onReject={handleReject}
          />
        </TabsContent>

        <TabsContent value="history" className="mt-0">
          <ShiftSwapTable requests={processedRequests} showActions={false} />
        </TabsContent>
      </Tabs>
    </MainLayout>
  );
};

export default Swaps;
