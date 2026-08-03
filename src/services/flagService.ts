import { featureFlags as seedFlags, flagSegments, flagUsers } from '@/data/flags'
import { findUser, signedInUserId } from '@/data/users'
import {
  evaluateFlag,
  evaluateFlags,
  previewAudience,
} from '@/logic/flagEvaluation'
import { selectPrimarySignal } from '@/logic/focus'
import type {
  ActivityAction,
  AudiencePreview,
  EnvironmentConfig,
  EnvironmentKey,
  FeatureFlag,
  FlagEvaluation,
  FlagListFilters,
  FlagSignal,
  FlagUser,
  PersonalOverride,
  TargetingRule,
} from '@/types'
import { appendActivity } from './activityService'
import { reject, respond, ServiceError } from './client'
import { loadCollection, saveCollection } from './store'

const STORE_KEY = 'feature-flags'
const STALE_AFTER_DAYS = 180

function flags(): FeatureFlag[] {
  return loadCollection(STORE_KEY, seedFlags)
}

function isStale(flag: FeatureFlag, now: Date): boolean {
  const ageDays = (now.getTime() - Date.parse(flag.updatedAt)) / 86_400_000
  return ageDays > STALE_AFTER_DAYS
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

function matchesFilters(flag: FeatureFlag, filters: FlagListFilters, now: Date): boolean {
  const search = filters.search?.trim().toLowerCase()
  if (search && !`${flag.key} ${flag.name} ${flag.description}`.toLowerCase().includes(search)) {
    return false
  }
  if (filters.ownerTeam && flag.ownerTeam !== filters.ownerTeam) return false
  if (filters.lifecycle && flag.lifecycle !== filters.lifecycle) return false
  if (filters.staleOnly && !isStale(flag, now)) return false
  if (filters.enabled !== undefined) {
    const config = environmentConfig(flag, filters.environment ?? 'production')
    if (config.enabled !== filters.enabled) return false
  }
  return true
}

export function listFlags(
  filters: FlagListFilters = {},
  now: Date = new Date(),
): Promise<FeatureFlag[]> {
  const filtered = flags()
    .filter((flag) => matchesFilters(flag, filters, now))
    .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))
  return respond(filtered)
}

/** Flags the signed-in operator owns or has an override on. */
export function listMyFlags(
  userId: string = signedInUserId,
  environment: EnvironmentKey = 'production',
): Promise<FeatureFlag[]> {
  const mine = flags().filter(
    (flag) =>
      flag.ownerId === userId ||
      flag.personalOverrides.some(
        (override) => override.userId === userId && override.environment === environment,
      ),
  )
  return respond(mine.sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt)))
}

export function getFlag(flagKey: string): Promise<FeatureFlag> {
  const found = flags().find((flag) => flag.key === flagKey)
  if (!found) {
    return reject(new ServiceError(`No feature flag matches ${flagKey}`, 'not_found'))
  }
  return respond(found)
}

export function getPrimarySignal(flag: FeatureFlag): FlagSignal | null {
  return selectPrimarySignal(flag.signals)
}

export function listFlagUsers(): Promise<FlagUser[]> {
  return respond(flagUsers)
}

export function listSegments(): Promise<string[]> {
  return respond(flagSegments)
}

export function getFlagUser(userId: string): Promise<FlagUser> {
  const found = flagUsers.find((user) => user.id === userId)
  if (!found) {
    return reject(new ServiceError(`No user matches ${userId}`, 'not_found'))
  }
  return respond(found)
}

export interface FlagFootprint {
  repositories: number
  services: number
  references: number
  languages: number
  disabledPathCovered: boolean
  cleanupCandidates: number
}

export function getCodeFootprint(flag: FeatureFlag): FlagFootprint {
  return {
    repositories: new Set(flag.codeLocations.map((location) => location.repository)).size,
    services: new Set(flag.codeLocations.map((location) => location.service)).size,
    references: flag.codeLocations.length,
    languages: new Set(flag.codeLocations.map((location) => location.language)).size,
    disabledPathCovered: flag.codeLocations.some((location) => location.coversDisabledPath),
    cleanupCandidates: flag.codeLocations.filter((location) => location.cleanupCandidate).length,
  }
}

