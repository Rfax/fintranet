import { Link } from 'react-router'
import { cn } from '@/lib/utils'
import { formatDateTime, formatRelativeTime } from '@/logic/format'
import type { ActivityEvent } from '@/types'
import { DiffList } from './DiffView'
import { EmptyState } from './EmptyState'

const moduleLabels = {
  kyc: 'KYC',
  refunds: 'Refunds',
  flags: 'Flags',
} as const

const moduleAccent = {
  kyc: 'bg-navy-500',
  refunds: 'bg-emerald-600',
  flags: 'bg-violet-600',
} as const

function recordHref(event: ActivityEvent): string {
  switch (event.module) {
    case 'kyc':
      return `/kyc/${event.recordId}`
    case 'refunds':
      return `/refunds/${event.recordId}`
    case 'flags':
      return `/flags/${event.recordId}`
  }
}

interface ActivityTimelineProps {
  events: ActivityEvent[]
  showRecordLink?: boolean
  className?: string
}

/** Prototype activity history. Not an immutable or compliance-grade audit log. */
export function ActivityTimeline({ events, showRecordLink = true, className }: ActivityTimelineProps) {
  if (events.length === 0) {
    return (
      <EmptyState
        title="No activity yet"
        description="Actions taken in this prototype appear here with actor, reason, and before/after values."
      />
    )
  }

  return (
    <ol className={cn('relative space-y-4 pl-5', className)}>
      <span className="absolute bottom-2 left-[6px] top-2 w-px bg-border" aria-hidden />
      {events.map((event) => (
        <li key={event.id} className="relative">
          <span
            className={cn(
              'absolute -left-[13px] top-1.5 h-2.5 w-2.5 rounded-full ring-2 ring-surface',
              moduleAccent[event.module],
            )}
            aria-hidden
          />
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <span className="text-sm font-medium text-foreground">{event.actorName}</span>
            <span className="text-sm text-muted-foreground">{event.summary}</span>
            <span className="text-2xs uppercase tracking-wide text-muted-foreground">
              {moduleLabels[event.module]}
            </span>
            <time
              className="ml-auto text-xs text-muted-foreground"
              dateTime={event.occurredAt}
              title={formatDateTime(event.occurredAt)}
            >
              {formatRelativeTime(event.occurredAt)}
            </time>
          </div>
          {showRecordLink ? (
            <Link
              to={recordHref(event)}
              className="mt-0.5 inline-block font-mono text-xs text-navy-700 underline-offset-2 hover:underline"
            >
              {event.recordLabel}
            </Link>
          ) : null}
          {event.reason ? (
            <p className="mt-1 border-l-2 border-border pl-2 text-xs text-muted-foreground">
              {event.reason}
            </p>
          ) : null}
          {event.changes?.length ? <DiffList className="mt-2" changes={event.changes} /> : null}
        </li>
      ))}
    </ol>
  )
}
