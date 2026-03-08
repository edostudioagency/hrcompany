import { describe, it, expect } from 'vitest';
import { sortEmployees, cn } from '../utils';

describe('sortEmployees', () => {
  const employees = [
    { first_name: 'Charlie', last_name: 'Dupont', status: 'active', user_id: 'u1' },
    { first_name: 'Alice', last_name: 'Martin', status: 'active', user_id: 'u2' },
    { first_name: 'Bob', last_name: 'Lefebvre', status: 'pending', user_id: null },
    { first_name: 'Diana', last_name: 'Petit', status: 'inactive', user_id: null },
    { first_name: 'Eve', last_name: 'Bernard', status: 'active', user_id: null },
  ];

  it('should sort active users (with account) first', () => {
    const sorted = sortEmployees(employees, 'first_name');
    // Active with account first
    expect(sorted[0].first_name).toBe('Alice');
    expect(sorted[1].first_name).toBe('Charlie');
  });

  it('should sort pending users after active users', () => {
    const sorted = sortEmployees(employees, 'first_name');
    // Pending/active without account
    const pendingIndex = sorted.findIndex(e => e.first_name === 'Bob');
    const activeIndex = sorted.findIndex(e => e.first_name === 'Alice');
    expect(pendingIndex).toBeGreaterThan(activeIndex);
  });

  it('should sort inactive users last', () => {
    const sorted = sortEmployees(employees, 'first_name');
    const lastEmployee = sorted[sorted.length - 1];
    expect(lastEmployee.first_name).toBe('Diana');
  });

  it('should sort by last_name when specified', () => {
    const sorted = sortEmployees(employees, 'last_name');
    // Active with accounts: Dupont (Charlie), Martin (Alice) -> sorted by last name
    expect(sorted[0].last_name).toBe('Dupont');
    expect(sorted[1].last_name).toBe('Martin');
  });

  it('should not mutate the original array', () => {
    const original = [...employees];
    sortEmployees(employees, 'first_name');
    expect(employees).toEqual(original);
  });

  it('should handle empty array', () => {
    expect(sortEmployees([], 'first_name')).toEqual([]);
  });

  it('should handle single element', () => {
    const single = [{ first_name: 'Test', last_name: 'User', status: 'active', user_id: '1' }];
    expect(sortEmployees(single, 'first_name')).toHaveLength(1);
  });

  it('should use French locale for sorting', () => {
    const frEmployees = [
      { first_name: 'Élodie', last_name: 'A', status: 'active', user_id: '1' },
      { first_name: 'Emma', last_name: 'B', status: 'active', user_id: '2' },
    ];
    const sorted = sortEmployees(frEmployees, 'first_name');
    // In French locale, É comes after E
    expect(sorted[0].first_name).toBe('Élodie');
    expect(sorted[1].first_name).toBe('Emma');
  });
});

describe('cn', () => {
  it('should merge class names', () => {
    const result = cn('foo', 'bar');
    expect(result).toBe('foo bar');
  });

  it('should handle conditional classes', () => {
    const result = cn('base', false && 'hidden', 'extra');
    expect(result).toBe('base extra');
  });

  it('should merge tailwind classes correctly', () => {
    const result = cn('px-2 py-1', 'px-4');
    expect(result).toBe('py-1 px-4');
  });

  it('should handle empty input', () => {
    expect(cn()).toBe('');
  });

  it('should handle undefined and null', () => {
    expect(cn('base', undefined, null, 'end')).toBe('base end');
  });
});
