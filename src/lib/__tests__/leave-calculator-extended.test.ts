import { describe, it, expect } from 'vitest';
import {
  getFrenchPublicHolidays,
  isFrenchPublicHoliday,
  calculateWorkingDays,
  formatDaysCount,
  LEAVE_TYPE_LABELS,
  DEFAULT_ANNUAL_ENTITLEMENTS,
} from '../leave-calculator';

describe('leave-calculator - extended tests', () => {
  describe('getFrenchPublicHolidays', () => {
    it('should return 11 holidays for any year', () => {
      expect(getFrenchPublicHolidays(2025)).toHaveLength(11);
      expect(getFrenchPublicHolidays(2026)).toHaveLength(11);
      expect(getFrenchPublicHolidays(2024)).toHaveLength(11);
    });

    it('should include all fixed holidays', () => {
      const holidays = getFrenchPublicHolidays(2025);
      const dates = holidays.map(d => `${d.getMonth() + 1}-${d.getDate()}`);

      expect(dates).toContain('1-1');    // Jour de l'An
      expect(dates).toContain('5-1');    // Fête du Travail
      expect(dates).toContain('5-8');    // Victoire 1945
      expect(dates).toContain('7-14');   // Fête nationale
      expect(dates).toContain('8-15');   // Assomption
      expect(dates).toContain('11-1');   // Toussaint
      expect(dates).toContain('11-11');  // Armistice
      expect(dates).toContain('12-25');  // Noël
    });

    it('should compute Easter 2026 correctly (April 5)', () => {
      const holidays = getFrenchPublicHolidays(2026);
      // Easter Monday 2026 = April 6
      const easterMonday = holidays.find(
        d => d.getMonth() === 3 && d.getDate() === 6
      );
      expect(easterMonday).toBeDefined();
    });

    it('should compute Ascension from Easter', () => {
      const holidays = getFrenchPublicHolidays(2025);
      // Easter 2025 = April 20, Ascension = +39 = May 29
      const ascension = holidays.find(
        d => d.getMonth() === 4 && d.getDate() === 29
      );
      expect(ascension).toBeDefined();
    });

    it('should compute Whit Monday from Easter', () => {
      const holidays = getFrenchPublicHolidays(2025);
      // Easter 2025 = April 20, Pentecôte = +50 = June 9
      const whitMonday = holidays.find(
        d => d.getMonth() === 5 && d.getDate() === 9
      );
      expect(whitMonday).toBeDefined();
    });
  });

  describe('calculateWorkingDays - edge cases', () => {
    it('should return 1 for a single working day', () => {
      const date = new Date(2025, 1, 3); // Monday
      expect(calculateWorkingDays(date, date)).toBe(1);
    });

    it('should return 0 for a single day that is a holiday', () => {
      // January 1, 2025 is a holiday
      const date = new Date(2025, 0, 1);
      expect(calculateWorkingDays(date, date)).toBe(0);
    });

    it('should handle a full month correctly (February 2025)', () => {
      // Feb 2025: 20 working days (28 days, no holidays)
      const start = new Date(2025, 1, 1);
      const end = new Date(2025, 1, 28);
      expect(calculateWorkingDays(start, end)).toBe(20);
    });

    it('should handle custom employee schedule (4-day week)', () => {
      const customSchedule = [
        { day_of_week: 1, is_working_day: true },  // Mon
        { day_of_week: 2, is_working_day: true },  // Tue
        { day_of_week: 3, is_working_day: true },  // Wed
        { day_of_week: 4, is_working_day: true },  // Thu
        { day_of_week: 5, is_working_day: false }, // Fri off
        { day_of_week: 6, is_working_day: false }, // Sat off
        { day_of_week: 0, is_working_day: false }, // Sun off
      ];

      // Feb 3-7, 2025 (Mon-Fri): should be 4 days, not 5
      const start = new Date(2025, 1, 3);
      const end = new Date(2025, 1, 7);
      expect(calculateWorkingDays(start, end, 'full_day', customSchedule)).toBe(4);
    });

    it('should handle cross-year date range', () => {
      // Dec 29, 2025 (Mon) to Jan 2, 2026 (Fri)
      // Dec 29 (Mon), Dec 30 (Tue), Dec 31 (Wed), Jan 1 (holiday), Jan 2 (Fri)
      const start = new Date(2025, 11, 29);
      const end = new Date(2026, 0, 2);
      // Dec 25 is Xmas (Thurs), Jan 1 is holiday
      // Dec 29 (Mon), Dec 30 (Tue), Dec 31 (Wed), Jan 2 (Fri) = 4 working days
      expect(calculateWorkingDays(start, end)).toBe(4);
    });
  });

  describe('calculateWorkingDays - half day edge cases', () => {
    it('should handle half day on a holiday (should be 0)', () => {
      // Jan 1 is holiday
      const date = new Date(2025, 0, 1);
      expect(calculateWorkingDays(date, date, 'morning')).toBe(0);
    });

    it('should handle half day on a weekend (should be 0)', () => {
      // Feb 8, 2025 is Saturday
      const date = new Date(2025, 1, 8);
      expect(calculateWorkingDays(date, date, 'afternoon')).toBe(0);
    });
  });

  describe('LEAVE_TYPE_LABELS', () => {
    it('should include all standard leave types', () => {
      expect(LEAVE_TYPE_LABELS['conge_paye']).toBe('Congés payés');
      expect(LEAVE_TYPE_LABELS['rtt']).toBe('RTT');
      expect(LEAVE_TYPE_LABELS['maladie']).toBe('Maladie');
      expect(LEAVE_TYPE_LABELS['sans_solde']).toBe('Sans solde');
    });

    it('should include legal special leaves', () => {
      expect(LEAVE_TYPE_LABELS['marriage']).toBe('Mariage (4j)');
      expect(LEAVE_TYPE_LABELS['pacs']).toBe('PACS (4j)');
      expect(LEAVE_TYPE_LABELS['birth']).toBe('Naissance / Adoption (3j)');
      expect(LEAVE_TYPE_LABELS['death']).toBe('Décès (3-5j)');
      expect(LEAVE_TYPE_LABELS['move']).toBe('Déménagement');
    });
  });

  describe('DEFAULT_ANNUAL_ENTITLEMENTS', () => {
    it('should set 25 days for paid leave', () => {
      expect(DEFAULT_ANNUAL_ENTITLEMENTS['conge_paye']).toBe(25);
    });

    it('should set 10 days for RTT', () => {
      expect(DEFAULT_ANNUAL_ENTITLEMENTS['rtt']).toBe(10);
    });

    it('should set 0 for sick leave (uncapped)', () => {
      expect(DEFAULT_ANNUAL_ENTITLEMENTS['maladie']).toBe(0);
    });
  });

  describe('formatDaysCount - edge cases', () => {
    it('should format 1.5 days correctly', () => {
      expect(formatDaysCount(1.5)).toBe('1½ jours');
    });

    it('should format 2.5 days correctly', () => {
      expect(formatDaysCount(2.5)).toBe('2½ jours');
    });

    it('should format whole numbers > 1 with "jours"', () => {
      expect(formatDaysCount(3)).toBe('3 jours');
      expect(formatDaysCount(25)).toBe('25 jours');
    });
  });
});
