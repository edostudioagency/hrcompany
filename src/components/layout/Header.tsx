import { Search, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { NotificationDropdown } from '@/components/notifications/NotificationDropdown';
import { useApp } from '@/contexts/AppContext';
import { cn } from '@/lib/utils';

interface HeaderProps {
  title: string;
  subtitle?: string;
}

export function Header({ title, subtitle }: HeaderProps) {
  const {
    currentCompany,
    setCurrentCompany,
    companies,
    sidebarOpen,
    currentUser,
    notifications,
    markNotificationAsRead,
    markAllNotificationsAsRead,
  } = useApp();

  // Filter notifications for current user and company
  const userNotifications = notifications
    .filter(
      (n) =>
        n.userId === currentUser?.id && n.companyId === currentCompany?.id
    )
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  // Only show notifications to managers and admins
  const showNotifications =
    currentUser?.role === 'admin' || currentUser?.role === 'manager';

  return (
    <header
      className={cn(
        'sticky top-0 z-30 bg-background/80 backdrop-blur-md border-b border-border transition-all duration-300',
        sidebarOpen ? 'pl-64' : 'pl-20'
      )}
    >
      <div className="flex items-center justify-between h-16 px-6">
        {/* Left: Title */}
        <div>
          <h1 className="text-xl font-semibold text-foreground">{title}</h1>
          {subtitle && (
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          )}
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-4">
          {/* Search */}
          <div className="relative hidden md:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher..."
              className="w-64 pl-9 bg-secondary/50 border-0 focus-visible:ring-1"
            />
          </div>

          {/* Company Selector */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className="gap-2 bg-card border-border/50"
              >
                <span className="text-sm font-medium">
                  {currentCompany?.name || 'Entreprise'}
                </span>
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Changer d'entreprise</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {companies.map((company) => (
                <DropdownMenuItem
                  key={company.id}
                  onClick={() => setCurrentCompany(company)}
                  className={cn(
                    'cursor-pointer',
                    currentCompany?.id === company.id && 'bg-primary/10'
                  )}
                >
                  {company.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Notifications */}
          {showNotifications && (
            <NotificationDropdown
              notifications={userNotifications}
              onMarkAsRead={markNotificationAsRead}
              onMarkAllAsRead={markAllNotificationsAsRead}
            />
          )}
        </div>
      </div>
    </header>
  );
}
