import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, Save, Building2 } from 'lucide-react';
import { ImageUpload } from '@/components/ui/image-upload';

interface CompanyInfoFormProps {
  companyId?: string | null;
}

export function CompanyInfoForm({ companyId }: CompanyInfoFormProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    legal_name: '',
    siret: '',
    address: '',
    phone: '',
    email: '',
  });

  useEffect(() => {
    if (companyId) {
      fetchCompany(companyId);
    } else {
      setLoading(false);
    }
  }, [companyId]);

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
        setLogoUrl(data.logo_url || null);
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
    
    if (!companyId) {
      toast.error('Aucune entreprise sélectionnée');
      return;
    }

    if (!formData.name.trim()) {
      toast.error('Le nom de l\'entreprise est requis');
      return;
    }
    
    setSaving(true);

    try {
      const { error } = await supabase
        .from('companies')
        .update({
          name: formData.name,
          legal_name: formData.legal_name || null,
          siret: formData.siret || null,
          address: formData.address || null,
          phone: formData.phone || null,
          email: formData.email || null,
          logo_url: logoUrl,
        })
        .eq('id', companyId);

      if (error) throw error;
      toast.success('Entreprise mise à jour');
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

  if (!companyId) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-8 text-center">
          <Building2 className="h-12 w-12 text-muted-foreground/50 mb-4" />
          <p className="text-muted-foreground">
            Sélectionnez une entreprise à modifier
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Informations de l'entreprise</CardTitle>
        <CardDescription>
          Modifiez les informations de votre entreprise
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex justify-center pb-4 border-b">
            <ImageUpload
              currentImageUrl={logoUrl}
              onImageChange={setLogoUrl}
              folder={`companies/${companyId}`}
              variant="logo"
              size="lg"
            />
          </div>
          
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
