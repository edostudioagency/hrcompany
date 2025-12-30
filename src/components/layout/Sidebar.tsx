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
  Plus,
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { CompanyAvatar } from '@/components/ui/company-avatar';
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
  const { currentCompany, companies, hasMultipleCompanies, switchCompany, companyNotifications } = useCompany();
  const [badgeCounts, setBadgeCounts] = useState({ timeOff: 0, swaps: 0 });
  const [popoverOpen, setPopoverOpen] = useState(false);

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

  const currentCompanyNotifications = currentCompany ? (companyNotifications[currentCompany.id] || 0) : 0;

  const handleCompanySwitch = (companyId: string) => {
    switchCompany(companyId);
    setPopoverOpen(false);
  };

  const handleCreateCompany = () => {
    setPopoverOpen(false);
    navigate('/company/new');
  };

  const handleSettingsClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate('/settings');
  };

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

      {/* Bottom section - Company switcher with notifications */}
      <div className="p-3 border-t border-sidebar-border space-y-2">
        {sidebarOpen ? (
          <div className="flex items-center gap-2">
            <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
              <PopoverTrigger asChild>
                <button className="flex-1 flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-sidebar-accent transition-colors text-left">
                  <div className="relative">
                    <CompanyAvatar 
                      logoUrl={currentCompany?.logo_url} 
                      name={companyName} 
                      size="md"
                      className="bg-sidebar-primary text-sidebar-primary-foreground"
                    />
                    {currentCompanyNotifications > 0 && (
                      <span className="absolute -top-1 -right-1 w-4 h-4 bg-destructive rounded-full flex items-center justify-center text-[10px] text-destructive-foreground font-medium">
                        {currentCompanyNotifications > 9 ? '9+' : currentCompanyNotifications}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-sidebar-foreground truncate">
                      {companyName}
                    </p>
                    <p className="text-xs text-sidebar-muted capitalize">
                      {role || 'employee'}
                    </p>
                  </div>
                </button>
              </PopoverTrigger>
              <PopoverContent align="start" side="top" className="w-72 p-0">
                <div className="p-3 border-b">
                  <p className="text-sm font-medium text-muted-foreground">Entreprise active</p>
                </div>
                
                <div className="p-2">
                  <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-accent">
                    <div className="relative">
                      <CompanyAvatar 
                        logoUrl={currentCompany?.logo_url} 
                        name={companyName} 
                        size="sm"
                        className="bg-primary text-primary-foreground"
                      />
                      {currentCompanyNotifications > 0 && (
                        <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-destructive rounded-full flex items-center justify-center text-[9px] text-destructive-foreground font-medium">
                          {currentCompanyNotifications}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{currentCompany?.name}</p>
                    </div>
                    <Check className="w-4 h-4 text-primary" />
                  </div>
                </div>

                {hasMultipleCompanies && (
                  <>
                    <div className="px-3 py-2 border-t">
                      <p className="text-sm font-medium text-muted-foreground">Autres entreprises</p>
                    </div>
                    <div className="p-2 space-y-1">
                      {companies
                        .filter(c => c.id !== currentCompany?.id)
                        .map((company) => {
                          const notifCount = companyNotifications[company.id] || 0;
                          const initials = company.name
                            .split(' ')
                            .slice(0, 2)
                            .map(word => word[0]?.toUpperCase())
                            .join('');
                          
                          return (
                            <button
                              key={company.id}
                              onClick={() => handleCompanySwitch(company.id)}
                              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-accent transition-colors text-left"
                            >
                              <div className="relative">
                                <CompanyAvatar 
                                  logoUrl={company.logo_url} 
                                  name={company.name} 
                                  size="sm"
                                  className="bg-muted text-muted-foreground"
                                />
                                {notifCount > 0 && (
                                  <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-destructive rounded-full flex items-center justify-center text-[9px] text-destructive-foreground font-medium">
                                    {notifCount}
                                  </span>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm truncate">{company.name}</p>
                                {notifCount > 0 && (
                                  <p className="text-xs text-muted-foreground">
                                    {notifCount} demande{notifCount > 1 ? 's' : ''} en attente
                                  </p>
                                )}
                              </div>
                            </button>
                          );
                        })}
                    </div>
                  </>
                )}

                {isAdmin && (
                  <>
                    <div className="p-2 border-t">
                      <button
                        onClick={handleCreateCompany}
                        className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-accent transition-colors text-left"
                      >
                        <div className="w-8 h-8 rounded-lg border-2 border-dashed border-muted-foreground/30 flex items-center justify-center">
                          <Plus className="w-4 h-4 text-muted-foreground" />
                        </div>
                        <span className="text-sm font-medium">Créer une nouvelle structure</span>
                      </button>
                    </div>
                  </>
                )}
              </PopoverContent>
            </Popover>

            {isAdmin && (
              <Button
                variant="ghost"
                size="icon"
                onClick={handleSettingsClick}
                className="h-9 w-9 text-sidebar-foreground hover:bg-sidebar-accent flex-shrink-0"
              >
                <Settings className="w-4 h-4" />
              </Button>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
              <PopoverTrigger asChild>
                <button className="relative">
                  <CompanyAvatar 
                    logoUrl={currentCompany?.logo_url} 
                    name={companyName} 
                    size="md"
                    className="bg-sidebar-primary text-sidebar-primary-foreground"
                  />
                  {currentCompanyNotifications > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-destructive rounded-full flex items-center justify-center text-[10px] text-destructive-foreground font-medium">
                      {currentCompanyNotifications > 9 ? '9+' : currentCompanyNotifications}
                    </span>
                  )}
                </button>
              </PopoverTrigger>
              <PopoverContent align="start" side="right" className="w-72 p-0">
                <div className="p-3 border-b">
                  <p className="text-sm font-medium text-muted-foreground">Entreprise active</p>
                </div>
                
                <div className="p-2">
                  <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-accent">
                    <div className="relative">
                      <CompanyAvatar 
                        logoUrl={currentCompany?.logo_url} 
                        name={companyName} 
                        size="sm"
                        className="bg-primary text-primary-foreground"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{currentCompany?.name}</p>
                    </div>
                    <Check className="w-4 h-4 text-primary" />
                  </div>
                </div>

                {hasMultipleCompanies && (
                  <>
                    <div className="px-3 py-2 border-t">
                      <p className="text-sm font-medium text-muted-foreground">Autres entreprises</p>
                    </div>
                    <div className="p-2 space-y-1">
                      {companies
                        .filter(c => c.id !== currentCompany?.id)
                        .map((company) => {
                          const notifCount = companyNotifications[company.id] || 0;
                          const initials = company.name
                            .split(' ')
                            .slice(0, 2)
                            .map(word => word[0]?.toUpperCase())
                            .join('');
                          
                          return (
                            <button
                              key={company.id}
                              onClick={() => handleCompanySwitch(company.id)}
                              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-accent transition-colors text-left"
                            >
                              <div className="relative">
                                <CompanyAvatar 
                                  logoUrl={company.logo_url} 
                                  name={company.name} 
                                  size="sm"
                                  className="bg-muted text-muted-foreground"
                                />
                                {notifCount > 0 && (
                                  <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-destructive rounded-full flex items-center justify-center text-[9px] text-destructive-foreground font-medium">
                                    {notifCount}
                                  </span>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm truncate">{company.name}</p>
                              </div>
                            </button>
                          );
                        })}
                    </div>
                  </>
                )}

                {isAdmin && (
                  <div className="p-2 border-t">
                    <button
                      onClick={handleCreateCompany}
                      className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-accent transition-colors text-left"
                    >
                      <div className="w-8 h-8 rounded-lg border-2 border-dashed border-muted-foreground/30 flex items-center justify-center">
                        <Plus className="w-4 h-4 text-muted-foreground" />
                      </div>
                      <span className="text-sm font-medium">Créer une nouvelle structure</span>
                    </button>
                  </div>
                )}
              </PopoverContent>
            </Popover>

            {isAdmin && (
              <Button
                variant="ghost"
                size="icon"
                onClick={handleSettingsClick}
                className="h-9 w-9 text-sidebar-foreground hover:bg-sidebar-accent"
              >
                <Settings className="w-4 h-4" />
              </Button>
            )}
          </div>
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
