// Data table component for Clockwork

import { cn } from '../lib/utils';

interface Column<T> {
  key: string;
  header: string;
  render: (item: T) => React.ReactNode;
  width?: string;
  align?: 'left' | 'center' | 'right';
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  getRowKey: (item: T) => string;
  emptyMessage?: string;
  zebra?: boolean;
  stickyHeader?: boolean;
  className?: string;
}

export function DataTable<T>({
  columns,
  data,
  getRowKey,
  emptyMessage = 'No data available',
  zebra = true,
  stickyHeader = true,
  className,
}: DataTableProps<T>) {
  if (data.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-[var(--clockwork-gray-500)]">{emptyMessage}</p>
      </div>
    );
  }
  
  return (
    <div className={cn('overflow-x-auto rounded-lg border border-[var(--clockwork-border)]', className)}>
      <table className="w-full border-collapse">
        <thead
          className={cn(
            'bg-[var(--clockwork-orange)] text-white',
            stickyHeader && 'sticky top-0 z-10'
          )}
        >
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                style={{ width: column.width }}
                className={cn(
                  'px-4 py-3 text-left font-semibold text-sm',
                  column.align === 'center' && 'text-center',
                  column.align === 'right' && 'text-right'
                )}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((item, index) => (
            <tr
              key={getRowKey(item)}
              className={cn(
                'border-b border-[var(--clockwork-border-light)] last:border-b-0',
                'hover:bg-[var(--clockwork-gray-50)] transition-colors',
                zebra && index % 2 === 1 && 'bg-[var(--clockwork-gray-50)]'
              )}
            >
              {columns.map((column) => (
                <td
                  key={column.key}
                  className={cn(
                    'px-4 py-3 text-sm text-[var(--clockwork-gray-700)]',
                    column.align === 'center' && 'text-center',
                    column.align === 'right' && 'text-right'
                  )}
                >
                  {column.render(item)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