export function evaluate(
  flag: FeatureFlag,
  user: FlagUser,
  environment: EnvironmentKey,
): FlagEvaluation {
  return evaluateFlag(flag, user, environment)
}

export function evaluateForUser(
  userId: string,
  environment: EnvironmentKey,
  search = '',
): Promise<FlagEvaluation[]> {
  const user = flagUsers.find((entry) => entry.id === userId)
  if (!user) {
    return reject(new ServiceError(`No user matches ${userId}`, 'not_found'))
  }
  const term = search.trim().toLowerCase()
  const relevant = flags().filter(
    (flag) => !term || `${flag.key} ${flag.name}`.toLowerCase().includes(term),
  )
  return respond(evaluateFlags(relevant, user, environment))
}

export function getAudiencePreview(
  flag: FeatureFlag,
  environment: EnvironmentKey,
): AudiencePreview {
  return previewAudience(flag, environment, flagUsers)
}

function replace(flagKey: string, update: (flag: FeatureFlag) => FeatureFlag): FeatureFlag | null {
  const list = flags()
  const index = list.findIndex((flag) => flag.key === flagKey)
  if (index === -1) return null
  const updated = update(list[index])
  const next = [...list]
  next[index] = updated
  saveCollection(STORE_KEY, next)
  return updated
}

function withConfig(
  flag: FeatureFlag,
  environment: EnvironmentKey,
  next: Pick<EnvironmentConfig, 'enabled' | 'rolloutPercentage'>,
  actorId: string,
): FeatureFlag {
  const now = new Date().toISOString()
  return {
    ...flag,
    updatedAt: now,
    environments: flag.environments.map((entry) =>
      entry.environment === environment
        ? {
            ...entry,
            enabled: next.enabled,
            rolloutPercentage: next.rolloutPercentage,
            updatedAt: now,
            updatedById: actorId,
            previous: {
              enabled: entry.enabled,
              rolloutPercentage: entry.rolloutPercentage,
              changedAt: entry.updatedAt,
            },
          }
        : entry,
    ),
  }
}

function recordFlagChange(
  flag: FeatureFlag,
  action: ActivityAction,
  actorId: string,
  summary: string,
  reason: string,
  changes?: { field: string; before: string; after: string }[],
): void {
  appendActivity({
    module: 'flags',
    action,
    actorId,
    actorName: findUser(actorId)?.name ?? 'Unknown operator',
    recordType: 'feature_flag',
    recordId: flag.key,
    recordLabel: flag.name,
    summary,
    reason: reason.trim() || undefined,
    changes,
  })
}

export interface ConfigChange {
  enabled: boolean
  rolloutPercentage: number
}

export function updateEnvironmentConfig(
  flagKey: string,
  environment: EnvironmentKey,
  change: ConfigChange,
  reason: string,
  actorId: string = signedInUserId,
): Promise<FeatureFlag> {
  if (!reason.trim()) {
    return reject(new ServiceError('A reason is required for a configuration change', 'conflict'))
  }
  if (change.rolloutPercentage < 0 || change.rolloutPercentage > 100) {
    return reject(new ServiceError('Rollout must be between 0 and 100', 'conflict'))
  }
  const before = flags().find((flag) => flag.key === flagKey)
  if (!before) return reject(new ServiceError(`No feature flag matches ${flagKey}`, 'not_found'))

  const beforeConfig = environmentConfig(before, environment)
  if (
    beforeConfig.enabled === change.enabled &&
    beforeConfig.rolloutPercentage === change.rolloutPercentage
  ) {
    return reject(new ServiceError('Nothing changed', 'conflict'))
  }

  const updated = replace(flagKey, (flag) => withConfig(flag, environment, change, actorId))
  if (!updated) return reject(new ServiceError(`No feature flag matches ${flagKey}`, 'not_found'))

  const changes = [
    beforeConfig.enabled !== change.enabled
      ? {
          field: `${environment}.enabled`,
          before: String(beforeConfig.enabled),
          after: String(change.enabled),
        }
      : null,
    beforeConfig.rolloutPercentage !== change.rolloutPercentage
      ? {
          field: `${environment}.rolloutPercentage`,
          before: `${beforeConfig.rolloutPercentage}`,
          after: `${change.rolloutPercentage}`,
        }
      : null,
  ].filter((entry): entry is { field: string; before: string; after: string } => entry !== null)

  const action: ActivityAction =
    beforeConfig.enabled !== change.enabled
      ? change.enabled
        ? 'flag.enabled'
        : 'flag.disabled'
      : 'flag.rollout_changed'

  recordFlagChange(
    updated,
    action,
    actorId,
    beforeConfig.enabled !== change.enabled
      ? `${change.enabled ? 'Enabled' : 'Disabled'} the flag in ${environment}`
      : `Changed the ${environment} rollout to ${change.rolloutPercentage}%`,
    reason,
    changes,
  )

  return respond(updated)
}

