import { useState } from 'react';
import { Plus, Filter } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TimeOffRequestTable } from '@/components/time-off/TimeOffRequestTable';
import { TimeOffRequestForm } from '@/components/time-off/TimeOffRequestForm';
import { useApp } from '@/contexts/AppContext';
import { mockTimeOffRequests } from '@/data/mockData';
import { TimeOffRequest, RequestStatus } from '@/types/hr';
import { useToast } from '@/hooks/use-toast';

const TimeOff = () => {
  const { currentCompany, currentUser } = useApp();
  const { toast } = useToast();
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isFormOpen, setIsFormOpen] = useState(false);

  if (!currentCompany) {
    return (
      <MainLayout title="Congés & Absences">
        <div className="text-center py-20 text-muted-foreground">
          Sélectionnez une entreprise pour voir les demandes.
        </div>
      </MainLayout>
    );
  }

  const allRequests = mockTimeOffRequests.filter(
    (t) => t.companyId === currentCompany.id
  );

  const pendingRequests = allRequests.filter((r) => r.status === 'pending');
  const processedRequests = allRequests.filter((r) => r.status !== 'pending');

  const filteredRequests =
    statusFilter === 'all'
      ? allRequests
      : allRequests.filter((r) => r.status === statusFilter);

  const isManagerOrAdmin =
    currentUser?.role === 'manager' || currentUser?.role === 'admin';

  const handleApprove = (request: TimeOffRequest) => {
    toast({
      title: 'Demande approuvée',
      description: 'La demande de congé a été approuvée.',
    });
  };

  const handleReject = (request: TimeOffRequest) => {
    toast({
      variant: 'destructive',
      title: 'Demande refusée',
      description: 'La demande de congé a été refusée.',
    });
  };

  const handleSubmitRequest = (data: any) => {
    console.log('New request:', data);
    // In real app, save to database
  };

  return (
    <MainLayout
      title="Congés & Absences"
      subtitle={`${pendingRequests.length} demande(s) en attente • ${currentCompany.name}`}
    >
      {/* Actions */}
      <div className="flex flex-col sm:flex-row justify-between gap-4 mb-6">
        <Tabs defaultValue={isManagerOrAdmin ? 'pending' : 'all'} className="w-full">
          <div className="flex flex-col sm:flex-row justify-between gap-4 mb-4">
            <TabsList>
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
              <TabsTrigger value="all">Toutes les demandes</TabsTrigger>
              <TabsTrigger value="history">Historique</TabsTrigger>
            </TabsList>

            <Button onClick={() => setIsFormOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Nouvelle demande
            </Button>
          </div>

          {isManagerOrAdmin && (
            <TabsContent value="pending" className="mt-0">
              <TimeOffRequestTable
                requests={pendingRequests}
                showActions={true}
                onApprove={handleApprove}
                onReject={handleReject}
              />
            </TabsContent>
          )}

          <TabsContent value="all" className="mt-0">
            <div className="mb-4">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filtrer par statut" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les statuts</SelectItem>
                  <SelectItem value="pending">En attente</SelectItem>
                  <SelectItem value="approved">Approuvé</SelectItem>
                  <SelectItem value="rejected">Refusé</SelectItem>
                  <SelectItem value="cancelled">Annulé</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <TimeOffRequestTable
              requests={filteredRequests}
              showActions={isManagerOrAdmin}
              onApprove={handleApprove}
              onReject={handleReject}
            />
          </TabsContent>

          <TabsContent value="history" className="mt-0">
            <TimeOffRequestTable
              requests={processedRequests}
              showActions={false}
            />
          </TabsContent>
        </Tabs>
      </div>

      {/* Request Form Modal */}
      <TimeOffRequestForm
        open={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSubmit={handleSubmitRequest}
      />
    </MainLayout>
  );
};

export default TimeOff;
