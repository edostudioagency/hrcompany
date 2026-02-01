import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export type EmployeeSortOrder = 'first_name' | 'last_name';

export function sortEmployees<T extends { 
  first_name: string; 
  last_name: string;
  status?: string;
  user_id?: string | null;
}>(
  employees: T[],
  sortBy: EmployeeSortOrder = 'first_name'
): T[] {
  return [...employees].sort((a, b) => {
    // 1. D'abord trier par statut (actif > en attente > inactif)
    const getStatusPriority = (emp: T) => {
      const isActive = emp.status === 'active' && emp.user_id;
      const isPending = emp.status === 'pending' || 
                       (emp.status === 'active' && !emp.user_id);
      if (isActive) return 0;
      if (isPending) return 1;
      return 2; // inactive ou sans statut
    };
    
    const priorityA = getStatusPriority(a);
    const priorityB = getStatusPriority(b);
    
    if (priorityA !== priorityB) {
      return priorityA - priorityB;
    }
    
    // 2. Ensuite trier alphabétiquement
    const valueA = sortBy === 'first_name' 
      ? `${a.first_name} ${a.last_name}` 
      : `${a.last_name} ${a.first_name}`;
    const valueB = sortBy === 'first_name' 
      ? `${b.first_name} ${b.last_name}` 
      : `${b.last_name} ${b.first_name}`;
    return valueA.toLowerCase().localeCompare(valueB.toLowerCase(), 'fr');
  });
}
