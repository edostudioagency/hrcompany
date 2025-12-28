import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Calendar,
  Clock,
  ArrowLeftRight,
  ChevronLeft,
  ChevronRight,
  Euro,
  FileText,
  Building2,
  Settings,
  ChevronsUpDown,
  Check,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useApp } from '@/contexts/AppContext';
import { useAuth } from '@/hooks/useAuth';
import { useCompany } from '@/contexts/CompanyContext';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

const navigation = [
  { name: 'Tableau de bord', href: '/', icon: LayoutDashboard },
  { name: 'Collaborateurs', href: '/employees', icon: Users, managerOnly: true },
  { name: 'Planning', href: '/shifts', icon: Calendar },
  { name: 'Congés', href: '/time-off', icon: Clock, hasBadge: true },
  { name: 'Échanges', href: '/swaps', icon: ArrowLeftRight, hasBadge: true },
  { name: 'Commissions', href: '/commissions', icon: Euro, managerOnly: true },
  { name: 'Fiches de paie', href: '/payslips', icon: FileText },
];

export function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { sidebarOpen, setSidebarOpen } = useApp();
  const { user, role } = useAuth();
  const { currentCompany, companies, hasMultipleCompanies, switchCompany } = useCompany();
  const [badgeCounts, setBadgeCounts] = useState({ timeOff: 0, swaps: 0 });

  useEffect(() => {
    const fetchBadgeCounts = async () => {
      if (role !== 'admin' && role !== 'manager') return;
      
      const [timeOffRes, swapsRes] = await Promise.all([
        supabase.from('time_off_requests').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('shift_swap_requests').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
      ]);
      
      setBadgeCounts({
        timeOff: timeOffRes.count || 0,
        swaps: swapsRes.count || 0,
      });
    };

    fetchBadgeCounts();
  }, [role]);

  const getBadgeCount = (href: string) => {
    if (href === '/time-off') return badgeCounts.timeOff;
    if (href === '/swaps') return badgeCounts.swaps;
    return 0;
  };

  const isManagerOrAdmin = role === 'admin' || role === 'manager';
  const isAdmin = role === 'admin';
  
  const companyName = currentCompany?.name || 'Mon entreprise';
  const companyInitials = companyName
    .split(' ')
    .slice(0, 2)
    .map(word => word[0]?.toUpperCase())
    .join('');

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 h-screen bg-sidebar transition-all duration-300 flex flex-col',
        sidebarOpen ? 'w-64' : 'w-20'
      )}
    >
      {/* Logo */}
      <div className="flex items-center justify-between p-4 border-b border-sidebar-border">
        {sidebarOpen ? (
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sidebar-primary flex items-center justify-center">
              <Building2 className="w-5 h-5 text-sidebar-primary-foreground" />
            </div>
            <div>
              <h1 className="font-bold text-sidebar-foreground">HR Manager</h1>
              <p className="text-xs text-sidebar-muted">Gestion RH simplifiée</p>
            </div>
          </div>
        ) : (
          <div className="w-10 h-10 rounded-xl bg-sidebar-primary flex items-center justify-center mx-auto">
            <Building2 className="w-5 h-5 text-sidebar-primary-foreground" />
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto scrollbar-thin">
        {navigation.map((item) => {
          // Hide manager-only items for employees
          if (item.managerOnly && !isManagerOrAdmin) return null;

          const isActive = location.pathname === item.href;
          const badgeCount = item.hasBadge && isManagerOrAdmin ? getBadgeCount(item.href) : 0;

          return (
            <NavLink
              key={item.name}
              to={item.href}
              className={cn(
                'nav-item relative',
                isActive && 'nav-item-active'
              )}
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              {sidebarOpen && (
                <>
                  <span className="flex-1">{item.name}</span>
                  {badgeCount > 0 && (
                    <Badge
                      variant="destructive"
                      className="h-5 min-w-5 flex items-center justify-center text-xs px-1.5"
                    >
                      {badgeCount}
                    </Badge>
                  )}
                </>
              )}
              {!sidebarOpen && badgeCount > 0 && (
                <span className="notification-badge">{badgeCount}</span>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Bottom section - Company switcher */}
      <div className="p-3 border-t border-sidebar-border space-y-2">
        {sidebarOpen ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-sidebar-accent transition-colors text-left">
                <div className="w-9 h-9 rounded-lg bg-sidebar-primary flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-semibold text-sidebar-primary-foreground">
                    {companyInitials}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-sidebar-foreground truncate">
                    {companyName}
                  </p>
                  <p className="text-xs text-sidebar-muted capitalize">
                    {role || 'employee'}
                  </p>
                </div>
                <ChevronsUpDown className="w-4 h-4 text-sidebar-muted flex-shrink-0" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              {hasMultipleCompanies && (
                <>
                  {companies.map((company) => (
                    <DropdownMenuItem
                      key={company.id}
                      onClick={() => switchCompany(company.id)}
                      className="flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded bg-primary/10 flex items-center justify-center">
                          <span className="text-xs font-medium text-primary">
                            {company.name.slice(0, 2).toUpperCase()}
                          </span>
                        </div>
                        <span className="truncate">{company.name}</span>
                      </div>
                      {currentCompany?.id === company.id && (
                        <Check className="w-4 h-4 text-primary" />
                      )}
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuSeparator />
                </>
              )}
              {isAdmin && (
                <DropdownMenuItem onClick={() => navigate('/settings')}>
                  <Settings className="w-4 h-4 mr-2" />
                  Paramètres
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="w-full flex items-center justify-center py-2">
                <div className="w-9 h-9 rounded-lg bg-sidebar-primary flex items-center justify-center">
                  <span className="text-sm font-semibold text-sidebar-primary-foreground">
                    {companyInitials}
                  </span>
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" side="right" className="w-56">
              {hasMultipleCompanies && (
                <>
                  {companies.map((company) => (
                    <DropdownMenuItem
                      key={company.id}
                      onClick={() => switchCompany(company.id)}
                      className="flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded bg-primary/10 flex items-center justify-center">
                          <span className="text-xs font-medium text-primary">
                            {company.name.slice(0, 2).toUpperCase()}
                          </span>
                        </div>
                        <span className="truncate">{company.name}</span>
                      </div>
                      {currentCompany?.id === company.id && (
                        <Check className="w-4 h-4 text-primary" />
                      )}
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuSeparator />
                </>
              )}
              {isAdmin && (
                <DropdownMenuItem onClick={() => navigate('/settings')}>
                  <Settings className="w-4 h-4 mr-2" />
                  Paramètres
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        <Separator className="bg-sidebar-border" />

        <Button
          variant="ghost"
          size="sm"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent"
        >
          {sidebarOpen ? (
            <>
              <ChevronLeft className="w-4 h-4 mr-2" />
              Réduire
            </>
          ) : (
            <ChevronRight className="w-4 h-4 mx-auto" />
          )}
        </Button>
      </div>
    </aside>
  );
}
