// Commission configuration types

export type CommissionType = 'ca' | 'margin_gross' | 'margin_net' | 'fixed' | 'other';

export interface EmployeeCommissionConfig {
  id: string;
  employee_id: string;
  commission_type: CommissionType;
  commission_rate: number;
  fixed_amount_per_unit: number | null;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export const COMMISSION_TYPE_LABELS: Record<CommissionType, string> = {
  ca: 'Chiffre d\'affaires',
  margin_gross: 'Marge brute',
  margin_net: 'Marge nette',
  fixed: 'Montant fixe par vente',
  other: 'Autre (personnalisé)',
};

export const COMMISSION_TYPE_INPUT_LABELS: Record<CommissionType, string> = {
  ca: 'Chiffre d\'affaires réalisé',
  margin_gross: 'Marge brute réalisée',
  margin_net: 'Marge nette réalisée',
  fixed: 'Nombre de ventes',
  other: 'Montant de référence',
};

export const COMMISSION_TYPE_INPUT_PLACEHOLDERS: Record<CommissionType, string> = {
  ca: '50000.00',
  margin_gross: '15000.00',
  margin_net: '10000.00',
  fixed: '10',
  other: '1000.00',
};
