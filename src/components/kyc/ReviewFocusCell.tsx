import { cn } from '@/lib/utils'
import { kycFocusLabel } from '@/logic/focus'
import type { KycRiskSignal, SignalSeverity } from '@/types'

const severityDot: Record<SignalSeverity, string> = {
  critical: 'bg-risk-critical',
  high: 'bg-risk-high',
  medium: 'bg-risk-medium',
  low: 'bg-risk-low',
}

/**
 * Queue cell describing the record-specific reason for review so the queue is
 * actionable before a case is opened.
 */
export function ReviewFocusCell({
  signal,
  className,
}: {
  signal: KycRiskSignal | null
  className?: string
}) {
  if (!signal) {
    return <span className={cn('text-xs text-muted-foreground', className)}>No signal raised</span>
  }

  return (
    <span className={cn('flex min-w-0 items-center gap-2', className)}>
      <span
        className={cn('h-1.5 w-1.5 shrink-0 rounded-full', severityDot[signal.severity])}
        aria-hidden
      />
      <span className="min-w-0">
        <span className="block truncate text-sm text-foreground">{kycFocusLabel(signal.type)}</span>
        <span className="block truncate text-xs text-muted-foreground">{signal.headline}</span>
      </span>
    </span>
  )
}
