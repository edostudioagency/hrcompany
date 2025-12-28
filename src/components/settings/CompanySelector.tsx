import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useCompany } from '@/contexts/CompanyContext';
import { useAuth } from '@/hooks/useAuth';
import { Plus, Building2, Check, Pencil, Trash2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface CompanySelectorProps {
  selectedCompanyId: string | null;
  onSelectCompany: (companyId: string | null) => void;
  onCreateNew: () => void;
}

export function CompanySelector({ 
  selectedCompanyId, 
  onSelectCompany, 
  onCreateNew 
}: CompanySelectorProps) {
  const { companies, currentCompany, switchCompany, refreshCompanies } = useCompany();
  const { role } = useAuth();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [companyToDelete, setCompanyToDelete] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const isAdmin = role === 'admin';

  if (!isAdmin || companies.length === 0) {
    return null;
  }

  const handleDelete = async () => {
    if (!companyToDelete) return;
    
    setDeleting(true);
    try {
      const { error } = await supabase
        .from('companies')
        .delete()
        .eq('id', companyToDelete);

      if (error) throw error;
      
      toast.success('Entreprise supprimée');
      await refreshCompanies();
      
      if (selectedCompanyId === companyToDelete) {
        onSelectCompany(companies[0]?.id || null);
      }
    } catch (error) {
      console.error('Error deleting company:', error);
      toast.error('Erreur lors de la suppression');
    } finally {
      setDeleting(false);
      setDeleteDialogOpen(false);
      setCompanyToDelete(null);
    }
  };

  const openDeleteDialog = (companyId: string) => {
    setCompanyToDelete(companyId);
    setDeleteDialogOpen(true);
  };

  return (
    <>
      <Card className="mb-6">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-lg font-medium flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Vos entreprises
          </CardTitle>
          <Button size="sm" onClick={onCreateNew}>
            <Plus className="h-4 w-4 mr-2" />
            Nouvelle
          </Button>
        </CardHeader>
        <CardContent className="space-y-2">
          {companies.map((company) => (
            <div
              key={company.id}
              className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                selectedCompanyId === company.id
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:bg-muted/50'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <span className="text-sm font-semibold text-primary">
                    {company.name.substring(0, 2).toUpperCase()}
                  </span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{company.name}</span>
                    {currentCompany?.id === company.id && (
                      <Badge variant="secondary" className="text-xs">
                        <Check className="h-3 w-3 mr-1" />
                        Active
                      </Badge>
                    )}
                  </div>
                  {company.legal_name && (
                    <span className="text-sm text-muted-foreground">
                      {company.legal_name}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onSelectCompany(company.id)}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                {companies.length > 1 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openDeleteDialog(company.id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer l'entreprise ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Toutes les données associées à cette entreprise seront supprimées.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Annuler</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete} 
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? 'Suppression...' : 'Supprimer'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
