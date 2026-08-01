import type { ISODateString, Money } from '@/types'

export function formatMoney(money: Money, options?: { compact?: boolean }): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: money.currency,
    notation: options?.compact ? 'compact' : 'standard',
    minimumFractionDigits: options?.compact ? 0 : 2,
    maximumFractionDigits: options?.compact ? 1 : 2,
  }).format(money.amountMinor / 100)
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US').format(value)
}

export function formatPercent(value: number, fractionDigits = 0): string {
  return `${value.toFixed(fractionDigits)}%`
}

export function formatDate(value: ISODateString): string {
  return new Date(value).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export function formatDateTime(value: ISODateString): string {
  return new Date(value).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

/** Compact age string such as "3h" or "2d" used throughout the queues. */
export function formatDuration(milliseconds: number): string {
  const minutes = Math.round(Math.abs(milliseconds) / 60_000)
  if (minutes < 60) return `${minutes}m`
  const hours = Math.round(minutes / 60)
  if (hours < 48) return `${hours}h`
  return `${Math.round(hours / 24)}d`
}

export function formatRelativeTime(value: ISODateString, now: Date = new Date()): string {
  const delta = now.getTime() - Date.parse(value)
  const magnitude = formatDuration(delta)
  return delta >= 0 ? `${magnitude} ago` : `in ${magnitude}`
}

export type SlaState = 'breached' | 'due_soon' | 'on_track'

/** Queue rows use this to distinguish overdue work from healthy work. */
export function slaState(
  dueAt: ISODateString,
  now: Date = new Date(),
  dueSoonHours = 8,
): SlaState {
  const remainingMs = Date.parse(dueAt) - now.getTime()
  if (remainingMs < 0) return 'breached'
  if (remainingMs <= dueSoonHours * 3_600_000) return 'due_soon'
  return 'on_track'
}

export function titleCase(value: string): string {
  return value
    .split(/[_\s]+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}
