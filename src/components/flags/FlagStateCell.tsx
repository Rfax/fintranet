import { cn } from '@/lib/utils'
import { Pill } from '@/components/shared/Badges'
import { CheckCircle2, MinusCircle } from 'lucide-react'
import type { EnvironmentConfig } from '@/types'

/**
 * Enabled state plus rollout share. A flag is rarely just "on" or "off" once
 * percentage rollout and targeting rules exist.
 */
export function FlagStateCell({
  config,
  className,
}: {
  config: EnvironmentConfig
  className?: string
}) {
  return (
    <span className={cn('flex items-center gap-2', className)}>
      <Pill
        icon={config.enabled ? CheckCircle2 : MinusCircle}
        tone={config.enabled ? 'positive' : 'neutral'}
      >
        {config.enabled ? 'Enabled' : 'Disabled'}
      </Pill>
      <span className="flex items-center gap-1.5">
        <span className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-200" aria-hidden>
          <span
            className={cn('block h-full rounded-full', config.enabled ? 'bg-navy-600' : 'bg-slate-300')}
            style={{ width: `${config.rolloutPercentage}%` }}
          />
        </span>
        <span className="text-xs tabular-nums text-muted-foreground">{config.rolloutPercentage}%</span>
      </span>
    </span>
  )
}