export function rollbackEnvironmentConfig(
  flagKey: string,
  environment: EnvironmentKey,
  reason: string,
  actorId: string = signedInUserId,
): Promise<FeatureFlag> {
  const before = flags().find((flag) => flag.key === flagKey)
  if (!before) return reject(new ServiceError(`No feature flag matches ${flagKey}`, 'not_found'))
  const config = environmentConfig(before, environment)
  if (!config.previous) {
    return reject(new ServiceError('There is no previous state to roll back to', 'conflict'))
  }

  const target = { enabled: config.previous.enabled, rolloutPercentage: config.previous.rolloutPercentage }
  const updated = replace(flagKey, (flag) => withConfig(flag, environment, target, actorId))
  if (!updated) return reject(new ServiceError(`No feature flag matches ${flagKey}`, 'not_found'))

  recordFlagChange(
    updated,
    'flag.rolled_back',
    actorId,
    `Rolled the ${environment} configuration back to its previous state`,
    reason,
    [
      {
        field: `${environment}.enabled`,
        before: String(config.enabled),
        after: String(target.enabled),
      },
      {
        field: `${environment}.rolloutPercentage`,
        before: `${config.rolloutPercentage}`,
        after: `${target.rolloutPercentage}`,
      },
    ],
  )

  return respond(updated)
}

export interface TargetingRuleInput {
  attribute: TargetingRule['attribute']
  operator: TargetingRule['operator']
  values: string[]
  value: boolean
  description: string
}

export function addTargetingRule(
  flagKey: string,
  input: TargetingRuleInput,
  reason: string,
  actorId: string = signedInUserId,
): Promise<FeatureFlag> {
  if (!input.values.length) {
    return reject(new ServiceError('A targeting rule needs at least one value', 'conflict'))
  }
  if (!reason.trim()) {
    return reject(new ServiceError('A reason is required to change targeting', 'conflict'))
  }

  const rule: TargetingRule = { id: `rule_${Date.now()}`, ...input }
  const updated = replace(flagKey, (flag) => ({
    ...flag,
    updatedAt: new Date().toISOString(),
    targetingRules: [...flag.targetingRules, rule],
  }))
  if (!updated) return reject(new ServiceError(`No feature flag matches ${flagKey}`, 'not_found'))

  recordFlagChange(
    updated,
    'flag.targeting_changed',
    actorId,
    `Added a targeting rule on ${rule.attribute}`,
    reason,
    [
      {
        field: 'targetingRules',
        before: `${updated.targetingRules.length - 1} rules`,
        after: `${rule.attribute} ${rule.operator} [${rule.values.join(', ')}] → ${rule.value}`,
      },
    ],
  )

  return respond(updated)
}

