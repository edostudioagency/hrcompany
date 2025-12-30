import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface Company {
  id: string;
  name: string;
  legal_name?: string | null;
  logo_url?: string | null;
}

interface CompanyContextType {
  currentCompany: Company | null;
  companies: Company[];
  isLoading: boolean;
  hasMultipleCompanies: boolean;
  companyNotifications: Record<string, number>;
  switchCompany: (companyId: string) => void;
  refreshCompanies: () => Promise<void>;
  addCompany: (company: Company) => void;
}

const CompanyContext = createContext<CompanyContextType | undefined>(undefined);

export function CompanyProvider({ children }: { children: ReactNode }) {
  const { user, role } = useAuth();
  const [currentCompany, setCurrentCompany] = useState<Company | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [companyNotifications, setCompanyNotifications] = useState<Record<string, number>>({});

  const fetchNotifications = useCallback(async (companyIds: string[]) => {
    if (companyIds.length === 0) return;

    try {
      // Count pending time_off_requests per company
      const { data: timeOffData } = await supabase
        .from('time_off_requests')
        .select('employee_id, employees!inner(company_id)')
        .eq('status', 'pending');

      // Count pending shift_swap_requests per company
      const { data: swapData } = await supabase
        .from('shift_swap_requests')
        .select('requester_id, employees!shift_swap_requests_requester_id_fkey(company_id)')
        .eq('status', 'pending');

      const notificationCounts: Record<string, number> = {};

      // Initialize counts
      companyIds.forEach(id => {
        notificationCounts[id] = 0;
      });

      // Count time off requests
      timeOffData?.forEach((request: any) => {
        const companyId = request.employees?.company_id;
        if (companyId && notificationCounts[companyId] !== undefined) {
          notificationCounts[companyId]++;
        }
      });

      // Count swap requests
      swapData?.forEach((request: any) => {
        const companyId = request.employees?.company_id;
        if (companyId && notificationCounts[companyId] !== undefined) {
          notificationCounts[companyId]++;
        }
      });

      setCompanyNotifications(notificationCounts);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  }, []);

  const fetchCompanies = useCallback(async () => {
    if (!user) {
      setCompanies([]);
      setCurrentCompany(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    
    try {
      // For admins, check user_companies table for multi-company access
      if (role === 'admin') {
        const { data: userCompanies } = await supabase
          .from('user_companies')
          .select('company_id, is_default, companies:company_id(id, name, legal_name, logo_url)')
          .eq('user_id', user.id);

        if (userCompanies && userCompanies.length > 0) {
          const companyList = userCompanies
            .map(uc => uc.companies as unknown as Company)
            .filter(Boolean);
          
          setCompanies(companyList);
          
          // Find default company or use first
          const defaultEntry = userCompanies.find(uc => uc.is_default);
          const savedCompanyId = localStorage.getItem('selectedCompanyId');
          
          let selectedCompany: Company | null = null;
          
          if (savedCompanyId) {
            selectedCompany = companyList.find(c => c.id === savedCompanyId) || null;
          }
          if (!selectedCompany && defaultEntry) {
            selectedCompany = defaultEntry.companies as unknown as Company;
          }
          if (!selectedCompany && companyList.length > 0) {
            selectedCompany = companyList[0];
          }
          
          setCurrentCompany(selectedCompany);
          
          // Fetch notifications for all companies
          fetchNotifications(companyList.map(c => c.id));
          
          setIsLoading(false);
          return;
        }
      }

      // Fallback: get company from employee record
      const { data: employee } = await supabase
        .from('employees')
        .select('company_id, companies:company_id(id, name, legal_name, logo_url)')
        .eq('user_id', user.id)
        .maybeSingle();

      if (employee?.companies) {
        const company = employee.companies as unknown as Company;
        setCompanies([company]);
        setCurrentCompany(company);
        fetchNotifications([company.id]);
      } else {
        // Try to get any company for admins/managers
        if (role === 'admin' || role === 'manager') {
          const { data: allCompanies } = await supabase
            .from('companies')
            .select('id, name, legal_name, logo_url')
            .limit(10);
          
          if (allCompanies && allCompanies.length > 0) {
            setCompanies(allCompanies);
            const savedCompanyId = localStorage.getItem('selectedCompanyId');
            const selectedCompany = savedCompanyId 
              ? allCompanies.find(c => c.id === savedCompanyId) || allCompanies[0]
              : allCompanies[0];
            setCurrentCompany(selectedCompany);
            fetchNotifications(allCompanies.map(c => c.id));
          }
        }
      }
    } catch (error) {
      console.error('Error fetching companies:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user, role, fetchNotifications]);

  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  const switchCompany = (companyId: string) => {
    const company = companies.find(c => c.id === companyId);
    if (company) {
      setCurrentCompany(company);
      localStorage.setItem('selectedCompanyId', companyId);
    }
  };

  const refreshCompanies = async () => {
    await fetchCompanies();
  };

  const addCompany = (company: Company) => {
    setCompanies(prev => [...prev, company]);
  };

  return (
    <CompanyContext.Provider
      value={{
        currentCompany,
        companies,
        isLoading,
        hasMultipleCompanies: companies.length > 1,
        companyNotifications,
        switchCompany,
        refreshCompanies,
        addCompany,
      }}
    >
      {children}
    </CompanyContext.Provider>
  );
}

export function useCompany() {
  const context = useContext(CompanyContext);
  if (context === undefined) {
    throw new Error('useCompany must be used within a CompanyProvider');
  }
  return context;
}
