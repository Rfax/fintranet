import { useState, type ReactNode } from 'react'
import { ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ExpandableSectionProps {
  title: string
  /** Compact status shown while collapsed, e.g. "3 checks passed". */
  summary?: ReactNode
  defaultOpen?: boolean
  /** Set when the section holds the record's primary evidence. */
  emphasis?: boolean
  children: ReactNode
  className?: string
}

export function ExpandableSection({
  title,
  summary,
  defaultOpen = false,
  emphasis = false,
  children,
  className,
}: ExpandableSectionProps) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <section
      className={cn(
        'rounded-md border bg-surface shadow-panel',
        emphasis && 'border-navy-300 ring-1 ring-navy-100',
        className,
      )}
    >
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-surface-muted/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
      >
        <ChevronRight
          className={cn('h-4 w-4 shrink-0 text-muted-foreground transition-transform', open && 'rotate-90')}
          aria-hidden
        />
        <span className="text-sm font-semibold text-foreground">{title}</span>
        {summary ? (
          <span className="ml-auto truncate text-xs text-muted-foreground">{summary}</span>
        ) : null}
      </button>
      {open ? <div className="border-t px-4 py-3">{children}</div> : null}
    </section>
  )
}
