import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface PanelProps {
  title?: ReactNode
  description?: ReactNode
  actions?: ReactNode
  footer?: ReactNode
  children: ReactNode
  className?: string
  bodyClassName?: string
  /** Raises emphasis when the panel holds the primary evidence for a record. */
  emphasis?: 'default' | 'primary'
}

/** The single surface primitive every dense view is composed from. */
export function Panel({
  title,
  description,
  actions,
  footer,
  children,
  className,
  bodyClassName,
  emphasis = 'default',
}: PanelProps) {
  return (
    <section
      className={cn(
        'rounded-md border bg-surface shadow-panel',
        emphasis === 'primary' && 'border-navy-300 shadow-raised ring-1 ring-navy-100',
        className,
      )}
    >
      {(title || actions) && (
        <header className="flex items-start justify-between gap-4 border-b px-4 py-3">
          <div className="min-w-0">
            {typeof title === 'string' ? (
              <h2 className="truncate text-sm font-semibold text-foreground">{title}</h2>
            ) : (
              title
            )}
            {description ? (
              <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
            ) : null}
          </div>
          {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
        </header>
      )}
      <div className={cn('px-4 py-3', bodyClassName)}>{children}</div>
      {footer ? <footer className="border-t px-4 py-2.5 text-xs text-muted-foreground">{footer}</footer> : null}
    </section>
  )
}

interface DetailListProps {
  items: { label: string; value: ReactNode; emphasis?: boolean }[]
  columns?: 1 | 2 | 3 | 4
  className?: string
}

/** Label/value grid used inside detail panels. */
export function DetailList({ items, columns = 2, className }: DetailListProps) {
  return (
    <dl
      className={cn(
        'grid gap-x-6 gap-y-3',
        columns === 1 && 'grid-cols-1',
        columns === 2 && 'grid-cols-1 sm:grid-cols-2',
        columns === 3 && 'grid-cols-1 sm:grid-cols-2 xl:grid-cols-3',
        columns === 4 && 'grid-cols-2 xl:grid-cols-4',
        className,
      )}
    >
      {items.map((item) => (
        <div key={item.label} className="min-w-0">
          <dt className="text-label">{item.label}</dt>
          <dd
            className={cn(
              'mt-0.5 truncate text-sm text-foreground',
              item.emphasis && 'font-semibold',
            )}
          >
            {item.value}
          </dd>
        </div>
      ))}
    </dl>
  )
}
