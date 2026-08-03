import type {
  AudiencePreview,
  EnvironmentConfig,
  EnvironmentKey,
  EvaluationStep,
  FeatureFlag,
  FlagEvaluation,
  FlagUser,
  PersonalOverride,
  TargetingRule,
} from '@/types'

/**
 * Flag resolution used by both the debugger and the detail pages, so an
 * effective value shown anywhere in the console is produced the same way.
 *
 * Resolution order: environment default, global state, targeting rules,
 * percentage rollout, personal override.
 */

export function environmentConfigFor(
  flag: FeatureFlag,
  environment: EnvironmentKey,
): EnvironmentConfig | undefined {
  return flag.environments.find((entry) => entry.environment === environment)
}

/** Stable 0-99 bucket, the same shape a rollout hash takes at runtime. */
export function rolloutBucket(flagKey: string, userId: string): number {
  const input = `${flagKey}:${userId}`
  let hash = 2166136261
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return Math.abs(hash) % 100
}

function attributeValues(rule: TargetingRule, user: FlagUser): string[] {
  switch (rule.attribute) {
    case 'userId':
      return [user.id]
    case 'email':
      return [user.email]
    case 'plan':
      return [user.plan]
    case 'country':
      return [user.country]
    case 'segment':
      return user.segments
  }
}

function globMatches(pattern: string, candidate: string): boolean {
  const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*')
  return new RegExp(`^${escaped}$`, 'i').test(candidate)
}

export function ruleMatches(rule: TargetingRule, user: FlagUser): boolean {
  const actual = attributeValues(rule, user)
  switch (rule.operator) {
    case 'in':
      return actual.some((entry) => rule.values.includes(entry))
    case 'not_in':
      return actual.length > 0 && !actual.some((entry) => rule.values.includes(entry))
    case 'equals':
      return actual.some((entry) => rule.values[0] === entry)
    case 'matches':
      return actual.some((entry) => rule.values.some((pattern) => globMatches(pattern, entry)))
  }
}

export function activeOverride(
  flag: FeatureFlag,
  userId: string,
  environment: EnvironmentKey,
  now: Date = new Date(),
): PersonalOverride | undefined {
  return flag.personalOverrides.find(
    (override) =>
      override.userId === userId &&
      override.environment === environment &&
      (!override.expiresAt || Date.parse(override.expiresAt) > now.getTime()),
  )
}

