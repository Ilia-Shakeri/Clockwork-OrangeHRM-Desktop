// Button component for Clockwork

import { cn } from '../lib/utils';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'destructive';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  children,
  disabled,
  ...props
}: ButtonProps) {
  const baseStyles = 'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';
  
  const variants = {
    primary: 'bg-[var(--clockwork-orange)] text-white hover:bg-[var(--clockwork-orange-hover)] focus:ring-[var(--clockwork-orange)] shadow-sm',
    secondary: 'bg-white text-[var(--clockwork-gray-700)] border border-[var(--clockwork-border)] hover:bg-[var(--clockwork-gray-50)] focus:ring-[var(--clockwork-gray-400)] dark:bg-[var(--clockwork-gray-100)] dark:border-[var(--clockwork-border)]',
    ghost: 'text-[var(--clockwork-gray-700)] hover:bg-[var(--clockwork-gray-100)] focus:ring-[var(--clockwork-gray-400)]',
    destructive: 'bg-[var(--clockwork-error)] text-white hover:bg-red-700 focus:ring-red-500 shadow-sm',
  };
  
  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
  };
  
  return (
    <button
      className={cn(baseStyles, variants[variant], sizes[size], className)}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
}
