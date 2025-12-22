import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: LucideIcon;
  iconColor?: 'primary' | 'success' | 'warning' | 'destructive' | 'accent';
  trend?: {
    value: number;
    isPositive: boolean;
  };
  className?: string;
}

const iconColors = {
  primary: 'bg-primary/10 text-primary',
  success: 'bg-success/10 text-success',
  warning: 'bg-warning/10 text-warning',
  destructive: 'bg-destructive/10 text-destructive',
  accent: 'bg-accent/10 text-accent',
};

export function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  iconColor = 'primary',
  trend,
  className,
}: StatCardProps) {
  return (
    <div
      className={cn(
        'stat-card animate-fade-in',
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="stat-label">{title}</p>
          <p className="stat-value">{value}</p>
          {subtitle && (
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          )}
        </div>
        {Icon && (
          <div
            className={cn(
              'w-12 h-12 rounded-xl flex items-center justify-center',
              iconColors[iconColor]
            )}
          >
            <Icon className="w-6 h-6" />
          </div>
        )}
      </div>
      {trend && (
        <div className="mt-4 flex items-center gap-1">
          <span
            className={cn(
              'text-sm font-medium',
              trend.isPositive ? 'text-success' : 'text-destructive'
            )}
          >
            {trend.isPositive ? '+' : ''}
            {trend.value}%
          </span>
          <span className="text-xs text-muted-foreground">vs mois dernier</span>
        </div>
      )}
    </div>
  );
}