export function evaluateFlag(
  flag: FeatureFlag,
  user: FlagUser,
  environment: EnvironmentKey,
  now: Date = new Date(),
): FlagEvaluation {
  const config = environmentConfigFor(flag, environment)
  const steps: EvaluationStep[] = []
  let value = flag.defaultValue
  let decidedBy: FlagEvaluation['decidedBy'] = 'environment_default'

  steps.push({
    kind: 'environment_default',
    label: 'Environment default',
    detail: `Flag default value is ${flag.defaultValue}.`,
    value: flag.defaultValue,
    matched: true,
  })

  const globallyEnabled = config?.enabled ?? false
  if (!globallyEnabled) value = false
  steps.push({
    kind: 'global_state',
    label: 'Global state',
    detail: globallyEnabled
      ? `${environment} is enabled, so targeting and rollout are evaluated.`
      : `${environment} is disabled, so only a personal override can turn this on.`,
    value: globallyEnabled ? null : false,
    matched: !globallyEnabled,
  })
  if (!globallyEnabled) decidedBy = 'global_state'

  const matchedRule = globallyEnabled
    ? flag.targetingRules.find((rule) => ruleMatches(rule, user))
    : undefined
  steps.push({
    kind: 'targeting_rule',
    label: 'Targeting rules',
    detail: !globallyEnabled
      ? 'Not evaluated while the environment is disabled.'
      : matchedRule
        ? `Matched "${matchedRule.attribute} ${matchedRule.operator} [${matchedRule.values.join(', ')}]" → ${matchedRule.value}.`
        : flag.targetingRules.length === 0
          ? 'No targeting rules are configured.'
          : `No rule matched this user (${flag.targetingRules.length} evaluated).`,
    value: matchedRule ? matchedRule.value : null,
    matched: Boolean(matchedRule),
  })
  if (matchedRule) {
    value = matchedRule.value
    decidedBy = 'targeting_rule'
  }

  const bucket = rolloutBucket(flag.key, user.id)
  const rollout = config?.rolloutPercentage ?? 0
  const inRollout = bucket < rollout
  const rolloutDecides = globallyEnabled && !matchedRule
  steps.push({
    kind: 'percentage_rollout',
    label: 'Percentage rollout',
    detail: !rolloutDecides
      ? globallyEnabled
        ? 'Skipped: a targeting rule already decided the value.'
        : 'Not evaluated while the environment is disabled.'
      : `Bucket ${bucket} of 100 against a ${rollout}% rollout → ${inRollout ? 'inside' : 'outside'} the rollout.`,
    value: rolloutDecides ? inRollout : null,
    matched: rolloutDecides,
  })
  if (rolloutDecides) {
    value = inRollout
    decidedBy = 'percentage_rollout'
  }

  const override = activeOverride(flag, user.id, environment, now)
  steps.push({
    kind: 'personal_override',
    label: 'Personal override',
    detail: override
      ? `${override.userName} has an override set to ${override.value}${
          override.expiresAt ? ' until it expires' : ''
        }: ${override.reason}`
      : 'No personal override applies to this user.',
    value: override ? override.value : null,
    matched: Boolean(override),
  })
  if (override) {
    value = override.value
    decidedBy = 'personal_override'
  }

  return {
    flagKey: flag.key,
    flagName: flag.name,
    userId: user.id,
    environment,
    value,
    decidedBy,
    steps,
  }
}

export function evaluateFlags(
  flags: readonly FeatureFlag[],
  user: FlagUser,
  environment: EnvironmentKey,
  now: Date = new Date(),
): FlagEvaluation[] {
  return flags.map((flag) => evaluateFlag(flag, user, environment, now))
}

const decidedByLabels: Record<FlagEvaluation['decidedBy'], string> = {
  environment_default: 'the flag default value',
  global_state: 'the environment being disabled',
  targeting_rule: 'a matching targeting rule',
  percentage_rollout: 'the percentage rollout bucket',
  personal_override: 'a personal override',
}

export function decidedByLabel(decidedBy: FlagEvaluation['decidedBy']): string {
  return decidedByLabels[decidedBy]
}

/** Users the current configuration resolves to true, plus the wider estimate. */
export function previewAudience(
  flag: FeatureFlag,
  environment: EnvironmentKey,
  users: readonly FlagUser[],
  now: Date = new Date(),
): AudiencePreview {
  const matchedUsers = users.filter(
    (user) => evaluateFlag(flag, user, environment, now).value,
  )
  const config = environmentConfigFor(flag, environment)
  const sharePct = config?.enabled ? config.rolloutPercentage : 0

  return {
    matchedUsers,
    matchedCount: matchedUsers.length,
    totalUsers: users.length,
    estimatedAudience: Math.round((flag.estimatedAudience * sharePct) / 100),
    sharePct,
  }
}

/** Plain-text trace an operator can paste into a ticket. */
export function evaluationSummaryText(
  evaluation: FlagEvaluation,
  user: FlagUser,
): string {
  const lines = [
    `Flag: ${evaluation.flagName} (${evaluation.flagKey})`,
    `User: ${user.name} <${user.email}> · ${user.id}`,
    `Environment: ${evaluation.environment}`,
    `Effective value: ${evaluation.value} (decided by ${decidedByLabel(evaluation.decidedBy)})`,
    '',
    ...evaluation.steps.map(
      (step, index) =>
        `${index + 1}. ${step.label}${step.matched ? ' [applied]' : ''} — ${step.detail}`,
    ),
  ]
  return lines.join('\n')
}