export function removeTargetingRule(
  flagKey: string,
  ruleId: string,
  reason: string,
  actorId: string = signedInUserId,
): Promise<FeatureFlag> {
  if (!reason.trim()) {
    return reject(new ServiceError('A reason is required to change targeting', 'conflict'))
  }
  const before = flags().find((flag) => flag.key === flagKey)
  const removed = before?.targetingRules.find((rule) => rule.id === ruleId)
  if (!before || !removed) {
    return reject(new ServiceError('That targeting rule no longer exists', 'not_found'))
  }

  const updated = replace(flagKey, (flag) => ({
    ...flag,
    updatedAt: new Date().toISOString(),
    targetingRules: flag.targetingRules.filter((rule) => rule.id !== ruleId),
  }))
  if (!updated) return reject(new ServiceError(`No feature flag matches ${flagKey}`, 'not_found'))

  recordFlagChange(
    updated,
    'flag.targeting_changed',
    actorId,
    `Removed a targeting rule on ${removed.attribute}`,
    reason,
    [
      {
        field: 'targetingRules',
        before: `${removed.attribute} ${removed.operator} [${removed.values.join(', ')}] → ${removed.value}`,
        after: 'removed',
      },
    ],
  )

  return respond(updated)
}

export interface OverrideInput {
  userId: string
  userName: string
  value: boolean
  environment: EnvironmentKey
  expiresAt?: string
}

export function setPersonalOverride(
  flagKey: string,
  input: OverrideInput,
  reason: string,
  actorId: string = signedInUserId,
): Promise<FeatureFlag> {
  if (!reason.trim()) {
    return reject(new ServiceError('A reason is required to set an override', 'conflict'))
  }
  const before = flags().find((flag) => flag.key === flagKey)
  if (!before) return reject(new ServiceError(`No feature flag matches ${flagKey}`, 'not_found'))

  const existing = before.personalOverrides.find(
    (override) => override.userId === input.userId && override.environment === input.environment,
  )
  const override: PersonalOverride = {
    userId: input.userId,
    userName: input.userName,
    value: input.value,
    reason: reason.trim(),
    createdAt: new Date().toISOString(),
    expiresAt: input.expiresAt,
    environment: input.environment,
  }

  const updated = replace(flagKey, (flag) => ({
    ...flag,
    updatedAt: new Date().toISOString(),
    personalOverrides: [
      ...flag.personalOverrides.filter(
        (entry) => !(entry.userId === input.userId && entry.environment === input.environment),
      ),
      override,
    ],
  }))
  if (!updated) return reject(new ServiceError(`No feature flag matches ${flagKey}`, 'not_found'))

  recordFlagChange(
    updated,
    'flag.override_set',
    actorId,
    `Set a ${input.environment} override for ${input.userName}`,
    reason,
    [
      {
        field: `override.${input.userId}`,
        before: existing ? String(existing.value) : 'none',
        after: String(input.value),
      },
    ],
  )

  return respond(updated)
}

export function clearPersonalOverride(
  flagKey: string,
  userId: string,
  environment: EnvironmentKey,
  reason: string,
  actorId: string = signedInUserId,
): Promise<FeatureFlag> {
  if (!reason.trim()) {
    return reject(new ServiceError('A reason is required to clear an override', 'conflict'))
  }
  const before = flags().find((flag) => flag.key === flagKey)
  const existing = before?.personalOverrides.find(
    (override) => override.userId === userId && override.environment === environment,
  )
  if (!before || !existing) {
    return reject(new ServiceError('That override no longer exists', 'not_found'))
  }

  const updated = replace(flagKey, (flag) => ({
    ...flag,
    updatedAt: new Date().toISOString(),
    personalOverrides: flag.personalOverrides.filter(
      (override) => !(override.userId === userId && override.environment === environment),
    ),
  }))
  if (!updated) return reject(new ServiceError(`No feature flag matches ${flagKey}`, 'not_found'))

  recordFlagChange(
    updated,
    'flag.override_cleared',
    actorId,
    `Cleared the ${environment} override for ${existing.userName}`,
    reason,
    [{ field: `override.${userId}`, before: String(existing.value), after: 'none' }],
  )

  return respond(updated)
}
