import {
  Company,
  Team,
  Employee,
  Shift,
  TimeOffRequest,
  ShiftSwapRequest,
  DashboardStats,
  Notification,
} from '@/types/hr';

// Mock Companies
export const mockCompanies: Company[] = [
  {
    id: '1',
    name: 'TechCorp',
    legalName: 'TechCorp SAS',
    siret: '123 456 789 00012',
    accountantEmail: 'compta@techcorp.fr',
    defaultWorkSchedule: {
      workDays: [1, 2, 3, 4, 5],
      startTime: '09:00',
      endTime: '18:00',
    },
    createdAt: new Date('2024-01-01'),
  },
  {
    id: '2',
    name: 'RetailPlus',
    legalName: 'RetailPlus SARL',
    siret: '987 654 321 00098',
    accountantEmail: 'comptabilite@retailplus.fr',
    defaultWorkSchedule: {
      workDays: [1, 2, 3, 4, 5, 6],
      startTime: '08:00',
      endTime: '20:00',
    },
    createdAt: new Date('2024-02-15'),
  },
];

// Mock Teams
export const mockTeams: Team[] = [
  { id: '1', companyId: '1', name: 'Développement', primaryApproverId: '2', backupApproverId: '1', createdAt: new Date('2024-01-01') },
  { id: '2', companyId: '1', name: 'Marketing', primaryApproverId: '2', createdAt: new Date('2024-01-01') },
  { id: '3', companyId: '1', name: 'Support Client', primaryApproverId: '1', createdAt: new Date('2024-01-01') },
  { id: '4', companyId: '2', name: 'Vente', primaryApproverId: '6', createdAt: new Date('2024-02-15') },
  { id: '5', companyId: '2', name: 'Logistique', primaryApproverId: '6', createdAt: new Date('2024-02-15') },
];

// Mock Employees
export const mockEmployees: Employee[] = [
  {
    id: '1',
    companyId: '1',
    teamId: '1',
    firstName: 'Marie',
    lastName: 'Dupont',
    email: 'marie.dupont@techcorp.fr',
    role: 'admin',
    hourlyRate: 45,
    active: true,
    createdAt: new Date('2024-01-01'),
  },
  {
    id: '2',
    companyId: '1',
    teamId: '1',
    firstName: 'Pierre',
    lastName: 'Martin',
    email: 'pierre.martin@techcorp.fr',
    role: 'manager',
    hourlyRate: 38,
    active: true,
    createdAt: new Date('2024-01-15'),
  },
  {
    id: '3',
    companyId: '1',
    teamId: '1',
    firstName: 'Sophie',
    lastName: 'Bernard',
    email: 'sophie.bernard@techcorp.fr',
    role: 'employee',
    hourlyRate: 28,
    active: true,
    createdAt: new Date('2024-02-01'),
  },
  {
    id: '4',
    companyId: '1',
    teamId: '2',
    firstName: 'Lucas',
    lastName: 'Petit',
    email: 'lucas.petit@techcorp.fr',
    role: 'employee',
    hourlyRate: 30,
    active: true,
    createdAt: new Date('2024-02-15'),
  },
  {
    id: '5',
    companyId: '1',
    teamId: '3',
    firstName: 'Emma',
    lastName: 'Leroy',
    email: 'emma.leroy@techcorp.fr',
    role: 'employee',
    hourlyRate: 25,
    active: false,
    createdAt: new Date('2024-03-01'),
  },
  {
    id: '6',
    companyId: '2',
    teamId: '4',
    firstName: 'Thomas',
    lastName: 'Moreau',
    email: 'thomas.moreau@retailplus.fr',
    role: 'manager',
    hourlyRate: 35,
    active: true,
    createdAt: new Date('2024-02-15'),
  },
  {
    id: '7',
    companyId: '2',
    teamId: '4',
    firstName: 'Julie',
    lastName: 'Simon',
    email: 'julie.simon@retailplus.fr',
    role: 'employee',
    hourlyRate: 22,
    active: true,
    createdAt: new Date('2024-03-01'),
  },
];

