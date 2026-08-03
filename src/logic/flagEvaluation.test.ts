import { describe, expect, it } from 'vitest'
import type { FeatureFlag, FlagUser } from '@/types'
import {
  activeOverride,
  evaluateFlag,
  previewAudience,
  rolloutBucket,
  ruleMatches,
} from './flagEvaluation'

const user: FlagUser = {
  id: 'u_1',
  name: 'Test User',
  email: 'test.user@example.com',
  plan: 'pro',
  country: 'PT',
  segments: ['beta_testers'],
}

function makeFlag(overrides: Partial<FeatureFlag> = {}): FeatureFlag {
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
        environment: 'development',
        enabled: true,
        rolloutPercentage: 100,
        updatedAt: '2026-01-01T00:00:00.000Z',
        updatedById: 'usr_jonah',
      },
      {
        environment: 'staging',
        enabled: true,
        rolloutPercentage: 50,
        updatedAt: '2026-01-01T00:00:00.000Z',
        updatedById: 'usr_jonah',
      },
      {
        environment: 'production',
        enabled: false,
        rolloutPercentage: 0,
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
    signals: [],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    estimatedAudience: 1000,
    ...overrides,
  }
}

describe('rolloutBucket', () => {
  it('is stable for the same flag and user', () => {
    expect(rolloutBucket('sample-flag', 'u_1')).toBe(rolloutBucket('sample-flag', 'u_1'))
  })

  it('stays inside 0-99', () => {
    for (const id of ['u_1', 'u_2', 'u_3', 'u_4']) {
      const bucket = rolloutBucket('sample-flag', id)
      expect(bucket).toBeGreaterThanOrEqual(0)
      expect(bucket).toBeLessThan(100)
    }
  })

  it('differs across flags for the same user', () => {
    expect(rolloutBucket('flag-a', 'u_1')).not.toBe(rolloutBucket('flag-b', 'u_1'))
  })
})

describe('ruleMatches', () => {
  it('matches a segment with the in operator', () => {
    expect(
      ruleMatches(
        { id: 'r1', attribute: 'segment', operator: 'in', values: ['beta_testers'], value: true, description: '' },
        user,
      ),
    ).toBe(true)
  })

  it('matches an email glob with the matches operator', () => {
    expect(
      ruleMatches(
        { id: 'r2', attribute: 'email', operator: 'matches', values: ['*@example.com'], value: true, description: '' },
        user,
      ),
    ).toBe(true)
  })

  it('excludes with not_in', () => {
    expect(
      ruleMatches(
        { id: 'r3', attribute: 'country', operator: 'not_in', values: ['PT'], value: false, description: '' },
        user,
      ),
    ).toBe(false)
  })
})

describe('evaluateFlag', () => {
  it('returns false and stops at the global state when the environment is disabled', () => {
    const evaluation = evaluateFlag(makeFlag(), user, 'production')
    expect(evaluation.value).toBe(false)
    expect(evaluation.decidedBy).toBe('global_state')
    expect(evaluation.steps.map((step) => step.kind)).toEqual([
      'environment_default',
      'global_state',
      'targeting_rule',
      'percentage_rollout',
      'personal_override',
    ])
  })

  it('lets the percentage rollout decide when no rule matches', () => {
    const evaluation = evaluateFlag(makeFlag(), user, 'development')
    expect(evaluation.decidedBy).toBe('percentage_rollout')
    expect(evaluation.value).toBe(true)
  })

  it('prefers a matching targeting rule over the rollout', () => {
    const flag = makeFlag({
      environments: makeFlag().environments.map((entry) =>
        entry.environment === 'staging' ? { ...entry, rolloutPercentage: 0 } : entry,
      ),
      targetingRules: [
        {
          id: 'r1',
          attribute: 'segment',
          operator: 'in',
          values: ['beta_testers'],
          value: true,
          description: 'Beta testers',
        },
      ],
    })
    const evaluation = evaluateFlag(flag, user, 'staging')
    expect(evaluation.decidedBy).toBe('targeting_rule')
    expect(evaluation.value).toBe(true)
    expect(evaluation.steps.find((step) => step.kind === 'percentage_rollout')?.matched).toBe(false)
  })

  it('lets a personal override win over everything else', () => {
    const flag = makeFlag({
      personalOverrides: [
        {
          userId: 'u_1',
          userName: 'Test User',
          value: true,
          reason: 'Debugging a support ticket',
          createdAt: '2026-01-01T00:00:00.000Z',
          environment: 'production',
        },
      ],
    })
    const evaluation = evaluateFlag(flag, user, 'production')
    expect(evaluation.value).toBe(true)
    expect(evaluation.decidedBy).toBe('personal_override')
  })

  it('ignores an expired override', () => {
    const flag = makeFlag({
      personalOverrides: [
        {
          userId: 'u_1',
          userName: 'Test User',
          value: true,
          reason: 'Temporary access',
          createdAt: '2026-01-01T00:00:00.000Z',
          expiresAt: '2026-01-02T00:00:00.000Z',
          environment: 'production',
        },
      ],
    })
    const now = new Date('2026-02-01T00:00:00.000Z')
    expect(activeOverride(flag, 'u_1', 'production', now)).toBeUndefined()
    expect(evaluateFlag(flag, user, 'production', now).value).toBe(false)
  })
})

describe('previewAudience', () => {
  const users: FlagUser[] = [
    user,
    { id: 'u_2', name: 'B', email: 'b@example.com', plan: 'free', country: 'US', segments: [] },
    { id: 'u_3', name: 'C', email: 'c@example.com', plan: 'enterprise', country: 'JP', segments: [] },
  ]

  it('matches nobody while the environment is disabled', () => {
    const preview = previewAudience(makeFlag(), 'production', users)
    expect(preview.matchedCount).toBe(0)
    expect(preview.estimatedAudience).toBe(0)
    expect(preview.sharePct).toBe(0)
  })

  it('matches everyone at a full rollout and scales the estimate', () => {
    const preview = previewAudience(makeFlag(), 'development', users)
    expect(preview.matchedCount).toBe(users.length)
    expect(preview.totalUsers).toBe(users.length)
    expect(preview.sharePct).toBe(100)
    expect(preview.estimatedAudience).toBe(1000)
  })

  it('scales the estimate with the rollout percentage', () => {
    expect(previewAudience(makeFlag(), 'staging', users).estimatedAudience).toBe(500)
  })
})
