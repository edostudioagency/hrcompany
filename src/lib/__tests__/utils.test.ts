import { describe, it, expect } from 'vitest';
import { formatEmployeeName, getEmployeeInitials } from '../utils';

describe('utils', () => {
  describe('formatEmployeeName', () => {
    it('should format name with first name first by default', () => {
      expect(formatEmployeeName('Jean', 'Dupont')).toBe('Jean Dupont');
    });

    it('should format name with first name first when explicitly specified', () => {
      expect(formatEmployeeName('Jean', 'Dupont', 'first_name')).toBe('Jean Dupont');
    });

    it('should format name with last name first when specified', () => {
      expect(formatEmployeeName('Jean', 'Dupont', 'last_name')).toBe('Dupont Jean');
    });
  });

  describe('getEmployeeInitials', () => {
    it('should return initials with first name first by default', () => {
      expect(getEmployeeInitials('Jean', 'Dupont')).toBe('JD');
    });

    it('should return initials with first name first when explicitly specified', () => {
      expect(getEmployeeInitials('Jean', 'Dupont', 'first_name')).toBe('JD');
    });

    it('should return initials with last name first when specified', () => {
      expect(getEmployeeInitials('Jean', 'Dupont', 'last_name')).toBe('DJ');
    });

    it('should handle single character names', () => {
      expect(getEmployeeInitials('A', 'B')).toBe('AB');
    });
  });
});
