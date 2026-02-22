import { addDays, getYear, isWeekend, eachDayOfInterval, isSameDay, getDay } from 'date-fns';

/**
 * French public holidays calculator
 * Includes both fixed and movable holidays
 */

// Calculate Easter Sunday using the Anonymous Gregorian algorithm
function getEasterSunday(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

// Get all French public holidays for a given year
export function getFrenchPublicHolidays(year: number): Date[] {
  const easter = getEasterSunday(year);
  
  const holidays: Date[] = [
    // Fixed holidays
    new Date(year, 0, 1),   // Jour de l'An - 1er janvier
    new Date(year, 4, 1),   // Fête du Travail - 1er mai
    new Date(year, 4, 8),   // Victoire 1945 - 8 mai
    new Date(year, 6, 14),  // Fête nationale - 14 juillet
    new Date(year, 7, 15),  // Assomption - 15 août
    new Date(year, 10, 1),  // Toussaint - 1er novembre
    new Date(year, 10, 11), // Armistice 1918 - 11 novembre
    new Date(year, 11, 25), // Noël - 25 décembre
    
    // Movable holidays based on Easter
    addDays(easter, 1),     // Lundi de Pâques
    addDays(easter, 39),    // Ascension (jeudi)
    addDays(easter, 50),    // Lundi de Pentecôte
  ];
  
  return holidays;
}

// Check if a date is a French public holiday
export function isFrenchPublicHoliday(date: Date): boolean {
  const year = getYear(date);
  const holidays = getFrenchPublicHolidays(year);
  return holidays.some(holiday => isSameDay(holiday, date));
}

export interface EmployeeSchedule {
  day_of_week: number; // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  is_working_day: boolean;
}

// Default schedule: Monday to Friday
const DEFAULT_WORKING_DAYS = [1, 2, 3, 4, 5]; // Monday to Friday

/**
 * Calculate working days between two dates
 * Takes into account:
 * - Employee's work schedule (which days they work)
 * - French public holidays
 * - Part of day (full day, morning, or afternoon)
 */
export function calculateWorkingDays(
  startDate: Date,
  endDate: Date,
  partOfDay: 'full_day' | 'morning' | 'afternoon' = 'full_day',
  employeeSchedule?: EmployeeSchedule[]
): number {
  // Determine which days are working days for this employee
  const workingDays = employeeSchedule
    ? employeeSchedule.filter(s => s.is_working_day).map(s => s.day_of_week)
    : DEFAULT_WORKING_DAYS;

  // Get all days in the range
  const allDays = eachDayOfInterval({ start: startDate, end: endDate });
  
  // Filter to only working days (not weekends for this employee, not holidays)
  const workingDaysInRange = allDays.filter(date => {
    const dayOfWeek = getDay(date);
    const isEmployeeWorkingDay = workingDays.includes(dayOfWeek);
    const isHoliday = isFrenchPublicHoliday(date);
    return isEmployeeWorkingDay && !isHoliday;
  });

  let totalDays = workingDaysInRange.length;

  // Adjust for part of day (only applies if it's a single day or for the boundaries)
  if (partOfDay !== 'full_day' && totalDays > 0) {
    // For half days, we subtract 0.5 from the total
    // If it's a single day, it counts as 0.5
    // If it's multiple days, only the first/last day is half
    if (totalDays === 1) {
      totalDays = 0.5;
    } else {
      totalDays -= 0.5;
    }
  }

  return totalDays;
}

/**
 * Format the number of days for display
 */
export function formatDaysCount(days: number): string {
  if (days === 0) return '0 jour';
  if (days === 0.5) return '½ jour';
  if (days === 1) return '1 jour';
  if (days % 1 === 0.5) return `${Math.floor(days)}½ jours`;
  return `${days} jours`;
}

/**
 * Get leave type label
 */
export const LEAVE_TYPE_LABELS: Record<string, string> = {
  conge_paye: 'Congés payés',
  vacation: 'Congés payés',
  rtt: 'RTT',
  maladie: 'Maladie',
  sick: 'Maladie',
  sans_solde: 'Sans solde',
  personal: 'Personnel',
  autre: 'Autre',
  other: 'Autre',
  // Congés légaux événements familiaux (Art. L3142-1 Code du travail)
  marriage: 'Mariage (4j)',
  pacs: 'PACS (4j)',
  birth: 'Naissance / Adoption (3j)',
  death: 'Décès (3-5j)',
  move: 'Déménagement',
};

/**
 * Get default annual entitlement by leave type (in days)
 * Based on French labor law standards
 */
export const DEFAULT_ANNUAL_ENTITLEMENTS: Record<string, number> = {
  conge_paye: 25,  // 25 days paid leave (5 weeks)
  vacation: 25,
  rtt: 10,         // RTT depends on company, typically 10-12
  maladie: 0,      // Sick leave is not capped
  sick: 0,
  sans_solde: 0,   // Unpaid leave is not limited
  personal: 0,
  autre: 0,
  other: 0,
};
