import { cn } from '@/lib/utils'
import { refundFocusLabel } from '@/logic/focus'
import type { RefundSignal, SignalSeverity } from '@/types'

const severityDot: Record<SignalSeverity, string> = {
  critical: 'bg-risk-critical',
  high: 'bg-risk-high',
  medium: 'bg-risk-medium',
  low: 'bg-risk-low',
}

/** Queue cell naming the operational issue that drives the refund decision. */
export function RefundFocusCell({
  signal,
  className,
}: {
  signal: RefundSignal | null
  className?: string
}) {
  if (!signal) {
    return <span className={cn('text-xs text-muted-foreground', className)}>Standard request</span>
  }

  return (
    <span className={cn('flex min-w-0 items-center gap-2', className)}>
      <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', severityDot[signal.severity])} aria-hidden />
      <span className="min-w-0">
        <span className="block truncate text-sm text-foreground">{refundFocusLabel(signal.type)}</span>
        <span className="block truncate text-xs text-muted-foreground">{signal.headline}</span>
      </span>
    </span>
  )
}
