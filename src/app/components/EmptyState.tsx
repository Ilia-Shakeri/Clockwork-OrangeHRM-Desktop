// Empty state component for Clockwork

import { LucideIcon } from 'lucide-react';
import { cn } from '../lib/utils';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-12 px-4 text-center', className)}>
      {Icon && (
        <div className="w-16 h-16 bg-[var(--clockwork-gray-100)] rounded-full flex items-center justify-center mb-4">
          <Icon className="w-8 h-8 text-[var(--clockwork-gray-400)]" />
        </div>
      )}
      <h3 className="text-lg font-semibold text-[var(--clockwork-gray-900)] mb-2">
        {title}
      </h3>
      {description && (
        <p className="text-sm text-[var(--clockwork-gray-600)] max-w-md mb-6">
          {description}
        </p>
      )}
      {action && <div>{action}</div>}
    </div>
  );
}
