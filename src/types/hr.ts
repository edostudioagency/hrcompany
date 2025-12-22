// Enums
export type UserRole = 'employee' | 'manager' | 'admin';
export type ShiftStatus = 'planned' | 'completed' | 'cancelled';
export type TimeOffType = 'conge_paye' | 'rtt' | 'maladie' | 'sans_solde' | 'autre';
export type RequestStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';
export type PartOfDay = 'full_day' | 'morning' | 'afternoon';
export type ExportFormat = 'csv' | 'xlsx';

// Models
export interface Company {
  id: string;
  name: string;
  legalName: string;
  siret?: string;
  defaultWorkSchedule?: WorkSchedule;
  createdAt: Date;
}

export interface WorkSchedule {
  workDays: number[]; // 0-6, Sunday = 0
  startTime: string;
  endTime: string;
}

export interface Team {
  id: string;
  companyId: string;
  name: string;
  createdAt: Date;
}

export interface Employee {
  id: string;
  companyId: string;
  teamId?: string;
  firstName: string;
  lastName: string;
  email: string;
  role: UserRole;
  hourlyRate?: number;
  active: boolean;
  avatarUrl?: string;
  createdAt: Date;
}

export interface Shift {
  id: string;
  companyId: string;
  teamId?: string;
  employeeId: string;
  date: string;
  startTime: string;
  endTime: string;
  location?: string;
  status: ShiftStatus;
  employee?: Employee;
}

export interface TimeOffRequest {
  id: string;
  companyId: string;
  employeeId: string;
  type: TimeOffType;
  startDate: string;
  endDate: string;
  partOfDay: PartOfDay;
  reason?: string;
  status: RequestStatus;
  approverId?: string;
  createdAt: Date;
  updatedAt: Date;
  employee?: Employee;
  approver?: Employee;
}

export interface ShiftSwapRequest {
  id: string;
  companyId: string;
  fromShiftId: string;
  toShiftId?: string;
  requesterId: string;
  targetEmployeeId: string;
  status: RequestStatus;
  createdAt: Date;
  updatedAt: Date;
  fromShift?: Shift;
  toShift?: Shift;
  requester?: Employee;
  targetEmployee?: Employee;
}

export interface AccountingExportConfig {
  id: string;
  companyId: string;
  exportFormat: ExportFormat;
  timeOffCodeCongePaye: string;
  timeOffCodeRtt: string;
  timeOffCodeMaladie: string;
  timeOffCodeSansSolde: string;
  timeOffCodeAutre: string;
}

export interface MonthlyExport {
  id: string;
  companyId: string;
  month: number;
  year: number;
  generatedAt: Date;
  generatedById: string;
  fileUrl: string;
  generatedBy?: Employee;
}

// Statistics
export interface DashboardStats {
  totalEmployees: number;
  activeEmployees: number;
  pendingTimeOffRequests: number;
  pendingShiftSwaps: number;
  shiftsThisWeek: number;
  upcomingTimeOff: number;
}

// Time off type labels
export const TIME_OFF_TYPE_LABELS: Record<TimeOffType, string> = {
  conge_paye: 'Congé payé',
  rtt: 'RTT',
  maladie: 'Maladie',
  sans_solde: 'Sans solde',
  autre: 'Autre',
};

export const REQUEST_STATUS_LABELS: Record<RequestStatus, string> = {
  pending: 'En attente',
  approved: 'Approuvé',
  rejected: 'Refusé',
  cancelled: 'Annulé',
};

export const PART_OF_DAY_LABELS: Record<PartOfDay, string> = {
  full_day: 'Journée complète',
  morning: 'Matin',
  afternoon: 'Après-midi',
};

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Administrateur',
  manager: 'Manager',
  employee: 'Employé',
};
