import { useState } from 'react'
import { Plus, Trash2, UserCog, Users } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Pill } from '@/components/shared/Badges'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { FilterSelect } from '@/components/shared/FilterBar'
import { Panel } from '@/components/shared/Panel'
import { useSession } from '@/hooks/useSession'
import { formatNumber, formatPercent, formatRelativeTime } from '@/logic/format'
import { ruleMatches } from '@/logic/flagEvaluation'
import {
  addTargetingRule,
  clearPersonalOverride,
  getAudiencePreview,
  removeTargetingRule,
  setPersonalOverride,
  type TargetingRuleInput,
} from '@/services/flagService'
import type {
  EnvironmentKey,
  FeatureFlag,
  FlagUser,
  PersonalOverride,
  TargetingRule,
} from '@/types'

const attributeOptions = [
  { value: 'segment', label: 'Segment' },
  { value: 'userId', label: 'User ID' },
  { value: 'email', label: 'Email' },
  { value: 'plan', label: 'Plan' },
  { value: 'country', label: 'Country' },
]

const operatorOptions = [
  { value: 'in', label: 'in' },
  { value: 'not_in', label: 'not in' },
  { value: 'equals', label: 'equals' },
  { value: 'matches', label: 'matches' },
]

const valueOptions = [
  { value: 'true', label: 'true' },
  { value: 'false', label: 'false' },
]

interface TargetingPanelProps {
  flag: FeatureFlag
  environment: EnvironmentKey
  users: FlagUser[]
  segments: string[]
  onChanged: () => void
}

type PendingAction =
  | { kind: 'add_rule'; input: TargetingRuleInput }
  | { kind: 'remove_rule'; rule: TargetingRule }
  | { kind: 'set_override'; userId: string; userName: string; value: boolean; expiresAt?: string }
  | { kind: 'clear_override'; override: PersonalOverride }

