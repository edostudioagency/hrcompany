import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, Save, ArrowLeftRight, Calendar, Clock } from 'lucide-react';

interface CompanySettings {
  id: string;
  company_id: string;
  allow_shift_swaps: boolean;
  annual_paid_leave_days: number;
  paid_leave_per_month: number;
  rtt_days_per_year: number;
  sick_leave_accrual: boolean;
  sick_leave_accrual_rate: number;
  default_work_hours_per_day: number;
  weekly_hours: number;
}

export function RulesSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [settings, setSettings] = useState<CompanySettings | null>(null);
  const [formData, setFormData] = useState({
    allow_shift_swaps: true,
    annual_paid_leave_days: 25,
    paid_leave_per_month: 2.08,
    rtt_days_per_year: 10,
    sick_leave_accrual: false,
    sick_leave_accrual_rate: 0,
    default_work_hours_per_day: 7,
    weekly_hours: 35,
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
          .select('*')
          .eq('company_id', companyData.id)
          .maybeSingle();

        if (error && error.code !== 'PGRST116') throw error;

        if (settingsData) {
          setSettings(settingsData);
          setFormData({
            allow_shift_swaps: settingsData.allow_shift_swaps ?? true,
            annual_paid_leave_days: Number(settingsData.annual_paid_leave_days) || 25,
            paid_leave_per_month: Number(settingsData.paid_leave_per_month) || 2.08,
            rtt_days_per_year: settingsData.rtt_days_per_year || 10,
            sick_leave_accrual: settingsData.sick_leave_accrual ?? false,
            sick_leave_accrual_rate: Number(settingsData.sick_leave_accrual_rate) || 0,
            default_work_hours_per_day: Number(settingsData.default_work_hours_per_day) || 7,
            weekly_hours: Number(settingsData.weekly_hours) || 35,
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyId) {
      toast.error('Veuillez d\'abord créer une entreprise');
      return;
    }

    setSaving(true);

    try {
      if (settings) {
        const { error } = await supabase
          .from('company_settings')
          .update(formData)
          .eq('id', settings.id);

        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('company_settings')
          .insert({ ...formData, company_id: companyId })
          .select()
          .single();

        if (error) throw error;
        setSettings(data);
      }
      toast.success('Paramètres enregistrés');
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
          <Calendar className="h-12 w-12 text-muted-foreground/50 mb-4" />
          <p className="text-muted-foreground">
            Veuillez d'abord créer votre entreprise dans l'onglet "Entreprise"
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Shift Swaps */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <ArrowLeftRight className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Échanges de shifts</CardTitle>
          </div>
          <CardDescription>
            Configurez les règles d'échange entre employés
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="allow-swaps">Autoriser les échanges</Label>
              <p className="text-sm text-muted-foreground">
                Permet aux employés de demander des échanges de shifts
              </p>
            </div>
            <Switch
              id="allow-swaps"
              checked={formData.allow_shift_swaps}
              onCheckedChange={(checked) =>
                setFormData({ ...formData, allow_shift_swaps: checked })
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Collective Agreement */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Convention collective - Congés</CardTitle>
          </div>
          <CardDescription>
            Paramètres des congés selon votre convention collective
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="annual-leave">Jours de CP annuels</Label>
              <Input
                id="annual-leave"
                type="number"
                min={0}
                step={0.5}
                value={formData.annual_paid_leave_days}
                onChange={(e) =>
                  setFormData({ ...formData, annual_paid_leave_days: parseFloat(e.target.value) || 0 })
                }
              />
              <p className="text-xs text-muted-foreground">Généralement 25 jours ouvrés</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="monthly-leave">CP cumulés par mois</Label>
              <Input
                id="monthly-leave"
                type="number"
                min={0}
                step={0.01}
                value={formData.paid_leave_per_month}
                onChange={(e) =>
                  setFormData({ ...formData, paid_leave_per_month: parseFloat(e.target.value) || 0 })
                }
              />
              <p className="text-xs text-muted-foreground">Généralement 2.08 jours/mois</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="rtt-days">Jours de RTT par an (cadres)</Label>
            <Input
              id="rtt-days"
              type="number"
              min={0}
              value={formData.rtt_days_per_year}
              onChange={(e) =>
                setFormData({ ...formData, rtt_days_per_year: parseInt(e.target.value) || 0 })
              }
            />
            <p className="text-xs text-muted-foreground">
              Applicable uniquement aux employés ayant le statut cadre
            </p>
          </div>

          <Separator />

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="sick-accrual">Cumul CP pendant arrêt maladie</Label>
                <p className="text-sm text-muted-foreground">
                  Conformément à la loi, les employés cumulent des CP pendant leur arrêt maladie
                </p>
              </div>
              <Switch
                id="sick-accrual"
                checked={formData.sick_leave_accrual}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, sick_leave_accrual: checked })
                }
              />
            </div>

            {formData.sick_leave_accrual && (
              <div className="space-y-2">
                <Label htmlFor="sick-rate">Jours de CP cumulés par mois d'arrêt</Label>
                <Input
                  id="sick-rate"
                  type="number"
                  min={0}
                  max={5}
                  step={0.01}
                  value={formData.sick_leave_accrual_rate}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      sick_leave_accrual_rate: parseFloat(e.target.value) || 0,
                    })
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Exemple : 2.08 jours/mois = même cumul qu'en activité
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Working Hours */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Horaires de travail</CardTitle>
          </div>
          <CardDescription>
            Définissez les horaires par défaut
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="daily-hours">Heures par jour</Label>
              <Input
                id="daily-hours"
                type="number"
                min={0}
                step={0.5}
                value={formData.default_work_hours_per_day}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    default_work_hours_per_day: parseFloat(e.target.value) || 0,
                  })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="weekly-hours">Heures hebdomadaires</Label>
              <Input
                id="weekly-hours"
                type="number"
                min={0}
                step={0.5}
                value={formData.weekly_hours}
                onChange={(e) =>
                  setFormData({ ...formData, weekly_hours: parseFloat(e.target.value) || 0 })
                }
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" disabled={saving}>
          {saving ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          Enregistrer les paramètres
        </Button>
      </div>
    </form>
  );
}
