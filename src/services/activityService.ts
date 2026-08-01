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
  search?: string
  limit?: number
}

export function listActivity(filters: ActivityFilters = {}): Promise<ActivityEvent[]> {
  const search = filters.search?.trim().toLowerCase()
  const events = loadEvents().filter((event) => {
    if (filters.module && event.module !== filters.module) return false
    if (filters.recordId && event.recordId !== filters.recordId) return false
    if (search) {
      const haystack = `${event.recordId} ${event.recordLabel} ${event.actorName} ${event.summary}`
      if (!haystack.toLowerCase().includes(search)) return false
    }
    return true
  })
  return respond(filters.limit ? events.slice(0, filters.limit) : events)
}

/** Appends a prototype activity record. Persisted in localStorage only. */
export function recordActivity(
  event: Omit<ActivityEvent, 'id' | 'occurredAt'>,
): Promise<ActivityEvent> {
  const recorded: ActivityEvent = {
    ...event,
    id: `ACT-${Date.now()}`,
    occurredAt: new Date().toISOString(),
  }
  writeStored(STORAGE_KEY, [recorded, ...readStored<ActivityEvent[]>(STORAGE_KEY, [])])
  return respond(recorded, 60)
}

export function clearRecordedActivity(): Promise<void> {
  writeStored<ActivityEvent[]>(STORAGE_KEY, [])
  return respond(undefined, 40)
}
