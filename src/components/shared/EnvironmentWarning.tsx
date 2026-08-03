import { AlertTriangle, FlaskConical } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatNumber } from '@/logic/format'
import type { EnvironmentKey } from '@/types'
import { environmentMeta } from './environment-meta'

interface EnvironmentWarningProps {
  environment: EnvironmentKey
  /** Users in scope for the change, shown so the blast radius is explicit. */
  audience?: number
  compact?: boolean
  className?: string
}

/** Shown wherever a change would reach production traffic. */
export function EnvironmentWarning({
  environment,
  audience,
  compact,
  className,
}: EnvironmentWarningProps) {
  if (environment !== 'production') {
    return (
      <div
        className={cn(
          'flex items-start gap-2 rounded border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700',
          className,
        )}
      >
        <FlaskConical className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
        <p>
          Editing the <strong>{environmentMeta[environment].label.toLowerCase()}</strong>{' '}
          environment. Production configuration is unaffected.
        </p>
      </div>
    )
  }

  return (
    <div
      className={cn(
        'flex items-start gap-2 rounded border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900',
        className,
      )}
    >
      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
      <p>
        <strong>Production scope.</strong> Changes take effect for live traffic
        {audience === undefined ? '' : ` across ${formatNumber(audience)} users in scope`}.
        {compact ? null : ' Every change is recorded in the activity history.'}
      </p>
    </div>
  )
}
