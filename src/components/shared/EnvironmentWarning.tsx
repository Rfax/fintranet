import { AlertTriangle, FlaskConical, ShieldCheck } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { EnvironmentKey } from '@/types'
import { environmentMeta } from './environment-meta'

interface EnvironmentWarningProps {
  environment: EnvironmentKey
  compact?: boolean
  className?: string
}

/** Shown wherever an action would reach production in a real deployment. */
export function EnvironmentWarning({ environment, compact, className }: EnvironmentWarningProps) {
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
          Simulated <strong>{environmentMeta[environment].label.toLowerCase()}</strong> environment.
          Changes here are treated as low risk in the prototype.
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
        <strong>Production-scoped change.</strong> In a real deployment this would affect live
        customers.{' '}
        {compact ? null : 'In this prototype nothing outside the browser is modified.'}
      </p>
    </div>
  )
}

/** Compact banner stating the prototype's boundaries. */
export function PrototypeNotice({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'flex items-start gap-2 rounded border border-navy-200 bg-navy-50 px-3 py-2 text-xs text-navy-900',
        className,
      )}
    >
      <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
      <p>
        All data is synthetic and authentication is simulated. Actions never affect real customers,
        payments, repositories, or feature flags.
      </p>
    </div>
  )
}
