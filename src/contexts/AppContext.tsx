import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Company, Employee } from '@/types/hr';
import { mockCompanies, mockEmployees } from '@/data/mockData';

interface AppContextType {
  currentCompany: Company | null;
  setCurrentCompany: (company: Company | null) => void;
  currentUser: Employee | null;
  setCurrentUser: (user: Employee | null) => void;
  companies: Company[];
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  // Default to first company and admin user for demo
  const [currentCompany, setCurrentCompany] = useState<Company | null>(mockCompanies[0]);
  const [currentUser, setCurrentUser] = useState<Employee | null>(mockEmployees[0]); // Admin user
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <AppContext.Provider
      value={{
        currentCompany,
        setCurrentCompany,
        currentUser,
        setCurrentUser,
        companies: mockCompanies,
        sidebarOpen,
        setSidebarOpen,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