// Generate dates for current month
const today = new Date();
const getDateString = (daysOffset: number) => {
  const date = new Date(today);
  date.setDate(date.getDate() + daysOffset);
  return date.toISOString().split('T')[0];
};

// Mock Shifts
export const mockShifts: Shift[] = [
  {
    id: '1',
    companyId: '1',
    teamId: '1',
    employeeId: '3',
    date: getDateString(0),
    startTime: '09:00',
    endTime: '17:00',
    location: 'Bureau Paris',
    status: 'planned',
  },
  {
    id: '2',
    companyId: '1',
    teamId: '1',
    employeeId: '3',
    date: getDateString(1),
    startTime: '09:00',
    endTime: '17:00',
    location: 'Bureau Paris',
    status: 'planned',
  },
  {
    id: '3',
    companyId: '1',
    teamId: '2',
    employeeId: '4',
    date: getDateString(0),
    startTime: '10:00',
    endTime: '18:00',
    location: 'Télétravail',
    status: 'planned',
  },
  {
    id: '4',
    companyId: '1',
    teamId: '2',
    employeeId: '4',
    date: getDateString(2),
    startTime: '09:00',
    endTime: '17:00',
    location: 'Bureau Paris',
    status: 'planned',
  },
  {
    id: '5',
    companyId: '2',
    teamId: '4',
    employeeId: '7',
    date: getDateString(0),
    startTime: '08:00',
    endTime: '16:00',
    location: 'Magasin Centre',
    status: 'planned',
  },
  {
    id: '6',
    companyId: '1',
    teamId: '1',
    employeeId: '2',
    date: getDateString(-1),
    startTime: '09:00',
    endTime: '17:00',
    location: 'Bureau Paris',
    status: 'completed',
  },
];

