import { featureFlags, syntheticFlagUsers } from '@/data/flags'
import { selectPrimarySignal } from '@/logic/focus'
import type {
  EnvironmentConfig,
  EnvironmentKey,
  FeatureFlag,
  FlagListFilters,
  FlagSignal,
  SyntheticFlagUser,
} from '@/types'
import { reject, respond, ServiceError } from './client'

const STALE_AFTER_DAYS = 180

function isStale(flag: FeatureFlag, now: Date): boolean {
  const ageDays = (now.getTime() - Date.parse(flag.updatedAt)) / 86_400_000
  return ageDays > STALE_AFTER_DAYS
}

function matchesFilters(flag: FeatureFlag, filters: FlagListFilters, now: Date): boolean {
  const search = filters.search?.trim().toLowerCase()
  if (search && !`${flag.key} ${flag.name}`.toLowerCase().includes(search)) return false
  if (filters.ownerTeam && flag.ownerTeam !== filters.ownerTeam) return false
  if (filters.staleOnly && !isStale(flag, now)) return false
  if (filters.enabled !== undefined) {
    const config = environmentConfig(flag, filters.environment ?? 'production')
    if (config.enabled !== filters.enabled) return false
  }
  return true
}

export function environmentConfig(
  flag: FeatureFlag,
  environment: EnvironmentKey,
): EnvironmentConfig {
  const config = flag.environments.find((entry) => entry.environment === environment)
  if (!config) {
    throw new ServiceError(`${flag.key} has no ${environment} configuration`, 'not_found')
  }
  return config
}

export function listFlags(
  filters: FlagListFilters = {},
  now: Date = new Date(),
): Promise<FeatureFlag[]> {
  const filtered = featureFlags
    .filter((flag) => matchesFilters(flag, filters, now))
    .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))
  return respond(filtered)
}

export function getFlag(flagKey: string): Promise<FeatureFlag> {
  const found = featureFlags.find((flag) => flag.key === flagKey)
  if (!found) {
    return reject(new ServiceError(`No feature flag matches ${flagKey}`, 'not_found'))
  }
  return respond(found)
}

export function getPrimarySignal(flag: FeatureFlag): FlagSignal | null {
  return selectPrimarySignal(flag.signals)
}

export function listSyntheticUsers(): Promise<SyntheticFlagUser[]> {
  return respond(syntheticFlagUsers)
}

export function getSyntheticUser(userId: string): Promise<SyntheticFlagUser> {
  const found = syntheticFlagUsers.find((user) => user.id === userId)
  if (!found) {
    return reject(new ServiceError(`No synthetic user matches ${userId}`, 'not_found'))
  }
  return respond(found)
}

export interface FlagFootprint {
  repositories: number
  services: number
  references: number
}

export function getCodeFootprint(flag: FeatureFlag): FlagFootprint {
  return {
    repositories: new Set(flag.codeLocations.map((location) => location.repository)).size,
    services: new Set(flag.codeLocations.map((location) => location.service)).size,
    references: flag.codeLocations.length,
  }
}
