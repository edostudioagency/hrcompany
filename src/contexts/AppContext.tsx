import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Company, Employee, Notification } from '@/types/hr';
import { mockCompanies, mockEmployees, mockNotifications } from '@/data/mockData';

interface AppContextType {
  currentCompany: Company | null;
  setCurrentCompany: (company: Company | null) => void;
  currentUser: Employee | null;
  setCurrentUser: (user: Employee | null) => void;
  companies: Company[];
  setCompanies: React.Dispatch<React.SetStateAction<Company[]>>;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  notifications: Notification[];
  setNotifications: React.Dispatch<React.SetStateAction<Notification[]>>;
  markNotificationAsRead: (id: string) => void;
  markAllNotificationsAsRead: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  // Default to first company and admin user for demo
  const [currentCompany, setCurrentCompany] = useState<Company | null>(mockCompanies[0]);
  const [currentUser, setCurrentUser] = useState<Employee | null>(mockEmployees[0]); // Admin user
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [companies, setCompanies] = useState<Company[]>(mockCompanies);
  const [notifications, setNotifications] = useState<Notification[]>(mockNotifications);

  const markNotificationAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const markAllNotificationsAsRead = () => {
    setNotifications((prev) =>
      prev.map((n) =>
        n.userId === currentUser?.id && n.companyId === currentCompany?.id
          ? { ...n, read: true }
          : n
      )
    );
  };

  return (
    <AppContext.Provider
      value={{
        currentCompany,
        setCurrentCompany,
        currentUser,
        setCurrentUser,
        companies,
        setCompanies,
        sidebarOpen,
        setSidebarOpen,
        notifications,
        setNotifications,
        markNotificationAsRead,
        markAllNotificationsAsRead,
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
