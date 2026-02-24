// Multi-select dropdown component for Clockwork

import { useState, useRef, useEffect } from 'react';
import { ChevronDown, X, Check } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

interface Option {
  value: string;
  label: string;
}

interface MultiSelectProps {
  options: Option[];
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  label?: string;
  searchable?: boolean;
  className?: string;
}

export function MultiSelect({
  options,
  value,
  onChange,
  placeholder = 'Select...',
  label,
  searchable = true,
  className,
}: MultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
  const filteredOptions = searchable
    ? options.filter((option) =>
        option.label.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : options;
  
  const selectedOptions = options.filter((option) => value.includes(option.value));
  
  const handleToggle = (optionValue: string) => {
    if (value.includes(optionValue)) {
      onChange(value.filter((v) => v !== optionValue));
    } else {
      onChange([...value, optionValue]);
    }
  };
  
  const handleRemove = (optionValue: string) => {
    onChange(value.filter((v) => v !== optionValue));
  };
  
  const handleClear = () => {
    onChange([]);
    setSearchQuery('');
  };
  
  return (
    <div className={cn('w-full relative', className)} ref={containerRef}>
      {label && (
        <label className="block text-sm font-medium text-[var(--clockwork-gray-700)] mb-1.5">
          {label}
        </label>
      )}
      
      {/* Trigger */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'min-h-[42px] px-3 py-2 border border-[var(--clockwork-border)] rounded-lg bg-white cursor-pointer',
          'hover:border-[var(--clockwork-gray-400)] transition-colors',
          isOpen && 'border-[var(--clockwork-orange)] ring-2 ring-[var(--clockwork-orange)]/20'
        )}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex flex-wrap gap-1.5 flex-1 min-h-[26px]">
            {selectedOptions.length === 0 ? (
              <span className="text-[var(--clockwork-gray-400)]">{placeholder}</span>
            ) : (
              selectedOptions.map((option) => (
                <span
                  key={option.value}
                  className="inline-flex items-center gap-1 px-2 py-0.5 bg-[var(--clockwork-orange-light)] text-[var(--clockwork-orange)] rounded text-sm"
                  onClick={(e) => {
                    e.stopPropagation();
                  }}
                >
                  {option.label}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemove(option.value);
                    }}
                    className="hover:bg-[var(--clockwork-orange)]/20 rounded"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))
            )}
          </div>
          <ChevronDown
            className={cn(
              'w-5 h-5 text-[var(--clockwork-gray-500)] transition-transform flex-shrink-0',
              isOpen && 'transform rotate-180'
            )}
          />
        </div>
      </div>
      
      {/* Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            className="absolute z-50 mt-2 w-full bg-white border border-[var(--clockwork-border)] rounded-lg shadow-[var(--clockwork-shadow-md)] max-h-64 overflow-hidden"
          >
            {searchable && (
              <div className="p-2 border-b border-[var(--clockwork-border)]">
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-3 py-2 border border-[var(--clockwork-border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--clockwork-orange)]/20"
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            )}
            
            <div className="max-h-48 overflow-y-auto">
              {filteredOptions.length === 0 ? (
                <div className="px-4 py-3 text-sm text-[var(--clockwork-gray-500)] text-center">
                  No results found
                </div>
              ) : (
                filteredOptions.map((option) => {
                  const isSelected = value.includes(option.value);
                  return (
                    <div
                      key={option.value}
                      onClick={() => handleToggle(option.value)}
                      className={cn(
                        'px-4 py-2.5 cursor-pointer flex items-center justify-between',
                        'hover:bg-[var(--clockwork-gray-50)] transition-colors',
                        isSelected && 'bg-[var(--clockwork-orange-light)]'
                      )}
                    >
                      <span className="text-sm text-[var(--clockwork-gray-700)]">
                        {option.label}
                      </span>
                      {isSelected && (
                        <Check className="w-4 h-4 text-[var(--clockwork-orange)]" />
                      )}
                    </div>
                  );
                })
              )}
            </div>
            
            {value.length > 0 && (
              <div className="p-2 border-t border-[var(--clockwork-border)]">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleClear();
                  }}
                  className="w-full px-3 py-2 text-sm text-[var(--clockwork-error)] hover:bg-red-50 rounded transition-colors"
                >
                  Clear all
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}