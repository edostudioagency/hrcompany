import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, Calculator, Info, AlertCircle } from 'lucide-react';
import {
  CommissionType,
  EmployeeCommissionConfig,
  COMMISSION_TYPE_LABELS,
  COMMISSION_TYPE_INPUT_LABELS,
  COMMISSION_TYPE_INPUT_PLACEHOLDERS,
} from '@/types/commission';

interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  status: string;
  salary_type: string | null;
}

interface AddCommissionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employees: Employee[];
  onSuccess: () => void;
}

const MONTHS = [
  { value: 1, label: 'Janvier' },
  { value: 2, label: 'Février' },
  { value: 3, label: 'Mars' },
  { value: 4, label: 'Avril' },
  { value: 5, label: 'Mai' },
  { value: 6, label: 'Juin' },
  { value: 7, label: 'Juillet' },
  { value: 8, label: 'Août' },
  { value: 9, label: 'Septembre' },
  { value: 10, label: 'Octobre' },
  { value: 11, label: 'Novembre' },
  { value: 12, label: 'Décembre' },
];

export function AddCommissionDialog({
  open,
  onOpenChange,
  employees,
  onSuccess,
}: AddCommissionDialogProps) {
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

  const [loading, setLoading] = useState(false);
  const [loadingConfig, setLoadingConfig] = useState(false);
  const [commissionConfig, setCommissionConfig] = useState<EmployeeCommissionConfig | null>(null);

  const [formData, setFormData] = useState({
    employee_id: '',
    month: new Date().getMonth() + 1,
    year: currentYear,
    base_amount: '',
    amount: '',
    description: '',
  });

  const [isManualAmount, setIsManualAmount] = useState(false);

  // Fetch commission config when employee changes
  useEffect(() => {
    const fetchConfig = async () => {
      if (!formData.employee_id) {
        setCommissionConfig(null);
        return;
      }

      setLoadingConfig(true);
      try {
        const { data, error } = await supabase
          .from('employee_commission_configs')
          .select('*')
          .eq('employee_id', formData.employee_id)
          .maybeSingle();

        if (error) throw error;
        setCommissionConfig(data as EmployeeCommissionConfig | null);
      } catch (error) {
        console.error('Error fetching commission config:', error);
        setCommissionConfig(null);
      } finally {
        setLoadingConfig(false);
      }
    };

    fetchConfig();
    // Reset base amount when employee changes
    setFormData((prev) => ({ ...prev, base_amount: '', amount: '' }));
    setIsManualAmount(false);
  }, [formData.employee_id]);

  // Calculate commission amount automatically
  const calculatedAmount = useMemo(() => {
    if (!commissionConfig || !formData.base_amount) return null;

    const baseAmount = parseFloat(formData.base_amount);
    if (isNaN(baseAmount)) return null;

    if (commissionConfig.commission_type === 'fixed') {
      // Fixed amount per unit * number of sales
      const fixedAmount = Number(commissionConfig.fixed_amount_per_unit) || 0;
      return baseAmount * fixedAmount;
    } else {
      // Percentage calculation
      const rate = Number(commissionConfig.commission_rate) || 0;
      return (baseAmount * rate) / 100;
    }
  }, [commissionConfig, formData.base_amount]);

  // Update amount when calculated value changes (if not manual)
  useEffect(() => {
    if (!isManualAmount && calculatedAmount !== null) {
      setFormData((prev) => ({
        ...prev,
        amount: calculatedAmount.toFixed(2),
      }));
    }
  }, [calculatedAmount, isManualAmount]);

  const handleSubmit = async () => {
    if (!formData.employee_id || !formData.amount) {
      toast.error('Veuillez remplir tous les champs obligatoires');
      return;
    }

    setLoading(true);
    try {
      const payload: {
        employee_id: string;
        month: number;
        year: number;
        amount: number;
        description: string | null;
        status: string;
        base_amount?: number;
        commission_rate_used?: number;
      } = {
        employee_id: formData.employee_id,
        month: formData.month,
        year: formData.year,
        amount: parseFloat(formData.amount),
        description: formData.description || null,
        status: 'pending',
      };

      // Add tracking fields if config exists
      if (commissionConfig && formData.base_amount) {
        payload.base_amount = parseFloat(formData.base_amount);
        payload.commission_rate_used = commissionConfig.commission_type === 'fixed'
          ? Number(commissionConfig.fixed_amount_per_unit) || 0
          : Number(commissionConfig.commission_rate) || 0;
      }

      const { error } = await supabase.from('commissions').upsert(payload, {
        onConflict: 'employee_id,month,year',
      });

      if (error) throw error;

      toast.success('Commission enregistrée');
      onOpenChange(false);
      resetForm();
      onSuccess();
    } catch (error) {
      console.error('Error saving commission:', error);
      toast.error("Erreur lors de l'enregistrement");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      employee_id: '',
      month: new Date().getMonth() + 1,
      year: currentYear,
      base_amount: '',
      amount: '',
      description: '',
    });
    setCommissionConfig(null);
    setIsManualAmount(false);
  };

  const selectedEmployee = employees.find((e) => e.id === formData.employee_id);
  const hasCommissionSalary = selectedEmployee?.salary_type === 'commission';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Ajouter une commission</DialogTitle>
          <DialogDescription>Enregistrez une commission pour un employé</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          {/* Employee Selection */}
          <div className="space-y-2">
            <Label>Employé *</Label>
            <Select
              value={formData.employee_id}
              onValueChange={(value) => setFormData({ ...formData, employee_id: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner un employé" />
              </SelectTrigger>
              <SelectContent>
                {[...employees]
                  .sort((a, b) => `${a.first_name} ${a.last_name}`.toLowerCase().localeCompare(`${b.first_name} ${b.last_name}`.toLowerCase(), 'fr'))
                  .map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.first_name} {emp.last_name}
                      {emp.salary_type === 'commission' && (
                        <span className="ml-2 text-xs text-muted-foreground">(avec commission)</span>
                      )}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          {/* Commission Config Info Panel */}
          {loadingConfig && (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          )}

          {formData.employee_id && !loadingConfig && (
            <>
              {commissionConfig ? (
                <Alert className="border-primary/30 bg-primary/5">
                  <Calculator className="h-4 w-4 text-primary" />
                  <AlertTitle className="text-sm font-medium">
                    Configuration de {selectedEmployee?.first_name} {selectedEmployee?.last_name}
                  </AlertTitle>
                  <AlertDescription className="text-sm mt-2 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium">Base :</span>
                      <span>{COMMISSION_TYPE_LABELS[commissionConfig.commission_type as CommissionType]}</span>
                      <span className="text-muted-foreground">|</span>
                      {commissionConfig.commission_type === 'fixed' ? (
                        <span>
                          <span className="font-medium">Montant/vente :</span>{' '}
                          {Number(commissionConfig.fixed_amount_per_unit || 0).toFixed(2)}€
                        </span>
                      ) : (
                        <span>
                          <span className="font-medium">Taux :</span>{' '}
                          {Number(commissionConfig.commission_rate || 0).toFixed(2)}%
                        </span>
                      )}
                    </div>
                    {commissionConfig.description && (
                      <p className="text-muted-foreground italic mt-2">
                        "{commissionConfig.description}"
                      </p>
                    )}
                  </AlertDescription>
                </Alert>
              ) : hasCommissionSalary ? (
                <Alert variant="destructive" className="border-destructive/30 bg-destructive/5">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle className="text-sm">Configuration manquante</AlertTitle>
                  <AlertDescription className="text-sm">
                    Cet employé a un salaire avec commission mais sa configuration n'est pas définie.
                    Veuillez la configurer dans son profil (onglet Contrat).
                  </AlertDescription>
                </Alert>
              ) : (
                <Alert className="border-muted bg-muted/50">
                  <Info className="h-4 w-4" />
                  <AlertTitle className="text-sm">Pas de configuration</AlertTitle>
                  <AlertDescription className="text-sm">
                    Cet employé n'a pas de configuration de commission. Vous pouvez saisir le montant manuellement.
                  </AlertDescription>
                </Alert>
              )}
            </>
          )}

          {/* Month/Year Selection */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Mois</Label>
              <Select
                value={formData.month.toString()}
                onValueChange={(v) => setFormData({ ...formData, month: parseInt(v) })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MONTHS.map((m) => (
                    <SelectItem key={m.value} value={m.value.toString()}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Année</Label>
              <Select
                value={formData.year.toString()}
                onValueChange={(v) => setFormData({ ...formData, year: parseInt(v) })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {years.map((y) => (
                    <SelectItem key={y} value={y.toString()}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Dynamic Base Amount Input */}
          {commissionConfig && (
            <div className="space-y-2">
              <Label>
                {COMMISSION_TYPE_INPUT_LABELS[commissionConfig.commission_type as CommissionType]} *
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.base_amount}
                  onChange={(e) => {
                    setFormData({ ...formData, base_amount: e.target.value });
                    setIsManualAmount(false);
                  }}
                  placeholder={COMMISSION_TYPE_INPUT_PLACEHOLDERS[commissionConfig.commission_type as CommissionType]}
                  className="flex-1"
                />
                {commissionConfig.commission_type !== 'fixed' && (
                  <span className="text-muted-foreground font-medium">€</span>
                )}
              </div>
            </div>
          )}

          {/* Commission Amount */}
          <div className="space-y-2">
            <Label className="flex items-center justify-between">
              <span>Commission calculée *</span>
              {calculatedAmount !== null && !isManualAmount && (
                <span className="text-xs text-muted-foreground font-normal">
                  {commissionConfig?.commission_type === 'fixed'
                    ? `= ${formData.base_amount} × ${Number(commissionConfig?.fixed_amount_per_unit || 0).toFixed(2)}€`
                    : `= ${Number(commissionConfig?.commission_rate || 0).toFixed(2)}% de ${formData.base_amount}€`}
                </span>
              )}
            </Label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                step="0.01"
                min="0"
                value={formData.amount}
                onChange={(e) => {
                  setFormData({ ...formData, amount: e.target.value });
                  setIsManualAmount(true);
                }}
                placeholder="0.00"
                className="flex-1"
              />
              <span className="text-muted-foreground font-medium">€</span>
            </div>
            {isManualAmount && calculatedAmount !== null && (
              <Button
                type="button"
                variant="link"
                size="sm"
                className="h-auto p-0 text-xs"
                onClick={() => {
                  setFormData((prev) => ({ ...prev, amount: calculatedAmount.toFixed(2) }));
                  setIsManualAmount(false);
                }}
              >
                Revenir au montant calculé ({calculatedAmount.toFixed(2)}€)
              </Button>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label>Description (optionnel)</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Détails de la commission..."
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Enregistrer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
