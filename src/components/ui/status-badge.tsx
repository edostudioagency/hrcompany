import { cn } from '@/lib/utils';
import { RequestStatus, REQUEST_STATUS_LABELS } from '@/types/hr';

interface StatusBadgeProps {
  status: RequestStatus;
  className?: string;
}

const statusStyles: Record<RequestStatus, string> = {
  pending: 'bg-pending/20 text-pending border-pending/30',
  approved: 'bg-success/20 text-success border-success/30',
  rejected: 'bg-destructive/20 text-destructive border-destructive/30',
  cancelled: 'bg-muted text-muted-foreground border-muted',
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border',
        statusStyles[status],
        className
      )}
    >
      {REQUEST_STATUS_LABELS[status]}
    </span>
  );
}
