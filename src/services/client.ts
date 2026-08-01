/**
 * Thin transport shim between the UI and the synthetic fixtures.
 *
 * Every service function is promise-based so the fixture reads can later be
 * swapped for real internal API calls without touching the components.
 */

const DEFAULT_LATENCY_MS = 140

export type ServiceErrorCode = 'not_found' | 'forbidden' | 'unavailable'

export class ServiceError extends Error {
  readonly code: ServiceErrorCode

  constructor(message: string, code: ServiceErrorCode = 'unavailable') {
    super(message)
    this.name = 'ServiceError'
    this.code = code
  }
}

/** Resolves after a small delay so loading states are exercised realistically. */
export function respond<T>(value: T, latencyMs = DEFAULT_LATENCY_MS): Promise<T> {
  return new Promise((resolve) => {
    setTimeout(() => resolve(structuredClone(value)), latencyMs)
  })
}

export function reject(error: ServiceError, latencyMs = DEFAULT_LATENCY_MS): Promise<never> {
  return new Promise((_, rejectPromise) => {
    setTimeout(() => rejectPromise(error), latencyMs)
  })
}

const STORAGE_PREFIX = 'fintranet:'

export function readStored<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback
  try {
    const raw = window.localStorage.getItem(STORAGE_PREFIX + key)
    return raw === null ? fallback : (JSON.parse(raw) as T)
  } catch {
    return fallback
  }
}

export function writeStored<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value))
  } catch {
    /* Persistence is a convenience in the prototype; ignore quota errors. */
  }
}

export function clearStored(key: string): void {
  if (typeof window === 'undefined') return
  window.localStorage.removeItem(STORAGE_PREFIX + key)
}
