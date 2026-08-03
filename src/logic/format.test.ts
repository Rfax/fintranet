import { describe, expect, it } from 'vitest'
import { formatDuration, formatMoney, formatRelativeTime, slaState } from './format'

describe('formatMoney', () => {
  it('renders minor units as currency', () => {
    expect(formatMoney({ amountMinor: 482_000, currency: 'USD' })).toBe('$4,820.00')
  })

  it('supports compact notation for dense tiles', () => {
    expect(formatMoney({ amountMinor: 12_400_000, currency: 'USD' }, { compact: true })).toBe('$124K')
  })
})

describe('formatDuration', () => {
  it('steps from minutes to hours to days', () => {
    expect(formatDuration(45 * 60_000)).toBe('45m')
    expect(formatDuration(5 * 3_600_000)).toBe('5h')
    expect(formatDuration(72 * 3_600_000)).toBe('3d')
  })
})

describe('formatRelativeTime', () => {
  const now = new Date('2026-03-10T12:00:00.000Z')

  it('labels past and future timestamps', () => {
    expect(formatRelativeTime('2026-03-10T09:00:00.000Z', now)).toBe('3h ago')
    expect(formatRelativeTime('2026-03-10T15:00:00.000Z', now)).toBe('in 3h')
  })
})

describe('slaState', () => {
  const now = new Date('2026-03-10T12:00:00.000Z')

  it('classifies breached, due soon, and on track', () => {
    expect(slaState('2026-03-10T11:00:00.000Z', now)).toBe('breached')
    expect(slaState('2026-03-10T16:00:00.000Z', now)).toBe('due_soon')
    expect(slaState('2026-03-12T12:00:00.000Z', now)).toBe('on_track')
  })
})
