import { formatNumber } from './format'
import type { FeatureFlag, FlagSignal } from '@/types'

/**
 * Exposure and rollout signals describe the *current* configuration, so they are
 * recomputed on read instead of being stored. A rollout change is otherwise
 * visible in the config editor while the focus panel still quotes the old share.
 */
export function deriveFlagSignals(flag: FeatureFlag): FlagSignal[] {
  const production = flag.environments.find((entry) => entry.environment === 'production')
  const rollout = production?.enabled ? production.rolloutPercentage : 0
  const audience = Math.round((flag.estimatedAudience * rollout) / 100)

  return flag.signals.flatMap((signal) => {
    if (signal.type === 'broad_production_exposure') {
      if (rollout === 0) return []
      return [
        {
          ...signal,
          headline: `Enabled for an estimated ${formatNumber(audience)} production users`,
          explanation: `${rollout}% production rollout across a ${formatNumber(flag.estimatedAudience)}-user base. ${signal.explanation}`,
          evidence: [
            { label: 'Environment', value: 'production' },
            { label: 'Rollout', value: `${rollout}%` },
            { label: 'Estimated audience', value: `${formatNumber(audience)} users` },
          ],
        },
      ]
    }

    if (signal.type === 'scheduled_rollout') {
      const stage = flag.rolloutPlan?.find((entry) => entry.state === 'active')
      const next = flag.rolloutPlan?.find((entry) => entry.state === 'scheduled')
      if (!next) return []
      return [
        {
          ...signal,
          evidence: [
            {
              label: 'Current stage',
              value: stage ? `${stage.label} (${rollout}%)` : `${rollout}%`,
            },
            { label: 'Next stage', value: `${next.label} (${next.percentage}%)` },
          ],
        },
      ]
    }

    return [signal]
  })
}

/** Read-side view of a flag: stored record with freshly derived signals. */
export function withDerivedSignals(flag: FeatureFlag): FeatureFlag {
  return { ...flag, signals: deriveFlagSignals(flag) }
}
