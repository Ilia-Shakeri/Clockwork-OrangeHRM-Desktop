// Status badge component for Clockwork

import { cn } from '../lib/utils';

interface BadgeProps {
  variant: 'success' | 'warning' | 'error' | 'neutral';
  children: React.ReactNode;
  className?: string;
}

export function Badge({ variant, children, className }: BadgeProps) {
  const variants = {
    success: 'bg-[var(--clockwork-green-light)] text-[var(--clockwork-success)] border-[var(--clockwork-success)]/20',
    warning: 'bg-[var(--clockwork-orange-light)] text-[var(--clockwork-warning)] border-[var(--clockwork-warning)]/20',
    error: 'bg-red-50 text-[var(--clockwork-error)] border-[var(--clockwork-error)]/20 dark:bg-red-950/30',
    neutral: 'bg-gray-100 text-[var(--clockwork-neutral)] border-[var(--clockwork-neutral)]/20 dark:bg-gray-800',
  };
  
  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium border',
        variants[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
