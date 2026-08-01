import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface Crumb {
  label: string
  to?: string
}

export function Breadcrumbs({ items, className }: { items: Crumb[]; className?: string }) {
  return (
    <nav aria-label="Breadcrumb" className={cn('flex items-center gap-1 text-xs', className)}>
      {items.map((item, index) => {
        const isLast = index === items.length - 1
        return (
          <span key={`${item.label}-${index}`} className="flex items-center gap-1">
            {item.to && !isLast ? (
              <Link to={item.to} className="text-muted-foreground hover:text-foreground hover:underline">
                {item.label}
              </Link>
            ) : (
              <span className={isLast ? 'font-medium text-foreground' : 'text-muted-foreground'}>
                {item.label}
              </span>
            )}
            {isLast ? null : <ChevronRight className="h-3 w-3 text-muted-foreground/70" aria-hidden />}
          </span>
        )
      })}
    </nav>
  )
}

/** Consistent content padding under every page header. */
export function PageBody({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('space-y-4 px-5 py-4', className)}>{children}</div>
}

interface PageHeaderProps {
  title: string
  description?: ReactNode
  breadcrumbs?: Crumb[]
  meta?: ReactNode
  actions?: ReactNode
  className?: string
}

export function PageHeader({
  title,
  description,
  breadcrumbs,
  meta,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <header className={cn('border-b bg-surface px-5 py-4', className)}>
      {breadcrumbs?.length ? <Breadcrumbs items={breadcrumbs} className="mb-2" /> : null}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-lg font-semibold tracking-tight text-foreground">{title}</h1>
            {meta}
          </div>
          {description ? (
            <p className="mt-1 max-w-3xl text-sm text-muted-foreground">{description}</p>
          ) : null}
        </div>
        {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
      </div>
    </header>
  )
}
