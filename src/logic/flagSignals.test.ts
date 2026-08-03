import { describe, expect, it } from 'vitest'
import type { FeatureFlag, FlagSignal } from '@/types'
import { deriveFlagSignals } from './flagSignals'

const exposure: FlagSignal = {
  id: 'sig_1',
  type: 'broad_production_exposure',
  severity: 'high',
  confidence: 1,
  headline: 'Enabled for a large share of production traffic',
  explanation: 'Money movement sits in the affected path.',
  evidence: [],
  source: 'Flag service',
  detectedAt: '2026-01-01T00:00:00.000Z',
}

function makeFlag(
  production: { enabled: boolean; rolloutPercentage: number },
  signals: FlagSignal[] = [exposure],
): FeatureFlag {
  return {
    key: 'sample-flag',
    name: 'Sample flag',
    description: 'Test flag',
    lifecycle: 'rollout',
    ownerTeam: 'Payments',
    ownerId: 'usr_jonah',
    defaultValue: false,
    environments: [
      {
        environment: 'production',
        enabled: production.enabled,
        rolloutPercentage: production.rolloutPercentage,
        updatedAt: '2026-01-01T00:00:00.000Z',
        updatedById: 'usr_jonah',
      },
    ],
    targetingRules: [],
    personalOverrides: [],
    codeLocations: [],
    dependencies: [],
    resources: [],
    rolloutPlan: [],
    signals,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    estimatedAudience: 400_000,
  }
}

describe('deriveFlagSignals', () => {
  it('states the exposure that the current rollout produces', () => {
    const [signal] = deriveFlagSignals(makeFlag({ enabled: true, rolloutPercentage: 35 }))
    expect(signal.headline).toContain('140,000')
    expect(signal.explanation).toContain('35% production rollout')
    expect(signal.evidence).toEqual([
      { label: 'Environment', value: 'production' },
      { label: 'Rollout', value: '35%' },
      { label: 'Estimated audience', value: '140,000 users' },
    ])
  })

  it('follows a rollout change instead of quoting the seeded share', () => {
    const [before] = deriveFlagSignals(makeFlag({ enabled: true, rolloutPercentage: 35 }))
    const [after] = deriveFlagSignals(makeFlag({ enabled: true, rolloutPercentage: 100 }))
    expect(before.headline).not.toBe(after.headline)
    expect(after.headline).toContain('400,000')
    expect(after.evidence).toContainEqual({ label: 'Rollout', value: '100%' })
  })

  it('drops the exposure signal once production is turned off', () => {
    expect(deriveFlagSignals(makeFlag({ enabled: false, rolloutPercentage: 100 }))).toHaveLength(0)
  })

  it('leaves unrelated signals untouched', () => {
    const stale: FlagSignal = { ...exposure, id: 'sig_2', type: 'stale_flag' }
    const derived = deriveFlagSignals(makeFlag({ enabled: false, rolloutPercentage: 0 }, [stale]))
    expect(derived).toEqual([stale])
  })
})
