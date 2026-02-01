import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Percent, Calculator } from 'lucide-react';
import { CommissionType, COMMISSION_TYPE_LABELS } from '@/types/commission';

interface CommissionConfigSectionProps {
  employeeId: string;
  salaryType: string;
}

interface CommissionConfig {
  id?: string;
  commission_type: CommissionType;
  commission_rate: number;
  fixed_amount_per_unit: number | null;
  description: string | null;
}

export function CommissionConfigSection({ employeeId, salaryType }: CommissionConfigSectionProps) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState<CommissionConfig>({
    commission_type: 'ca',
    commission_rate: 0,
    fixed_amount_per_unit: null,
    description: null,
  });

  useEffect(() => {
    if (salaryType === 'commission') {
      fetchConfig();
    }
  }, [employeeId, salaryType]);

  const fetchConfig = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('employee_commission_configs')
        .select('*')
        .eq('employee_id', employeeId)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setConfig({
          id: data.id,
          commission_type: data.commission_type as CommissionType,
          commission_rate: Number(data.commission_rate),
          fixed_amount_per_unit: data.fixed_amount_per_unit ? Number(data.fixed_amount_per_unit) : null,
          description: data.description,
        });
      }
    } catch (error) {
      console.error('Error fetching commission config:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        employee_id: employeeId,
        commission_type: config.commission_type,
        commission_rate: config.commission_rate,
        fixed_amount_per_unit: config.commission_type === 'fixed' ? config.fixed_amount_per_unit : null,
        description: config.description,
      };

      if (config.id) {
        const { error } = await supabase
          .from('employee_commission_configs')
          .update(payload)
          .eq('id', config.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('employee_commission_configs')
          .insert(payload);
        if (error) throw error;
      }

      toast.success('Configuration des commissions enregistrée');
      fetchConfig();
    } catch (error) {
      console.error('Error saving commission config:', error);
      toast.error('Erreur lors de l\'enregistrement');
    } finally {
      setSaving(false);
    }
  };

  // Don't show if salary type is not commission
  if (salaryType !== 'commission') {
    return null;
  }

  if (loading) {
    return (
      <Card className="mt-4 border-dashed border-primary/30 bg-primary/5">
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mt-4 border-dashed border-primary/30 bg-primary/5">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Calculator className="h-4 w-4 text-primary" />
          Configuration des commissions
        </CardTitle>
        <CardDescription>
          Définissez les modalités de calcul des commissions pour cet employé
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Type de base de calcul</Label>
          <Select
            value={config.commission_type}
            onValueChange={(value) => setConfig({ ...config, commission_type: value as CommissionType })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Sélectionner le type" />
            </SelectTrigger>
            <SelectContent>
              {(Object.entries(COMMISSION_TYPE_LABELS) as [CommissionType, string][]).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {config.commission_type === 'fixed' ? (
          <div className="space-y-2">
            <Label>Montant fixe par vente (€)</Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={config.fixed_amount_per_unit || ''}
              onChange={(e) => setConfig({ 
                ...config, 
                fixed_amount_per_unit: e.target.value ? parseFloat(e.target.value) : null 
              })}
              placeholder="50.00"
            />
          </div>
        ) : (
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              Taux de commission
              <Percent className="h-3 w-3 text-muted-foreground" />
            </Label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={config.commission_rate || ''}
                onChange={(e) => setConfig({ 
                  ...config, 
                  commission_rate: e.target.value ? parseFloat(e.target.value) : 0 
                })}
                placeholder="5.00"
                className="flex-1"
              />
              <span className="text-muted-foreground font-medium">%</span>
            </div>
          </div>
        )}

        <div className="space-y-2">
          <Label>Description des modalités (optionnel)</Label>
          <Textarea
            value={config.description || ''}
            onChange={(e) => setConfig({ ...config, description: e.target.value || null })}
            placeholder="Ex: 5% du CA HT réalisé sur les ventes directes, hors remises..."
            rows={3}
          />
          <p className="text-xs text-muted-foreground">
            Ce rappel sera affiché lors de l'ajout d'une commission
          </p>
        </div>

        <Button onClick={handleSave} disabled={saving} className="w-full">
          {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Enregistrer la configuration
        </Button>
      </CardContent>
    </Card>
  );
}
