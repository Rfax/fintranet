import { activityEvents as seedEvents } from '@/data/activity'
import type { ActivityEvent, ActivityModule } from '@/types'
import { readStored, respond, writeStored } from './client'

const STORAGE_KEY = 'activity-events'

function loadEvents(): ActivityEvent[] {
  const recorded = readStored<ActivityEvent[]>(STORAGE_KEY, [])
  return [...recorded, ...seedEvents].sort(
    (a, b) => Date.parse(b.occurredAt) - Date.parse(a.occurredAt),
  )
}

export interface ActivityFilters {
  module?: ActivityModule
  recordId?: string
  actorId?: string
  search?: string
  /** Inclusive ISO date keys, e.g. 2026-08-01. */
  from?: string
  to?: string
  limit?: number
}

export function listActivity(filters: ActivityFilters = {}): Promise<ActivityEvent[]> {
  const search = filters.search?.trim().toLowerCase()
  const events = loadEvents().filter((event) => {
    if (filters.module && event.module !== filters.module) return false
    if (filters.recordId && event.recordId !== filters.recordId) return false
    if (filters.actorId && event.actorId !== filters.actorId) return false
    if (filters.from && event.occurredAt.slice(0, 10) < filters.from) return false
    if (filters.to && event.occurredAt.slice(0, 10) > filters.to) return false
    if (search) {
      const haystack = `${event.recordId} ${event.recordLabel} ${event.actorName} ${event.summary} ${event.reason ?? ''}`
      if (!haystack.toLowerCase().includes(search)) return false
    }
    return true
  })
  return respond(filters.limit ? events.slice(0, filters.limit) : events)
}

let sequence = 0

/** Writes an event immediately so a mutating service can record it inline. */
export function appendActivity(
  event: Omit<ActivityEvent, 'id' | 'occurredAt'>,
): ActivityEvent {
  sequence += 1
  const recorded: ActivityEvent = {
    ...event,
    id: `ACT-${Date.now()}-${sequence}`,
    occurredAt: new Date().toISOString(),
  }
  writeStored(STORAGE_KEY, [recorded, ...readStored<ActivityEvent[]>(STORAGE_KEY, [])])
  return recorded
}

export function recordActivity(
  event: Omit<ActivityEvent, 'id' | 'occurredAt'>,
): Promise<ActivityEvent> {
  return respond(appendActivity(event), 60)
}

/** Removes events recorded in this browser. Seeded history is unaffected. */
export function clearRecordedActivity(): Promise<void> {
  writeStored<ActivityEvent[]>(STORAGE_KEY, [])
  return respond(undefined, 40)
}
