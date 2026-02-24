// Progress bar component for Clockwork

import { motion } from 'motion/react';
import { cn } from '../lib/utils';

interface ProgressBarProps {
  value: number; // 0-100
  label?: string;
  showPercentage?: boolean;
  className?: string;
}

export function ProgressBar({ value, label, showPercentage = true, className }: ProgressBarProps) {
  const clampedValue = Math.min(100, Math.max(0, value));
  
  return (
    <div className={cn('w-full', className)}>
      {(label || showPercentage) && (
        <div className="flex justify-between items-center mb-2">
          {label && <span className="text-sm text-[var(--clockwork-gray-700)]">{label}</span>}
          {showPercentage && <span className="text-sm font-medium text-[var(--clockwork-gray-900)]">{Math.round(clampedValue)}%</span>}
        </div>
      )}
      <div className="w-full h-2 bg-[var(--clockwork-gray-200)] rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-[var(--clockwork-green)] rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${clampedValue}%` }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
        />
      </div>
    </div>
  );
}

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function Spinner({ size = 'md', className }: SpinnerProps) {
  const sizes = {
    sm: 'w-4 h-4 border-2',
    md: 'w-8 h-8 border-3',
    lg: 'w-12 h-12 border-4',
  };
  
  return (
    <div
      className={cn(
        'animate-spin rounded-full border-[var(--clockwork-orange)] border-t-transparent',
        sizes[size],
        className
      )}
    />
  );
}
