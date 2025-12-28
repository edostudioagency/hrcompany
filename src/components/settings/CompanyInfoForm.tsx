import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, Save, X } from 'lucide-react';
import { useCompany } from '@/contexts/CompanyContext';
import { useAuth } from '@/hooks/useAuth';

interface CompanyInfoFormProps {
  companyId?: string | null;
  isCreateMode?: boolean;
  onCancel?: () => void;
  onSaved?: () => void;
}

export function CompanyInfoForm({ 
  companyId, 
  isCreateMode = false,
  onCancel,
  onSaved 
}: CompanyInfoFormProps) {
  const [loading, setLoading] = useState(!isCreateMode);
  const [saving, setSaving] = useState(false);
  const { refreshCompanies, switchCompany } = useCompany();
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    legal_name: '',
    siret: '',
    address: '',
    phone: '',
    email: '',
  });

  useEffect(() => {
    if (companyId && !isCreateMode) {
      fetchCompany(companyId);
    } else if (isCreateMode) {
      setFormData({
        name: '',
        legal_name: '',
        siret: '',
        address: '',
        phone: '',
        email: '',
      });
      setLoading(false);
    }
  }, [companyId, isCreateMode]);

  const fetchCompany = async (id: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setFormData({
          name: data.name || '',
          legal_name: data.legal_name || '',
          siret: data.siret || '',
          address: data.address || '',
          phone: data.phone || '',
          email: data.email || '',
        });
      }
    } catch (error) {
      console.error('Error fetching company:', error);
      toast.error('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast.error('Le nom de l\'entreprise est requis');
      return;
    }
    
    setSaving(true);

    try {
      if (isCreateMode) {
        // Create new company
        const { data: newCompany, error: insertError } = await supabase
          .from('companies')
          .insert({
            name: formData.name,
            legal_name: formData.legal_name || null,
            siret: formData.siret || null,
            address: formData.address || null,
            phone: formData.phone || null,
            email: formData.email || null,
          })
          .select()
          .single();

        if (insertError) throw insertError;

        // Link admin to the new company
        if (user) {
          const { error: linkError } = await supabase
            .from('user_companies')
            .insert({
              user_id: user.id,
              company_id: newCompany.id,
              is_default: false,
            });

          if (linkError) {
            console.error('Error linking user to company:', linkError);
          }
        }

        // Create default company settings
        const { error: settingsError } = await supabase
          .from('company_settings')
          .insert({
            company_id: newCompany.id,
          });

        if (settingsError) {
          console.error('Error creating company settings:', settingsError);
        }

        toast.success('Entreprise créée');
        await refreshCompanies();
        switchCompany(newCompany.id);
        onSaved?.();
      } else if (companyId) {
        // Update existing company
        const { error } = await supabase
          .from('companies')
          .update({
            name: formData.name,
            legal_name: formData.legal_name || null,
            siret: formData.siret || null,
            address: formData.address || null,
            phone: formData.phone || null,
            email: formData.email || null,
          })
          .eq('id', companyId);

        if (error) throw error;
        toast.success('Informations mises à jour');
        await refreshCompanies();
        onSaved?.();
      }
    } catch (error) {
      console.error('Error saving company:', error);
      toast.error('Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
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

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>
              {isCreateMode ? 'Nouvelle entreprise' : 'Informations de l\'entreprise'}
            </CardTitle>
            <CardDescription>
              {isCreateMode 
                ? 'Créez une nouvelle entreprise à gérer'
                : 'Gérez les informations générales de votre entreprise'
              }
            </CardDescription>
          </div>
          {isCreateMode && onCancel && (
            <Button variant="ghost" size="icon" onClick={onCancel}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Nom de l'entreprise *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Mon Entreprise"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="legal_name">Raison sociale</Label>
              <Input
                id="legal_name"
                value={formData.legal_name}
                onChange={(e) => setFormData({ ...formData, legal_name: e.target.value })}
                placeholder="Mon Entreprise SAS"
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="siret">SIRET</Label>
              <Input
                id="siret"
                value={formData.siret}
                onChange={(e) => setFormData({ ...formData, siret: e.target.value })}
                placeholder="123 456 789 00012"
                maxLength={17}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="contact@entreprise.fr"
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="phone">Téléphone</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="01 23 45 67 89"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Adresse</Label>
            <Textarea
              id="address"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="123 Rue de la Paix&#10;75001 Paris"
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2">
            {isCreateMode && onCancel && (
              <Button type="button" variant="outline" onClick={onCancel}>
                Annuler
              </Button>
            )}
            <Button type="submit" disabled={saving}>
              {saving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              {isCreateMode ? 'Créer' : 'Enregistrer'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
