import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from './EmptyState'

export interface Column<T> {
  id: string
  header: ReactNode
  cell: (row: T) => ReactNode
  className?: string
  headerClassName?: string
  /** Hides lower-priority columns on narrower desktop widths. */
  hideBelow?: 'lg' | 'xl'
}

interface DataTableProps<T> {
  columns: Column<T>[]
  rows: T[]
  rowKey: (row: T) => string
  onRowClick?: (row: T) => void
  loading?: boolean
  empty?: { title: string; description?: string; action?: ReactNode }
  /** Adds an accent border to rows that need visual escalation. */
  rowAccent?: (row: T) => 'critical' | 'warning' | null
  className?: string
}

const hideClasses = {
  lg: 'hidden lg:table-cell',
  xl: 'hidden xl:table-cell',
}

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  onRowClick,
  loading,
  empty,
  rowAccent,
  className,
}: DataTableProps<T>) {
  if (loading) {
    return (
      <div className="space-y-2 p-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-9 w-full" />
        ))}
      </div>
    )
  }

  if (rows.length === 0 && empty) {
    return <EmptyState title={empty.title} description={empty.description} action={empty.action} />
  }

  return (
    <div className={cn('w-full overflow-x-auto', className)}>
      <table className="w-full min-w-[720px] text-sm">
        <thead>
          <tr className="border-b bg-surface-muted/70">
            {columns.map((column) => (
              <th
                key={column.id}
                scope="col"
                className={cn(
                  'px-3 py-2 text-left text-label',
                  column.hideBelow && hideClasses[column.hideBelow],
                  column.headerClassName,
                )}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const accent = rowAccent?.(row) ?? null
            return (
              <tr
                key={rowKey(row)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                tabIndex={onRowClick ? 0 : undefined}
                onKeyDown={
                  onRowClick
                    ? (event) => {
                        if (event.key === 'Enter') onRowClick(row)
                      }
                    : undefined
                }
                className={cn(
                  'border-b last:border-b-0',
                  onRowClick &&
                    'cursor-pointer transition-colors hover:bg-navy-50/60 focus-visible:bg-navy-50 focus-visible:outline-none',
                  accent === 'critical' && 'bg-rose-50/40 shadow-[inset_3px_0_0_0_hsl(var(--risk-critical))]',
                  accent === 'warning' && 'bg-amber-50/40 shadow-[inset_3px_0_0_0_hsl(var(--risk-medium))]',
                )}
              >
                {columns.map((column) => (
                  <td
                    key={column.id}
                    className={cn(
                      'px-3 py-2 align-middle',
                      column.hideBelow && hideClasses[column.hideBelow],
                      column.className,
                    )}
                  >
                    {column.cell(row)}
                  </td>
                ))}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
