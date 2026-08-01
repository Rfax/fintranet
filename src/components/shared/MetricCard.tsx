import type { ReactNode } from 'react'
import { ArrowDownRight, ArrowRight, ArrowUpRight } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface MetricCardProps {
  label: string
  value: ReactNode
  hint?: ReactNode
  delta?: {
    value: string
    direction: 'up' | 'down' | 'flat'
    /** Whether an increase is a good outcome for this metric. */
    goodDirection?: 'up' | 'down'
  }
  tone?: 'default' | 'warning' | 'critical'
  onClick?: () => void
  className?: string
}

const toneClasses = {
  default: 'border-border',
  warning: 'border-amber-300 bg-amber-50/60',
  critical: 'border-rose-300 bg-rose-50/60',
}

export function MetricCard({
  label,
  value,
  hint,
  delta,
  tone = 'default',
  onClick,
  className,
}: MetricCardProps) {
  const DeltaIcon =
    delta?.direction === 'up' ? ArrowUpRight : delta?.direction === 'down' ? ArrowDownRight : ArrowRight
  const deltaIsGood = delta && delta.goodDirection ? delta.direction === delta.goodDirection : undefined

  const content = (
    <>
      <p className="text-label">{label}</p>
      <p className="mt-1 text-2xl font-semibold tracking-tight text-foreground">{value}</p>
      <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
        {delta ? (
          <span
            className={cn(
              'inline-flex items-center gap-1 font-medium',
              deltaIsGood === true && 'text-emerald-700',
              deltaIsGood === false && 'text-rose-700',
            )}
          >
            <DeltaIcon className="h-3.5 w-3.5" aria-hidden />
            {delta.value}
          </span>
        ) : null}
        {hint ? <span className="truncate">{hint}</span> : null}
      </div>
    </>
  )

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={cn(
          'rounded-md border bg-surface px-3.5 py-3 text-left shadow-panel transition-colors hover:border-navy-300 hover:bg-navy-50/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          toneClasses[tone],
          className,
        )}
      >
        {content}
      </button>
    )
  }

  return (
    <div className={cn('rounded-md border bg-surface px-3.5 py-3 shadow-panel', toneClasses[tone], className)}>
      {content}
    </div>
  )
}

export function MetricRow({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('grid gap-3 sm:grid-cols-2 xl:grid-cols-4', className)}>{children}</div>
  )
}
