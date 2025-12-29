import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useCompany } from '@/contexts/CompanyContext';
import { toast } from 'sonner';
import { Loader2, Save, Building2, ArrowLeft } from 'lucide-react';

export default function CreateCompany() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { refreshCompanies, switchCompany } = useCompany();
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    legal_name: '',
    email: '',
    phone: '',
    address: '',
    siret: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast.error('Le nom de l\'entreprise est requis');
      return;
    }

    if (!user) {
      toast.error('Vous devez être connecté');
      return;
    }

    setSaving(true);

    try {
      // 1. Create the company
      const { data: newCompany, error: companyError } = await supabase
        .from('companies')
        .insert({
          name: formData.name.trim(),
          legal_name: formData.legal_name.trim() || null,
          email: formData.email.trim() || null,
          phone: formData.phone.trim() || null,
          address: formData.address.trim() || null,
          siret: formData.siret.trim() || null,
        })
        .select()
        .single();

      if (companyError) throw companyError;

      // 2. Create user_companies association
      const { error: userCompanyError } = await supabase
        .from('user_companies')
        .insert({
          user_id: user.id,
          company_id: newCompany.id,
          is_default: false,
        });

      if (userCompanyError) throw userCompanyError;

      // 3. Get user profile info
      const { data: profile } = await supabase
        .from('profiles')
        .select('first_name, last_name, email')
        .eq('id', user.id)
        .maybeSingle();

      // 4. Create employee record for the admin
      const { error: employeeError } = await supabase
        .from('employees')
        .insert({
          user_id: user.id,
          company_id: newCompany.id,
          first_name: profile?.first_name || user.email?.split('@')[0] || 'Admin',
          last_name: profile?.last_name || '',
          email: profile?.email || user.email || '',
          status: 'active',
          position: 'Administrateur',
        });

      if (employeeError) {
        console.error('Error creating admin employee:', employeeError);
        // Continue anyway
      }

      // 5. Create default company_settings
      const { error: settingsError } = await supabase
        .from('company_settings')
        .insert({
          company_id: newCompany.id,
        });

      if (settingsError) {
        console.error('Error creating settings:', settingsError);
        // Continue anyway, settings can be created later
      }

      toast.success('Entreprise créée avec succès');
      
      // 6. Refresh companies and switch to new one
      await refreshCompanies();
      switchCompany(newCompany.id);
      
      // 7. Navigate to settings
      navigate('/settings');
    } catch (error) {
      console.error('Error creating company:', error);
      toast.error('Erreur lors de la création de l\'entreprise');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-2xl py-8">
        <Button
          variant="ghost"
          className="mb-6"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Retour
        </Button>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Building2 className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle>Créer une nouvelle structure</CardTitle>
                <CardDescription>
                  Renseignez les informations de votre nouvelle entreprise
                </CardDescription>
              </div>
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
                    placeholder="Ma Société"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="legal_name">Raison sociale</Label>
                  <Input
                    id="legal_name"
                    value={formData.legal_name}
                    onChange={(e) => setFormData({ ...formData, legal_name: e.target.value })}
                    placeholder="MA SOCIÉTÉ SAS"
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="contact@masociete.fr"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Téléphone</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="01 23 45 67 89"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Adresse</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="123 rue de la Paix, 75001 Paris"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="siret">SIRET</Label>
                <Input
                  id="siret"
                  value={formData.siret}
                  onChange={(e) => setFormData({ ...formData, siret: e.target.value })}
                  placeholder="123 456 789 00001"
                  maxLength={17}
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate(-1)}
                >
                  Annuler
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="mr-2 h-4 w-4" />
                  )}
                  Créer l'entreprise
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
