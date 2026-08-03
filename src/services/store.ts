import { readStored, writeStored } from './client'

/**
 * Working copy of each collection. Records seed from the data module on first
 * load and are then read and written through here, so actions taken in the
 * console survive a refresh.
 */

const SCHEMA_VERSION = 3
const VERSION_KEY = 'schema-version'

let versionChecked = false

function ensureVersion(): void {
  if (versionChecked) return
  versionChecked = true
  if (readStored<number>(VERSION_KEY, 0) !== SCHEMA_VERSION) {
    if (typeof window !== 'undefined') {
      const stale = Object.keys(window.localStorage).filter((key) =>
        key.startsWith('fintranet:'),
      )
      stale.forEach((key) => window.localStorage.removeItem(key))
    }
    writeStored(VERSION_KEY, SCHEMA_VERSION)
  }
}

const cache = new Map<string, unknown>()

/** Reads a collection, seeding it from the bundled records the first time. */
export function loadCollection<T>(key: string, seed: readonly T[]): T[] {
  ensureVersion()
  const cached = cache.get(key)
  if (cached) return cached as T[]

  const stored = readStored<T[] | null>(key, null)
  const items = stored ?? structuredClone(seed as T[])
  cache.set(key, items)
  if (!stored) writeStored(key, items)
  return items
}

export function saveCollection<T>(key: string, items: T[]): void {
  cache.set(key, items)
  writeStored(key, items)
}
