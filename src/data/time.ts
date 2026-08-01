/**
 * Fixture timestamps are generated relative to load time so the synthetic
 * queues always look recent regardless of when the prototype is opened.
 */
const MINUTE = 60 * 1000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

export const fixtureNow = new Date()

export function hoursAgo(hours: number): string {
  return new Date(fixtureNow.getTime() - hours * HOUR).toISOString()
}

export function hoursFromNow(hours: number): string {
  return new Date(fixtureNow.getTime() + hours * HOUR).toISOString()
}

export function daysAgo(days: number): string {
  return new Date(fixtureNow.getTime() - days * DAY).toISOString()
}

export function daysFromNow(days: number): string {
  return new Date(fixtureNow.getTime() + days * DAY).toISOString()
}

export function dateKeyDaysAgo(days: number): string {
  return new Date(fixtureNow.getTime() - days * DAY).toISOString().slice(0, 10)
}
