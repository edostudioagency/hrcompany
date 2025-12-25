import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Calendar,
  Clock,
  ArrowLeftRight,
  FileSpreadsheet,
  Building2,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
  UserCog,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useApp } from '@/contexts/AppContext';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { mockTimeOffRequests, mockShiftSwapRequests } from '@/data/mockData';

const navigation = [
  { name: 'Tableau de bord', href: '/', icon: LayoutDashboard },
  { name: 'Entreprises', href: '/companies', icon: Building2, adminOnly: true },
  { name: 'Utilisateurs', href: '/users', icon: UserCog, adminOnly: true },
  { name: 'Employés', href: '/employees', icon: Users },
  { name: 'Planning', href: '/shifts', icon: Calendar },
  { name: 'Congés', href: '/time-off', icon: Clock, hasBadge: true },
  { name: 'Échanges', href: '/swaps', icon: ArrowLeftRight, hasBadge: true },
  { name: 'Exports', href: '/exports', icon: FileSpreadsheet },
];

export function Sidebar() {
  const location = useLocation();
  const { currentCompany, currentUser, sidebarOpen, setSidebarOpen } = useApp();

  // Count pending requests for badges
  const pendingTimeOff = currentCompany
    ? mockTimeOffRequests.filter(
        (r) => r.companyId === currentCompany.id && r.status === 'pending'
      ).length
    : 0;

  const pendingSwaps = currentCompany
    ? mockShiftSwapRequests.filter(
        (r) => r.companyId === currentCompany.id && r.status === 'pending'
      ).length
    : 0;

  const getBadgeCount = (href: string) => {
    if (href === '/time-off') return pendingTimeOff;
    if (href === '/swaps') return pendingSwaps;
    return 0;
  };

  const isAdmin = currentUser?.role === 'admin';

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 h-screen bg-sidebar transition-all duration-300 flex flex-col',
        sidebarOpen ? 'w-64' : 'w-20'
      )}
    >
      {/* Logo & Company */}
      <div className="flex items-center justify-between p-4 border-b border-sidebar-border">
        {sidebarOpen ? (
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sidebar-primary flex items-center justify-center">
              <Building2 className="w-5 h-5 text-sidebar-primary-foreground" />
            </div>
            <div>
              <h1 className="font-bold text-sidebar-foreground">HR Manager</h1>
              <p className="text-xs text-sidebar-muted truncate max-w-[140px]">
                {currentCompany?.name || 'Sélectionner'}
              </p>
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
          // Hide admin-only items for non-admins
          if (item.adminOnly && !isAdmin) return null;

          const isActive = location.pathname === item.href;
          const badgeCount = item.hasBadge ? getBadgeCount(item.href) : 0;

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

      {/* Bottom section */}
      <div className="p-3 border-t border-sidebar-border space-y-2">
        {sidebarOpen && currentUser && (
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="w-9 h-9 rounded-full bg-sidebar-accent flex items-center justify-center">
              <span className="text-sm font-medium text-sidebar-foreground">
                {currentUser.firstName[0]}
                {currentUser.lastName[0]}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-sidebar-foreground truncate">
                {currentUser.firstName} {currentUser.lastName}
              </p>
              <p className="text-xs text-sidebar-muted capitalize">
                {currentUser.role}
              </p>
            </div>
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
