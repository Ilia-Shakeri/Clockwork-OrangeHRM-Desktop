// Input component for Clockwork

import { cn } from '../lib/utils';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export function Input({
  label,
  error,
  helperText,
  className,
  id,
  ...props
}: InputProps) {
  const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;
  
  return (
    <div className="w-full">
      {label && (
        <label
          htmlFor={inputId}
          className="block text-sm font-medium text-[var(--clockwork-gray-700)] mb-1.5"
        >
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={cn(
          'w-full px-3 py-2 border rounded-lg transition-all',
          'bg-[var(--clockwork-bg-primary)] text-[var(--clockwork-gray-900)]',
          'border-[var(--clockwork-border)]',
          'focus:outline-none focus:ring-2 focus:ring-[var(--clockwork-orange)] focus:border-transparent',
          'placeholder:text-[var(--clockwork-gray-500)]',
          'disabled:bg-[var(--clockwork-bg-tertiary)] disabled:text-[var(--clockwork-gray-500)] disabled:cursor-not-allowed',
          error && 'border-[var(--clockwork-error)] focus:ring-[var(--clockwork-error)]',
          className
        )}
        {...props}
      />
      {error && (
        <p className="mt-1.5 text-sm text-[var(--clockwork-error)]">{error}</p>
      )}
      {helperText && !error && (
        <p className="mt-1.5 text-sm text-[var(--clockwork-gray-500)]">{helperText}</p>
      )}
    </div>
  );
}
