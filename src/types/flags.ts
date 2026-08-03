import type { AttentionSignal, EnvironmentKey, ISODateString } from './common'

export type FlagLifecycle =
  | 'development'
  | 'rollout'
  | 'permanent'
  | 'rollback'
  | 'cleanup'

/** Drives which focus panel the flag detail page renders. */
export type FlagSignalType =
  | 'broad_production_exposure'
  | 'recent_risky_change'
  | 'stale_flag'
  | 'scheduled_rollout'
  | 'dependent_flag'
  | 'development_flag'

export type FlagSignal = AttentionSignal<FlagSignalType>

export type TargetingOperator = 'in' | 'not_in' | 'equals' | 'matches'

export interface TargetingRule {
  id: string
  attribute: 'userId' | 'email' | 'plan' | 'country' | 'segment'
  operator: TargetingOperator
  values: string[]
  value: boolean
  description: string
}

export interface PersonalOverride {
  userId: string
  userName: string
  value: boolean
  reason: string
  createdAt: ISODateString
  expiresAt?: ISODateString
  environment: EnvironmentKey
}

export interface EnvironmentConfig {
  environment: EnvironmentKey
  enabled: boolean
  rolloutPercentage: number
  updatedAt: ISODateString
  updatedById: string
  /** Retained so a change can be rolled back in one step. */
  previous?: {
    enabled: boolean
    rolloutPercentage: number
    changedAt: ISODateString
  }
}

export interface CodeLocation {
  id: string
  repository: string
  service: string
  branch: string
  commit: string
  filePath: string
  line: number
  language: 'typescript' | 'python' | 'go' | 'kotlin' | 'swift'
  usageType: 'evaluation' | 'fallback' | 'experiment_exposure' | 'test' | 'cleanup'
  snippet: string
  /** 1-based line inside `snippet` that references the flag. */
  highlightLine: number
  lastModifiedAt: ISODateString
  lastModifiedBy: string
  /** Set on test references that exercise the flag-disabled path. */
  coversDisabledPath?: boolean
  /** Reference that looks safe to delete once the flag is retired. */
  cleanupCandidate?: boolean
}

export interface FlagDependency {
  flagKey: string
  relationship: 'requires' | 'blocks'
  description: string
}

export interface FlagResource {
  label: string
  type: 'prd' | 'design' | 'ticket' | 'runbook'
  url: string
}

export interface RolloutStage {
  label: string
  percentage: number
  scheduledFor: ISODateString
  state: 'complete' | 'active' | 'scheduled'
}

export interface FeatureFlag {
  key: string
  name: string
  description: string
  lifecycle: FlagLifecycle
  ownerTeam: string
  ownerId: string
  defaultValue: boolean
  environments: EnvironmentConfig[]
  targetingRules: TargetingRule[]
  personalOverrides: PersonalOverride[]
  codeLocations: CodeLocation[]
  dependencies: FlagDependency[]
  resources: FlagResource[]
  rolloutPlan?: RolloutStage[]
  rolloutCriteria?: string
  rollbackCriteria?: string
  signals: FlagSignal[]
  createdAt: ISODateString
  updatedAt: ISODateString
  expectedRemovalAt?: ISODateString
  estimatedAudience: number
}

export type EvaluationStepKind =
  | 'environment_default'
  | 'global_state'
  | 'targeting_rule'
  | 'percentage_rollout'
  | 'personal_override'

export interface EvaluationStep {
  kind: EvaluationStepKind
  label: string
  detail: string
  value: boolean | null
  matched: boolean
}

export interface FlagEvaluation {
  flagKey: string
  flagName: string
  userId: string
  environment: EnvironmentKey
  value: boolean
  decidedBy: EvaluationStepKind
  steps: EvaluationStep[]
}

export interface FlagUser {
  id: string
  name: string
  email: string
  plan: 'free' | 'pro' | 'enterprise'
  country: string
  segments: string[]
}

export interface FlagListFilters {
  search?: string
  environment?: EnvironmentKey
  enabled?: boolean
  ownerTeam?: string
  lifecycle?: FlagLifecycle
  staleOnly?: boolean
}

/** Users a proposed targeting or rollout change would newly affect. */
export interface AudiencePreview {
  matchedUsers: FlagUser[]
  matchedCount: number
  totalUsers: number
  estimatedAudience: number
  sharePct: number
}
