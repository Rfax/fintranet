import { describe, expect, it } from 'vitest'
import type { AttentionSignal } from '@/types'
import { explainFocusSelection, rankSignals, selectPrimarySignal } from './focus'

const signal = (
  overrides: Partial<AttentionSignal> & Pick<AttentionSignal, 'id' | 'severity'>,
): AttentionSignal => ({
  type: 'generic',
  confidence: undefined,
  headline: 'headline',
  explanation: 'explanation',
  evidence: [],
  source: 'test',
  detectedAt: '2026-01-01T00:00:00.000Z',
  ...overrides,
})

describe('selectPrimarySignal', () => {
  it('returns null when a record has no signals', () => {
    expect(selectPrimarySignal([])).toBeNull()
  })

  it('prefers the highest severity regardless of input order', () => {
    const primary = selectPrimarySignal([
      signal({ id: 'a', severity: 'medium', confidence: 0.99 }),
      signal({ id: 'b', severity: 'critical', confidence: 0.2 }),
      signal({ id: 'c', severity: 'high', confidence: 0.9 }),
    ])
    expect(primary?.id).toBe('b')
  })

  it('breaks severity ties with confidence, then recency', () => {
    const ranked = rankSignals([
      signal({ id: 'older', severity: 'high', confidence: 0.5, detectedAt: '2026-01-01T00:00:00.000Z' }),
      signal({ id: 'newer', severity: 'high', confidence: 0.5, detectedAt: '2026-01-02T00:00:00.000Z' }),
      signal({ id: 'confident', severity: 'high', confidence: 0.8 }),
    ])
    expect(ranked.map((item) => item.id)).toEqual(['confident', 'newer', 'older'])
  })

  it('treats a missing confidence as the weakest evidence', () => {
    const primary = selectPrimarySignal([
      signal({ id: 'unknown', severity: 'high' }),
      signal({ id: 'known', severity: 'high', confidence: 0.1 }),
    ])
    expect(primary?.id).toBe('known')
  })
})

describe('explainFocusSelection', () => {
  it('explains why a signal was promoted', () => {
    const explanation = explainFocusSelection([
      signal({ id: 'a', severity: 'critical', confidence: 0.86 }),
      signal({ id: 'b', severity: 'high', confidence: 0.9 }),
    ])
    expect(explanation).toBe('Highest severity (critical) of 2 signals; confidence 0.86.')
  })

  it('mentions equal-severity competition', () => {
    const explanation = explainFocusSelection([
      signal({ id: 'a', severity: 'high', confidence: 0.9 }),
      signal({ id: 'b', severity: 'high', confidence: 0.4 }),
    ])
    expect(explanation).toContain('equal-severity')
  })

  it('handles records with no signals', () => {
    expect(explainFocusSelection([])).toBe('No signals were raised for this record.')
  })
})
