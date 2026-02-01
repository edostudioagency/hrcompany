import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export type EmployeeSortOrder = 'first_name' | 'last_name';

export function sortEmployees<T extends { first_name: string; last_name: string }>(
  employees: T[],
  sortBy: EmployeeSortOrder = 'first_name'
): T[] {
  return [...employees].sort((a, b) => {
    const valueA = sortBy === 'first_name' 
      ? `${a.first_name} ${a.last_name}` 
      : `${a.last_name} ${a.first_name}`;
    const valueB = sortBy === 'first_name' 
      ? `${b.first_name} ${b.last_name}` 
      : `${b.last_name} ${b.first_name}`;
    return valueA.toLowerCase().localeCompare(valueB.toLowerCase(), 'fr');
  });
}