/** Targeting rules, personal overrides, and the audience they resolve to. */
export function TargetingPanel({
  flag,
  environment,
  users,
  segments,
  onChanged,
}: TargetingPanelProps) {
  const { user } = useSession()
  const [pending, setPending] = useState<PendingAction | null>(null)
  const [attribute, setAttribute] = useState('segment')
  const [operator, setOperator] = useState('in')
  const [values, setValues] = useState('')
  const [ruleValue, setRuleValue] = useState('true')
  const [overrideUserId, setOverrideUserId] = useState(users[0]?.id ?? '')
  const [overrideValue, setOverrideValue] = useState('true')
  const [overrideExpiry, setOverrideExpiry] = useState('')

  const preview = getAudiencePreview(flag, environment)
  const environmentOverrides = flag.personalOverrides.filter(
    (override) => override.environment === environment,
  )

  const valueList = values
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)

  const shadowedRuleIds = new Set(
    flag.targetingRules
      .filter((rule, index) =>
        flag.targetingRules.some(
          (earlier, earlierIndex) =>
            earlierIndex < index &&
            earlier.attribute === rule.attribute &&
            earlier.operator === rule.operator &&
            rule.values.every((entry) => earlier.values.includes(entry)),
        ),
      )
      .map((rule) => rule.id),
  )

  const run = async (reason: string) => {
    if (!pending) return
    try {
      if (pending.kind === 'add_rule') {
        await addTargetingRule(flag.key, pending.input, reason, user.id)
        setValues('')
        toast.success('Targeting rule added')
      } else if (pending.kind === 'remove_rule') {
        await removeTargetingRule(flag.key, pending.rule.id, reason, user.id)
        toast.success('Targeting rule removed')
      } else if (pending.kind === 'set_override') {
        await setPersonalOverride(
          flag.key,
          {
            userId: pending.userId,
            userName: pending.userName,
            value: pending.value,
            environment,
            expiresAt: pending.expiresAt,
          },
          reason,
          user.id,
        )
        setOverrideExpiry('')
        toast.success(`Override set for ${pending.userName}`)
      } else {
        await clearPersonalOverride(
          flag.key,
          pending.override.userId,
          pending.override.environment,
          reason,
          user.id,
        )
        toast.success(`Override cleared for ${pending.override.userName}`)
      }
      onChanged()
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : 'The change could not be saved')
    } finally {
      setPending(null)
    }
  }

  const pendingRuleMatches =
    pending?.kind === 'add_rule'
      ? users.filter((candidate) =>
          ruleMatches({ id: 'preview', ...pending.input }, candidate),
        )
      : []

  return (
    <>
      <Panel
        title="Targeting and overrides"
        description={`Rules and personal overrides applied in ${environment}. Overrides win over every other layer.`}
        actions={
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Users className="h-3.5 w-3.5" aria-hidden />
            {preview.matchedCount} of {preview.totalUsers} sample users resolve to true ·{' '}
            {formatNumber(preview.estimatedAudience)} estimated ({formatPercent(preview.sharePct)}{' '}
            of scope)
          </span>
        }
        bodyClassName="space-y-4"
      >
        <div className="space-y-2">
          <p className="text-label">Targeting rules</p>
          {flag.targetingRules.length === 0 ? (
            <p className="text-sm text-muted-foreground">No targeting rules are configured.</p>
          ) : (
            <ul className="space-y-1.5">
              {flag.targetingRules.map((rule) => (
                <li
                  key={rule.id}
                  className="flex flex-wrap items-center gap-2 rounded border bg-surface-muted/50 px-3 py-2"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block font-mono text-xs text-foreground">
                      {rule.attribute} {rule.operator} [{rule.values.join(', ')}] →{' '}
                      {String(rule.value)}
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      {rule.description || 'No description'} ·{' '}
                      {users.filter((candidate) => ruleMatches(rule, candidate)).length} sample
                      users match
                    </span>
                  </span>
                  {shadowedRuleIds.has(rule.id) ? (
                    <Pill tone="warning">Shadowed by an earlier rule</Pill>
                  ) : null}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs"
                    onClick={() => setPending({ kind: 'remove_rule', rule })}
                  >
                    <Trash2 className="mr-1 h-3.5 w-3.5" />
                    Remove
                  </Button>
                </li>
              ))}
            </ul>
          )}

          <div className="flex flex-wrap items-end gap-2 rounded border border-dashed px-3 py-2.5">
            <FilterSelect
              label="Attribute"
              value={attribute}
              onChange={setAttribute}
              options={attributeOptions}
              triggerClassName="w-[130px]"
            />
            <FilterSelect
              label="Operator"
              value={operator}
              onChange={setOperator}
              options={operatorOptions}
              triggerClassName="w-[110px]"
            />
            {attribute === 'segment' ? (
              <FilterSelect
                label="Segment"
                value={valueList[0] ?? ''}
                onChange={setValues}
                options={segments.map((segment) => ({ value: segment, label: segment }))}
                placeholder="Select a segment"
                triggerClassName="w-[180px]"
              />
            ) : (
              <div className="space-y-1">
                <Label htmlFor="rule-values" className="text-label">
                  Values (comma separated)
                </Label>
                <Input
                  id="rule-values"
                  value={values}
                  onChange={(event) => setValues(event.target.value)}
                  placeholder="u_10231, u_10488"
                  className="h-8 w-[220px] text-sm"
                />
              </div>
            )}
            <FilterSelect
              label="Serves"
              value={ruleValue}
              onChange={setRuleValue}
              options={valueOptions}
              triggerClassName="w-[100px]"
            />
            <Button
              size="sm"
              disabled={valueList.length === 0}
              onClick={() =>
                setPending({
                  kind: 'add_rule',
                  input: {
                    attribute: attribute as TargetingRule['attribute'],
                    operator: operator as TargetingRule['operator'],
                    values: valueList,
                    value: ruleValue === 'true',
                    description: `${attribute} ${operator} ${valueList.join(', ')}`,
                  },
                })
              }
            >
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Add rule
            </Button>
          </div>
        </div>

        <div className="space-y-2 border-t pt-3">
          <p className="text-label">Personal overrides</p>
          {environmentOverrides.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No personal overrides are set in {environment}.
            </p>
          ) : (
            <ul className="space-y-1.5">
              {environmentOverrides.map((override) => (
                <li
                  key={`${override.userId}-${override.environment}`}
                  className="flex flex-wrap items-center gap-2 rounded border border-violet-200 bg-violet-50/60 px-3 py-2"
                >
                  <UserCog className="h-3.5 w-3.5 shrink-0 text-violet-700" aria-hidden />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm text-foreground">
                      {override.userName} → {String(override.value)}
                      <span className="ml-2 font-mono text-xs text-muted-foreground">
                        {override.userId}
                      </span>
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      {override.reason}
                      {override.expiresAt
                        ? ` · expires ${formatRelativeTime(override.expiresAt)}`
                        : ' · no expiry'}
                    </span>
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs"
                    onClick={() => setPending({ kind: 'clear_override', override })}
                  >
                    <Trash2 className="mr-1 h-3.5 w-3.5" />
                    Clear
                  </Button>
                </li>
              ))}
            </ul>
          )}

          <div className="flex flex-wrap items-end gap-2 rounded border border-dashed px-3 py-2.5">
            <FilterSelect
              label="User"
              value={overrideUserId}
              onChange={setOverrideUserId}
              options={users.map((candidate) => ({
                value: candidate.id,
                label: `${candidate.name} · ${candidate.id}`,
              }))}
              placeholder="Select a user"
              triggerClassName="w-[230px]"
            />
            <FilterSelect
              label="Value"
              value={overrideValue}
              onChange={setOverrideValue}
              options={valueOptions}
              triggerClassName="w-[100px]"
            />
            <div className="space-y-1">
              <Label htmlFor="override-expiry" className="text-label">
                Expires (optional)
              </Label>
              <Input
                id="override-expiry"
                type="date"
                value={overrideExpiry}
                onChange={(event) => setOverrideExpiry(event.target.value)}
                className="h-8 w-[160px] text-sm"
              />
            </div>
            <Button
              size="sm"
              disabled={!overrideUserId}
              onClick={() => {
                const target = users.find((candidate) => candidate.id === overrideUserId)
                if (!target) return
                setPending({
                  kind: 'set_override',
                  userId: target.id,
                  userName: target.name,
                  value: overrideValue === 'true',
                  expiresAt: overrideExpiry
                    ? new Date(`${overrideExpiry}T00:00:00Z`).toISOString()
                    : undefined,
                })
              }}
            >
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Set override
            </Button>
          </div>
        </div>
      </Panel>

      {pending ? (
        <ConfirmDialog
          open
          onOpenChange={(open) => {
            if (!open) setPending(null)
          }}
          title={
            pending.kind === 'add_rule'
              ? 'Add this targeting rule'
              : pending.kind === 'remove_rule'
                ? 'Remove this targeting rule'
                : pending.kind === 'set_override'
                  ? `Set an override for ${pending.userName}`
                  : `Clear the override for ${pending.override.userName}`
          }
          description={
            pending.kind === 'set_override' || pending.kind === 'clear_override'
              ? 'Personal overrides take precedence over targeting and rollout for that user only.'
              : `Targeting changes apply immediately in ${environment} for everyone the rule matches.`
          }
          confirmLabel={
            pending.kind === 'remove_rule' || pending.kind === 'clear_override'
              ? 'Remove'
              : 'Apply change'
          }
          destructive={pending.kind === 'remove_rule' || pending.kind === 'clear_override'}
          requireReason
          environment={environment}
          details={
            <div className="rounded border bg-surface-muted/60 px-3 py-2 text-sm">
              {pending.kind === 'add_rule' ? (
                <>
                  <p className="font-mono text-xs text-foreground">
                    {pending.input.attribute} {pending.input.operator} [
                    {pending.input.values.join(', ')}] → {String(pending.input.value)}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Audience preview: {pendingRuleMatches.length} of {users.length} sample users
                    match this rule
                    {pendingRuleMatches.length > 0
                      ? ` (${pendingRuleMatches
                          .slice(0, 3)
                          .map((candidate) => candidate.name)
                          .join(', ')}${pendingRuleMatches.length > 3 ? ', …' : ''})`
                      : ''}
                    .
                  </p>
                </>
              ) : pending.kind === 'remove_rule' ? (
                <p className="font-mono text-xs text-foreground">
                  {pending.rule.attribute} {pending.rule.operator} [
                  {pending.rule.values.join(', ')}] → {String(pending.rule.value)}
                </p>
              ) : pending.kind === 'set_override' ? (
                <p className="text-xs text-foreground">
                  {pending.userName} will resolve to{' '}
                  <span className="font-mono">{String(pending.value)}</span> in {environment}
                  {pending.expiresAt
                    ? ` until ${new Date(pending.expiresAt).toLocaleDateString('en-US')}`
                    : ' with no expiry'}
                  .
                </p>
              ) : (
                <p className="text-xs text-foreground">
                  {pending.override.userName} falls back to the standard evaluation path.
                </p>
              )}
            </div>
          }
          onConfirm={run}
        />
      ) : null}
    </>
  )
}
