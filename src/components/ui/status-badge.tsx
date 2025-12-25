import * as React from 'react';
import { cn } from '@/lib/utils';

export type StatusType = 'pending' | 'approved' | 'rejected' | 'cancelled' | 'active' | 'inactive';

interface StatusBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  status: StatusType;
}

const STATUS_LABELS: Record<StatusType, string> = {
  pending: 'En attente',
  approved: 'Approuvé',
  rejected: 'Refusé',
  cancelled: 'Annulé',
  active: 'Actif',
  inactive: 'Inactif',
};

const statusStyles: Record<StatusType, string> = {
  pending: 'bg-pending/20 text-pending border-pending/30',
  approved: 'bg-success/20 text-success border-success/30',
  rejected: 'bg-destructive/20 text-destructive border-destructive/30',
  cancelled: 'bg-muted text-muted-foreground border-muted',
  active: 'bg-success/20 text-success border-success/30',
  inactive: 'bg-muted text-muted-foreground border-muted',
};

const StatusBadge = React.forwardRef<HTMLSpanElement, StatusBadgeProps>(
  ({ status, className, ...props }, ref) => {
    return (
      <span
        ref={ref}
        className={cn(
          'inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border',
          statusStyles[status],
          className
        )}
        {...props}
      >
        {STATUS_LABELS[status]}
      </span>
    );
  }
);

StatusBadge.displayName = 'StatusBadge';

export { StatusBadge };
