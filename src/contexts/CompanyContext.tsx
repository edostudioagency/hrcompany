import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface Company {
  id: string;
  name: string;
  legal_name?: string | null;
}

interface CompanyContextType {
  currentCompany: Company | null;
  companies: Company[];
  isLoading: boolean;
  hasMultipleCompanies: boolean;
  switchCompany: (companyId: string) => void;
}

const CompanyContext = createContext<CompanyContextType | undefined>(undefined);

export function CompanyProvider({ children }: { children: ReactNode }) {
  const { user, role } = useAuth();
  const [currentCompany, setCurrentCompany] = useState<Company | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setCompanies([]);
      setCurrentCompany(null);
      setIsLoading(false);
      return;
    }

    const fetchCompanies = async () => {
      setIsLoading(true);
      
      try {
        // For admins, check user_companies table for multi-company access
        if (role === 'admin') {
          const { data: userCompanies } = await supabase
            .from('user_companies')
            .select('company_id, is_default, companies:company_id(id, name, legal_name)')
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
            setIsLoading(false);
            return;
          }
        }

        // Fallback: get company from employee record
        const { data: employee } = await supabase
          .from('employees')
          .select('company_id, companies:company_id(id, name, legal_name)')
          .eq('user_id', user.id)
          .maybeSingle();

        if (employee?.companies) {
          const company = employee.companies as unknown as Company;
          setCompanies([company]);
          setCurrentCompany(company);
        } else {
          // Try to get any company for admins/managers
          if (role === 'admin' || role === 'manager') {
            const { data: allCompanies } = await supabase
              .from('companies')
              .select('id, name, legal_name')
              .limit(10);
            
            if (allCompanies && allCompanies.length > 0) {
              setCompanies(allCompanies);
              const savedCompanyId = localStorage.getItem('selectedCompanyId');
              const selectedCompany = savedCompanyId 
                ? allCompanies.find(c => c.id === savedCompanyId) || allCompanies[0]
                : allCompanies[0];
              setCurrentCompany(selectedCompany);
            }
          }
        }
      } catch (error) {
        console.error('Error fetching companies:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCompanies();
  }, [user, role]);

  const switchCompany = (companyId: string) => {
    const company = companies.find(c => c.id === companyId);
    if (company) {
      setCurrentCompany(company);
      localStorage.setItem('selectedCompanyId', companyId);
    }
  };

  return (
    <CompanyContext.Provider
      value={{
        currentCompany,
        companies,
        isLoading,
        hasMultipleCompanies: companies.length > 1,
        switchCompany,
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
