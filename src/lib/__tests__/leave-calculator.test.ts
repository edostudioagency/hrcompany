import { describe, it, expect } from 'vitest';
import {
  getFrenchPublicHolidays,
  isFrenchPublicHoliday,
  calculateWorkingDays,
  formatDaysCount,
} from '../leave-calculator';

describe('leave-calculator', () => {
  describe('getEasterDate (via getFrenchPublicHolidays)', () => {
    it('should compute Easter 2025 as April 20', () => {
      const holidays = getFrenchPublicHolidays(2025);
      // Easter Monday is Easter + 1 day, so Easter Monday 2025 = April 21
      const easterMonday = holidays.find(
        (d) => d.getMonth() === 3 && d.getDate() === 21
      );
      expect(easterMonday).toBeDefined();
    });

    it('should compute Easter 2024 as March 31', () => {
      const holidays = getFrenchPublicHolidays(2024);
      // Easter Monday 2024 = April 1
      const easterMonday = holidays.find(
        (d) => d.getMonth() === 3 && d.getDate() === 1
      );
      expect(easterMonday).toBeDefined();
    });
  });

  describe('isFrenchPublicHoliday', () => {
    it('should recognize January 1 as a public holiday', () => {
      expect(isFrenchPublicHoliday(new Date(2025, 0, 1))).toBe(true);
    });

    it('should recognize May 1 (Fete du Travail) as a public holiday', () => {
      expect(isFrenchPublicHoliday(new Date(2025, 4, 1))).toBe(true);
    });

    it('should recognize July 14 (Fete nationale) as a public holiday', () => {
      expect(isFrenchPublicHoliday(new Date(2025, 6, 14))).toBe(true);
    });

    it('should recognize August 15 (Assomption) as a public holiday', () => {
      expect(isFrenchPublicHoliday(new Date(2025, 7, 15))).toBe(true);
    });

    it('should recognize November 1 (Toussaint) as a public holiday', () => {
      expect(isFrenchPublicHoliday(new Date(2025, 10, 1))).toBe(true);
    });

    it('should recognize November 11 (Armistice) as a public holiday', () => {
      expect(isFrenchPublicHoliday(new Date(2025, 10, 11))).toBe(true);
    });

    it('should recognize December 25 (Noel) as a public holiday', () => {
      expect(isFrenchPublicHoliday(new Date(2025, 11, 25))).toBe(true);
    });

    it('should NOT recognize February 15 as a public holiday', () => {
      expect(isFrenchPublicHoliday(new Date(2025, 1, 15))).toBe(false);
    });

    it('should NOT recognize March 3 as a public holiday', () => {
      expect(isFrenchPublicHoliday(new Date(2025, 2, 3))).toBe(false);
    });
  });

  describe('calculateWorkingDays', () => {
    it('should return 5 working days for a Mon-Fri week with no holidays', () => {
      // 2025-02-03 (Mon) to 2025-02-07 (Fri) - no holidays in this week
      const start = new Date(2025, 1, 3);
      const end = new Date(2025, 1, 7);
      expect(calculateWorkingDays(start, end)).toBe(5);
    });

    it('should return 0 working days for a weekend', () => {
      // 2025-02-08 (Sat) to 2025-02-09 (Sun)
      const start = new Date(2025, 1, 8);
      const end = new Date(2025, 1, 9);
      expect(calculateWorkingDays(start, end)).toBe(0);
    });

    it('should exclude public holidays from working days', () => {
      // 2025-04-21 is Easter Monday (holiday), so Mon-Fri that week = 4 days
      const start = new Date(2025, 3, 21); // Mon Apr 21
      const end = new Date(2025, 3, 25); // Fri Apr 25
      expect(calculateWorkingDays(start, end)).toBe(4);
    });

    it('should handle half day (morning/afternoon)', () => {
      // Single day half-day request
      const start = new Date(2025, 1, 3);
      const end = new Date(2025, 1, 3);
      expect(calculateWorkingDays(start, end, 'morning')).toBe(0.5);
      expect(calculateWorkingDays(start, end, 'afternoon')).toBe(0.5);
    });

    it('should handle multi-day half day request', () => {
      // Mon-Fri = 5 days, half-day means 4.5
      const start = new Date(2025, 1, 3);
      const end = new Date(2025, 1, 7);
      expect(calculateWorkingDays(start, end, 'morning')).toBe(4.5);
    });
  });

  describe('formatDaysCount', () => {
    it('should format 0 days', () => {
      expect(formatDaysCount(0)).toBe('0 jour');
    });

    it('should format 0.5 days', () => {
      expect(formatDaysCount(0.5)).toBe('½ jour');
    });

    it('should format 1 day', () => {
      expect(formatDaysCount(1)).toBe('1 jour');
    });

    it('should format 4.5 days', () => {
      expect(formatDaysCount(4.5)).toBe('4½ jours');
    });

    it('should format 10 days', () => {
      expect(formatDaysCount(10)).toBe('10 jours');
    });
  });
});
