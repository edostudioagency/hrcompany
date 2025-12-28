import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';
import { toast } from 'sonner';
import { Loader2, Plus, Pencil, Trash2, MapPin, Users } from 'lucide-react';

interface Location {
  id: string;
  name: string;
  address: string | null;
  minimum_employees: number;
  is_active: boolean;
  company_id: string | null;
}

export function LocationsManager() {
  const { currentCompany } = useCompany();
  const [loading, setLoading] = useState(true);
  const [locations, setLocations] = useState<Location[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    minimum_employees: 1,
    is_active: true,
  });

  useEffect(() => {
    if (currentCompany?.id) {
      fetchData();
    }
  }, [currentCompany?.id]);

  const fetchData = async () => {
    if (!currentCompany?.id) return;
    
    setLoading(true);
    try {
      const { data: locationsData, error } = await supabase
        .from('company_locations')
        .select('*')
        .eq('company_id', currentCompany.id)
        .order('name');

      if (error) throw error;
      setLocations(locationsData || []);
    } catch (error) {
      console.error('Error fetching locations:', error);
      toast.error('Erreur lors du chargement des locaux');
    } finally {
      setLoading(false);
    }
  };

  const openAddDialog = () => {
    setEditingLocation(null);
    setFormData({
      name: '',
      address: '',
      minimum_employees: 1,
      is_active: true,
    });
    setDialogOpen(true);
  };

  const openEditDialog = (location: Location) => {
    setEditingLocation(location);
    setFormData({
      name: location.name,
      address: location.address || '',
      minimum_employees: location.minimum_employees,
      is_active: location.is_active,
    });
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentCompany?.id) {
      toast.error('Veuillez d\'abord sélectionner une entreprise');
      return;
    }

    setSaving(true);

    try {
      if (editingLocation) {
        const { error } = await supabase
          .from('company_locations')
          .update({
            name: formData.name,
            address: formData.address || null,
            minimum_employees: formData.minimum_employees,
            is_active: formData.is_active,
          })
          .eq('id', editingLocation.id);

        if (error) throw error;
        toast.success('Local mis à jour');
      } else {
        const { error } = await supabase
          .from('company_locations')
          .insert({
            company_id: currentCompany.id,
            name: formData.name,
            address: formData.address || null,
            minimum_employees: formData.minimum_employees,
            is_active: formData.is_active,
          });

        if (error) throw error;
        toast.success('Local ajouté');
      }

      setDialogOpen(false);
      fetchData();
    } catch (error) {
      console.error('Error saving location:', error);
      toast.error('Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (locationId: string) => {
    try {
      const { error } = await supabase
        .from('company_locations')
        .delete()
        .eq('id', locationId);

      if (error) throw error;
      toast.success('Local supprimé');
      fetchData();
    } catch (error) {
      console.error('Error deleting location:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!currentCompany?.id) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-8 text-center">
          <MapPin className="h-12 w-12 text-muted-foreground/50 mb-4" />
          <p className="text-muted-foreground">
            Veuillez d'abord sélectionner une entreprise
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Gestion des locaux</CardTitle>
          <CardDescription>
            Configurez les différents sites de votre entreprise
          </CardDescription>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openAddDialog}>
              <Plus className="mr-2 h-4 w-4" />
              Ajouter un local
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingLocation ? 'Modifier le local' : 'Ajouter un local'}
              </DialogTitle>
              <DialogDescription>
                {editingLocation
                  ? 'Modifiez les informations du local'
                  : 'Ajoutez un nouveau local à votre entreprise'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="location-name">Nom du local *</Label>
                <Input
                  id="location-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Siège social"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="location-address">Adresse</Label>
                <Input
                  id="location-address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="123 Rue de la Paix, 75001 Paris"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="min-employees">Effectif minimum requis</Label>
                <Input
                  id="min-employees"
                  type="number"
                  min={1}
                  value={formData.minimum_employees}
                  onChange={(e) =>
                    setFormData({ ...formData, minimum_employees: parseInt(e.target.value) || 1 })
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Nombre minimum d'employés requis pour autoriser les échanges
                </p>
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="is-active">Local actif</Label>
                <Switch
                  id="is-active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Annuler
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {editingLocation ? 'Mettre à jour' : 'Ajouter'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {locations.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <MapPin className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Aucun local configuré</p>
            <p className="text-sm">Ajoutez votre premier local pour commencer</p>
          </div>
        ) : (
          <div className="space-y-3">
            {locations.map((location) => (
              <div
                key={location.id}
                className="flex items-center justify-between p-4 rounded-lg border bg-card"
              >
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <MapPin className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium">{location.name}</h4>
                      {!location.is_active && (
                        <Badge variant="secondary">Inactif</Badge>
                      )}
                    </div>
                    {location.address && (
                      <p className="text-sm text-muted-foreground">{location.address}</p>
                    )}
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                      <Users className="h-3 w-3" />
                      <span>Min. {location.minimum_employees} employé(s)</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => openEditDialog(location)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Supprimer le local ?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Cette action est irréversible. Le local "{location.name}" sera
                          définitivement supprimé.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Annuler</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDelete(location.id)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Supprimer
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
