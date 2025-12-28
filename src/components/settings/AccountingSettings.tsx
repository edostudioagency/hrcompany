import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, Save, Calculator, Mail } from 'lucide-react';

interface CompanySettings {
  id: string;
  company_id: string;
  accountant_email: string | null;
  accountant_notification_days: number[];
}

const DAYS_OF_MONTH = Array.from({ length: 31 }, (_, i) => i + 1);

export function AccountingSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [settings, setSettings] = useState<CompanySettings | null>(null);
  const [formData, setFormData] = useState({
    accountant_email: '',
    accountant_notification_days: [1] as number[],
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // First get the company
      const { data: companyData } = await supabase
        .from('companies')
        .select('id')
        .limit(1)
        .maybeSingle();

      if (companyData) {
        setCompanyId(companyData.id);

        // Then get settings
        const { data: settingsData, error } = await supabase
          .from('company_settings')
          .select('id, company_id, accountant_email, accountant_notification_days')
          .eq('company_id', companyData.id)
          .maybeSingle();

        if (error && error.code !== 'PGRST116') throw error;

        if (settingsData) {
          setSettings(settingsData);
          setFormData({
            accountant_email: settingsData.accountant_email || '',
            accountant_notification_days: settingsData.accountant_notification_days || [1],
          });
        }
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
      toast.error('Erreur lors du chargement des paramètres');
    } finally {
      setLoading(false);
    }
  };

  const toggleDay = (day: number) => {
    const days = formData.accountant_notification_days;
    if (days.includes(day)) {
      setFormData({
        ...formData,
        accountant_notification_days: days.filter((d) => d !== day),
      });
    } else {
      setFormData({
        ...formData,
        accountant_notification_days: [...days, day].sort((a, b) => a - b),
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyId) {
      toast.error('Veuillez d\'abord créer une entreprise');
      return;
    }

    setSaving(true);

    try {
      const updateData = {
        accountant_email: formData.accountant_email || null,
        accountant_notification_days: formData.accountant_notification_days,
      };

      if (settings) {
        const { error } = await supabase
          .from('company_settings')
          .update(updateData)
          .eq('id', settings.id);

        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('company_settings')
          .insert({ ...updateData, company_id: companyId })
          .select()
          .single();

        if (error) throw error;
        setSettings(data);
      }
      toast.success('Paramètres de comptabilité enregistrés');
    } catch (error) {
      console.error('Error saving settings:', error);
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
          <Calculator className="h-12 w-12 text-muted-foreground/50 mb-4" />
          <p className="text-muted-foreground">
            Veuillez d'abord créer votre entreprise dans l'onglet "Entreprise"
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Email du comptable</CardTitle>
          </div>
          <CardDescription>
            Adresse email pour l'envoi automatique des informations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="accountant-email">Adresse email</Label>
            <Input
              id="accountant-email"
              type="email"
              value={formData.accountant_email}
              onChange={(e) => setFormData({ ...formData, accountant_email: e.target.value })}
              placeholder="comptable@cabinet.fr"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Calculator className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Jours d'envoi automatique</CardTitle>
          </div>
          <CardDescription>
            Sélectionnez les jours du mois où les informations seront envoyées au comptable
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 sm:grid-cols-10 md:grid-cols-16 gap-2">
            {DAYS_OF_MONTH.map((day) => (
              <label
                key={day}
                className={`
                  flex items-center justify-center w-10 h-10 rounded-lg border cursor-pointer transition-colors
                  ${
                    formData.accountant_notification_days.includes(day)
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background hover:bg-muted border-input'
                  }
                `}
              >
                <Checkbox
                  checked={formData.accountant_notification_days.includes(day)}
                  onCheckedChange={() => toggleDay(day)}
                  className="sr-only"
                />
                <span className="text-sm font-medium">{day}</span>
              </label>
            ))}
          </div>
          <p className="text-sm text-muted-foreground mt-4">
            Jours sélectionnés :{' '}
            {formData.accountant_notification_days.length > 0
              ? formData.accountant_notification_days.join(', ')
              : 'Aucun'}
          </p>
        </CardContent>
      </Card>

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
  );
}