// Mock Time Off Requests
export const mockTimeOffRequests: TimeOffRequest[] = [
  {
    id: '1',
    companyId: '1',
    employeeId: '3',
    type: 'conge_paye',
    startDate: getDateString(7),
    endDate: getDateString(12),
    partOfDay: 'full_day',
    reason: 'Vacances en famille',
    status: 'pending',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: '2',
    companyId: '1',
    employeeId: '4',
    type: 'rtt',
    startDate: getDateString(3),
    endDate: getDateString(3),
    partOfDay: 'full_day',
    reason: 'Rendez-vous personnel',
    status: 'approved',
    approverId: '2',
    createdAt: new Date(Date.now() - 86400000 * 2),
    updatedAt: new Date(Date.now() - 86400000),
  },
  {
    id: '3',
    companyId: '1',
    employeeId: '3',
    type: 'maladie',
    startDate: getDateString(-5),
    endDate: getDateString(-3),
    partOfDay: 'full_day',
    reason: 'Grippe',
    status: 'approved',
    approverId: '2',
    createdAt: new Date(Date.now() - 86400000 * 6),
    updatedAt: new Date(Date.now() - 86400000 * 5),
  },
  {
    id: '4',
    companyId: '2',
    employeeId: '7',
    type: 'conge_paye',
    startDate: getDateString(14),
    endDate: getDateString(21),
    partOfDay: 'full_day',
    reason: 'Voyage',
    status: 'pending',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

// Mock Shift Swap Requests
export const mockShiftSwapRequests: ShiftSwapRequest[] = [
  {
    id: '1',
    companyId: '1',
    fromShiftId: '1',
    toShiftId: '3',
    requesterId: '3',
    targetEmployeeId: '4',
    status: 'pending',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

// Dashboard stats for a company
export const getMockDashboardStats = (companyId: string): DashboardStats => {
  const companyEmployees = mockEmployees.filter(e => e.companyId === companyId);
  const companyTimeOff = mockTimeOffRequests.filter(t => t.companyId === companyId);
  const companySwaps = mockShiftSwapRequests.filter(s => s.companyId === companyId);
  const companyShifts = mockShifts.filter(s => s.companyId === companyId);

  return {
    totalEmployees: companyEmployees.length,
    activeEmployees: companyEmployees.filter(e => e.active).length,
    pendingTimeOffRequests: companyTimeOff.filter(t => t.status === 'pending').length,
    pendingShiftSwaps: companySwaps.filter(s => s.status === 'pending').length,
    shiftsThisWeek: companyShifts.filter(s => s.status === 'planned').length,
    upcomingTimeOff: companyTimeOff.filter(t => t.status === 'approved' && new Date(t.startDate) > today).length,
  };
};

// Helper to get employee with relations
export const getEmployeeWithRelations = (employeeId: string): Employee | undefined => {
  return mockEmployees.find(e => e.id === employeeId);
};

// Helper to get time off requests with employee data
export const getTimeOffRequestsWithEmployees = (companyId: string): TimeOffRequest[] => {
  return mockTimeOffRequests
    .filter(t => t.companyId === companyId)
    .map(t => ({
      ...t,
      employee: mockEmployees.find(e => e.id === t.employeeId),
      approver: t.approverId ? mockEmployees.find(e => e.id === t.approverId) : undefined,
    }));
};

// Helper to get shifts with employee data
export const getShiftsWithEmployees = (companyId: string): Shift[] => {
  return mockShifts
    .filter(s => s.companyId === companyId)
    .map(s => ({
      ...s,
      employee: mockEmployees.find(e => e.id === s.employeeId),
    }));
};

// Helper to get shift swap requests with relations
export const getShiftSwapsWithRelations = (companyId: string): ShiftSwapRequest[] => {
  return mockShiftSwapRequests
    .filter(s => s.companyId === companyId)
    .map(s => ({
      ...s,
      fromShift: mockShifts.find(shift => shift.id === s.fromShiftId),
      toShift: s.toShiftId ? mockShifts.find(shift => shift.id === s.toShiftId) : undefined,
      requester: mockEmployees.find(e => e.id === s.requesterId),
      targetEmployee: mockEmployees.find(e => e.id === s.targetEmployeeId),
    }));
};

// Mock Notifications
export const mockNotifications: Notification[] = [
  {
    id: '1',
    companyId: '1',
    userId: '1',
    type: 'time_off_request',
    title: 'Nouvelle demande de congé',
    message: 'Sophie Bernard a demandé un congé payé du 30 décembre au 4 janvier.',
    read: false,
    relatedId: '1',
    createdAt: new Date(Date.now() - 1800000), // 30 min ago
  },
  {
    id: '2',
    companyId: '1',
    userId: '1',
    type: 'shift_swap_request',
    title: 'Demande d\'échange de shift',
    message: 'Sophie Bernard souhaite échanger son shift avec Lucas Petit.',
    read: false,
    relatedId: '1',
    createdAt: new Date(Date.now() - 3600000), // 1 hour ago
  },
  {
    id: '3',
    companyId: '1',
    userId: '2',
    type: 'time_off_request',
    title: 'Nouvelle demande de congé',
    message: 'Sophie Bernard a demandé un congé payé.',
    read: true,
    relatedId: '1',
    createdAt: new Date(Date.now() - 86400000), // 1 day ago
  },
];

// Helper to get notifications for a user
export const getNotificationsForUser = (userId: string, companyId: string): Notification[] => {
  return mockNotifications
    .filter(n => n.userId === userId && n.companyId === companyId)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
};

// Helper to get teams with approvers
export const getTeamsWithApprovers = (companyId: string) => {
  return mockTeams
    .filter(t => t.companyId === companyId)
    .map(t => ({
      ...t,
      primaryApprover: t.primaryApproverId ? mockEmployees.find(e => e.id === t.primaryApproverId) : undefined,
      backupApprover: t.backupApproverId ? mockEmployees.find(e => e.id === t.backupApproverId) : undefined,
    }));
};

// Helper to calculate shift hours
export const calculateShiftHours = (startTime: string, endTime: string): number => {
  const [startH, startM] = startTime.split(':').map(Number);
  const [endH, endM] = endTime.split(':').map(Number);
  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;
  return (endMinutes - startMinutes) / 60;
};
