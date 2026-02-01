import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';
import { toast } from 'sonner';
import { Loader2, Save, Calculator, Mail, Settings2 } from 'lucide-react';
import { CommissionsSendSection } from './CommissionsSendSection';

interface CompanySettings {
  id: string;
  company_id: string;
  accountant_email: string | null;
  accountant_notification_days: number[];
  commissions_send_mode: 'manual' | 'automatic';
}

const DAYS_OF_MONTH = Array.from({ length: 31 }, (_, i) => i + 1);

export function AccountingSettings() {
  const { currentCompany } = useCompany();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<CompanySettings | null>(null);
  const [formData, setFormData] = useState({
    accountant_email: '',
    accountant_notification_days: [1] as number[],
    commissions_send_mode: 'manual' as 'manual' | 'automatic',
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
      const { data: settingsData, error } = await supabase
        .from('company_settings')
        .select('id, company_id, accountant_email, accountant_notification_days, commissions_send_mode')
        .eq('company_id', currentCompany.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;

      if (settingsData) {
        setSettings(settingsData as CompanySettings);
        setFormData({
          accountant_email: settingsData.accountant_email || '',
          accountant_notification_days: settingsData.accountant_notification_days || [1],
          commissions_send_mode: (settingsData.commissions_send_mode as 'manual' | 'automatic') || 'manual',
        });
      } else {
        setSettings(null);
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
    if (!currentCompany?.id) {
      toast.error('Veuillez d\'abord créer une entreprise');
      return;
    }

    setSaving(true);

    try {
      const updateData = {
        accountant_email: formData.accountant_email || null,
        accountant_notification_days: formData.accountant_notification_days,
        commissions_send_mode: formData.commissions_send_mode,
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
          .insert({ ...updateData, company_id: currentCompany.id })
          .select()
          .single();

        if (error) throw error;
        setSettings(data as CompanySettings);
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

  if (!currentCompany?.id) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-8 text-center">
          <Calculator className="h-12 w-12 text-muted-foreground/50 mb-4" />
          <p className="text-muted-foreground">
            Veuillez d'abord sélectionner une entreprise
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
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

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Settings2 className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Mode d'envoi des commissions</CardTitle>
            </div>
            <CardDescription>
              Choisissez comment les commissions seront envoyées au comptable
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RadioGroup
              value={formData.commissions_send_mode}
              onValueChange={(value: 'manual' | 'automatic') => 
                setFormData({ ...formData, commissions_send_mode: value })
              }
              className="space-y-4"
            >
              <div className="flex items-start space-x-3 rounded-lg border p-4 cursor-pointer hover:bg-muted/50 transition-colors">
                <RadioGroupItem value="manual" id="manual" className="mt-1" />
                <div className="space-y-1">
                  <Label htmlFor="manual" className="font-medium cursor-pointer">
                    Envoi manuel
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Envoyez les commissions quand vous le souhaitez via le bouton ci-dessous
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-3 rounded-lg border p-4 cursor-pointer hover:bg-muted/50 transition-colors">
                <RadioGroupItem value="automatic" id="automatic" className="mt-1" />
                <div className="space-y-1">
                  <Label htmlFor="automatic" className="font-medium cursor-pointer">
                    Envoi automatique avec les absences
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Les commissions seront incluses dans l'envoi automatique programmé avec les congés et arrêts maladie
                  </p>
                </div>
              </div>
            </RadioGroup>
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

      <CommissionsSendSection 
        accountantEmail={formData.accountant_email || null} 
        sendMode={formData.commissions_send_mode}
        notificationDays={formData.accountant_notification_days}
      />
    </div>
  );
}