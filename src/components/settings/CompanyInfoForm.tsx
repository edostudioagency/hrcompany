import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, Save } from 'lucide-react';

interface Company {
  id: string;
  name: string;
  legal_name: string | null;
  siret: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
}

export function CompanyInfoForm() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [company, setCompany] = useState<Company | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    legal_name: '',
    siret: '',
    address: '',
    phone: '',
    email: '',
  });

  useEffect(() => {
    fetchCompany();
  }, []);

  const fetchCompany = async () => {
    try {
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setCompany(data);
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
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      if (company) {
        const { error } = await supabase
          .from('companies')
          .update(formData)
          .eq('id', company.id);

        if (error) throw error;
        toast.success('Informations mises à jour');
      } else {
        const { data, error } = await supabase
          .from('companies')
          .insert(formData)
          .select()
          .single();

        if (error) throw error;
        setCompany(data);
        toast.success('Entreprise créée');
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
        <CardTitle>Informations de l'entreprise</CardTitle>
        <CardDescription>
          Gérez les informations générales de votre entreprise
        </CardDescription>
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

          <div className="flex justify-end">
            <Button type="submit" disabled={saving}>
              {saving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Enregistrer
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
