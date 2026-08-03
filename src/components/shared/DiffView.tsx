import { ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ActivityChange } from '@/types'

/** Before-and-after values for a configuration or record change. */
export function DiffList({
  changes,
  className,
}: {
  changes: ActivityChange[]
  className?: string
}) {
  return (
    <ul className={cn('space-y-1', className)}>
      {changes.map((change) => (
        <li
          key={change.field}
          className="flex flex-wrap items-center gap-2 rounded border bg-surface-muted/60 px-2 py-1 font-mono text-xs"
        >
          <span className="text-muted-foreground">{change.field}</span>
          <span className="rounded bg-rose-100 px-1.5 py-0.5 text-rose-900 line-through decoration-rose-400">
            {change.before}
          </span>
          <ArrowRight className="h-3 w-3 text-muted-foreground" aria-hidden />
          <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-emerald-900">{change.after}</span>
        </li>
      ))}
    </ul>
  )
}

interface SideBySideDiffProps {
  beforeLabel?: string
  afterLabel?: string
  rows: { field: string; before: string; after: string }[]
  className?: string
}

/** Two-column comparison used before a consequential change is confirmed. */
export function SideBySideDiff({
  beforeLabel = 'Current',
  afterLabel = 'After change',
  rows,
  className,
}: SideBySideDiffProps) {
  return (
    <div className={cn('overflow-hidden rounded border', className)}>
      <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)] border-b bg-surface-muted/70 px-3 py-1.5">
        <span className="text-label">Field</span>
        <span className="text-label">{beforeLabel}</span>
        <span className="text-label">{afterLabel}</span>
      </div>
      {rows.map((row) => {
        const changed = row.before !== row.after
        return (
          <div
            key={row.field}
            className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)] items-center border-b px-3 py-1.5 text-xs last:border-b-0"
          >
            <span className="truncate font-mono text-muted-foreground">{row.field}</span>
            <span className={cn('truncate font-mono', changed && 'text-rose-800 line-through decoration-rose-300')}>
              {row.before}
            </span>
            <span className={cn('truncate font-mono', changed ? 'font-semibold text-emerald-800' : 'text-muted-foreground')}>
              {row.after}
            </span>
          </div>
        )
      })}
    </div>
  )
}
