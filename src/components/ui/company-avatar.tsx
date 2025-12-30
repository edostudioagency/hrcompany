import { cn } from '@/lib/utils';

interface CompanyAvatarProps {
  logoUrl?: string | null;
  name: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeClasses = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-9 h-9 text-sm',
  lg: 'w-10 h-10 text-sm',
};

export function CompanyAvatar({ logoUrl, name, size = 'md', className }: CompanyAvatarProps) {
  const initials = name
    .split(' ')
    .slice(0, 2)
    .map(word => word[0]?.toUpperCase())
    .join('');

  if (logoUrl) {
    return (
      <div className={cn('rounded-lg overflow-hidden flex-shrink-0', sizeClasses[size], className)}>
        <img 
          src={logoUrl} 
          alt={name} 
          className="w-full h-full object-cover"
        />
      </div>
    );
  }

  return (
    <div className={cn(
      'rounded-lg flex items-center justify-center flex-shrink-0 font-semibold',
      sizeClasses[size],
      className
    )}>
      {initials}
    </div>
  );
}
