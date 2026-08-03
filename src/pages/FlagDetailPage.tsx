import { useCallback, useState } from 'react'
import { useParams } from 'react-router'
import { AlertTriangle, GitBranch, Link2, Undo2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Pill } from '@/components/shared/Badges'
import { ActivityTimeline } from '@/components/shared/ActivityTimeline'
import { CodeSnippetPanel } from '@/components/shared/CodeSnippetPanel'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { EmptyState } from '@/components/shared/EmptyState'
import { EnvironmentWarning } from '@/components/shared/EnvironmentWarning'
import { ExpandableSection } from '@/components/shared/ExpandableSection'
import { FilterSelect } from '@/components/shared/FilterBar'
import { PageBody, PageHeader } from '@/components/shared/PageHeader'
import { DetailList, Panel } from '@/components/shared/Panel'
import { SideBySideDiff } from '@/components/shared/DiffView'
import { EnvironmentSelect } from '@/components/flags/EnvironmentSelect'
import { EvaluationTrace } from '@/components/flags/EvaluationTrace'
import { FlagFocusPanel } from '@/components/flags/FlagFocusPanel'
import { FlagStateCell } from '@/components/flags/FlagStateCell'
import { TargetingPanel } from '@/components/flags/TargetingPanel'
import { useAsyncData } from '@/hooks/useAsyncData'
import { useFlagEnvironment } from '@/hooks/useFlagEnvironment'
import { useSession } from '@/hooks/useSession'
import { rankSignals } from '@/logic/focus'
import { formatDate, formatNumber, formatRelativeTime, titleCase } from '@/logic/format'
import { listActivity } from '@/services/activityService'
import {
  environmentConfig,
  evaluate,
  getAudiencePreview,
  getCodeFootprint,
  getFlag,
  listFlagUsers,
  listSegments,
  rollbackEnvironmentConfig,
  updateEnvironmentConfig,
} from '@/services/flagService'

const HIGH_BLAST_RADIUS = 25

export function FlagDetailPage() {
  const { flagKey = '' } = useParams()
  const { user } = useSession()
  const [environment, setEnvironment] = useFlagEnvironment()
  const [draftRollout, setDraftRollout] = useState<number | null>(null)
  const [confirming, setConfirming] = useState<'config' | 'rollback' | null>(null)
  const [draftEnabled, setDraftEnabled] = useState<boolean | null>(null)
  const [debugUserId, setDebugUserId] = useState('')

  const { data: flag, loading, error, reload } = useAsyncData(() => getFlag(flagKey), [flagKey])
  const flagUsers = useAsyncData(() => listFlagUsers(), [])
  const segments = useAsyncData(() => listSegments(), [])
  const activity = useAsyncData(
    () => listActivity({ module: 'flags', recordId: flag?.key ?? flagKey }),
    [flag?.key, flagKey],
  )

  const refresh = useCallback(() => {
    reload()
    activity.reload()
    setDraftEnabled(null)
    setDraftRollout(null)
  }, [reload, activity])

  if (loading) {
    return (
      <PageBody>
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-64 w-full" />
      </PageBody>
    )
  }

  if (error || !flag) {
    return (
      <PageBody>
        <Panel>
          <EmptyState
            icon={AlertTriangle}
            title="Flag not found"
            description={error?.message ?? `No feature flag matches ${flagKey}.`}
          />
        </Panel>
      </PageBody>
    )
  }

  const config = environmentConfig(flag, environment)
  const primary = rankSignals(flag.signals)[0] ?? null
  const footprint = getCodeFootprint(flag)
  const preview = getAudiencePreview(flag, environment)
  const users = flagUsers.data ?? []
  const selectedUser =
    users.find((candidate) => candidate.id === debugUserId) ?? users[0] ?? null
  const evaluation = selectedUser ? evaluate(flag, selectedUser, environment) : null

  const nextEnabled = draftEnabled ?? config.enabled
  const nextRollout = draftRollout ?? config.rolloutPercentage
  const dirty = nextEnabled !== config.enabled || nextRollout !== config.rolloutPercentage
  const projectedAudience = Math.round(
    (flag.estimatedAudience * (nextEnabled ? nextRollout : 0)) / 100,
  )
  const audienceDelta = projectedAudience - preview.estimatedAudience
  const highBlastRadius =
    environment === 'production' &&
    (Math.abs(nextRollout - config.rolloutPercentage) >= HIGH_BLAST_RADIUS ||
      nextEnabled !== config.enabled)

  const applyConfig = async (reason: string) => {
    try {
      await updateEnvironmentConfig(
        flag.key,
        environment,
        { enabled: nextEnabled, rolloutPercentage: nextRollout },
        reason,
        user.id,
      )
      toast.success(`${flag.key} updated in ${environment}`)
      refresh()
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : 'The change could not be saved')
    } finally {
      setConfirming(null)
    }
  }

  const applyRollback = async (reason: string) => {
    try {
      await rollbackEnvironmentConfig(flag.key, environment, reason, user.id)
      toast.success(`${flag.key} rolled back in ${environment}`)
      refresh()
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : 'The rollback could not be applied')
    } finally {
      setConfirming(null)
    }
  }

  return (
    <>
      <PageHeader
        title={flag.name}
        breadcrumbs={[{ label: 'Feature Flags', to: '/flags' }, { label: flag.key }]}
        meta={
          <>
            <span className="font-mono text-xs text-muted-foreground">{flag.key}</span>
            <Pill tone={flag.lifecycle === 'cleanup' ? 'warning' : 'neutral'}>
              {titleCase(flag.lifecycle)}
            </Pill>
            <Pill tone={config.enabled ? 'positive' : 'neutral'}>
              {config.enabled ? 'Enabled' : 'Disabled'} in {environment}
            </Pill>
          </>
        }
        description={flag.description}
        actions={
          <>
            <EnvironmentSelect value={environment} onChange={setEnvironment} />
            {config.previous ? (
              <Button variant="outline" size="sm" onClick={() => setConfirming('rollback')}>
                <Undo2 className="mr-1.5 h-3.5 w-3.5" />
                Roll back
              </Button>
            ) : null}
            <Button
              size="sm"
              variant={config.enabled ? 'outline' : 'default'}
              onClick={() => {
                setDraftEnabled(!config.enabled)
                setDraftRollout(config.rolloutPercentage)
                setConfirming('config')
              }}
            >
              {config.enabled ? 'Disable' : 'Enable'}
            </Button>
          </>
        }
      />
      <PageBody>
        <EnvironmentWarning environment={environment} audience={preview.estimatedAudience} />

        <FlagFocusPanel
          flag={flag}
          signal={primary}
          config={config}
          audience={preview.estimatedAudience}
        />

        <div className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <Panel
            title={`${titleCase(environment)} configuration`}
            description="Default value, environment state, rollout, targeting, and overrides are distinct layers."
            actions={
              dirty ? (
                <span className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => {
                      setDraftEnabled(null)
                      setDraftRollout(null)
                    }}
                  >
                    Discard
                  </Button>
                  <Button size="sm" className="h-7 text-xs" onClick={() => setConfirming('config')}>
                    Review change
                  </Button>
                </span>
              ) : null
            }
          >
            <div className="flex flex-wrap items-end gap-4 rounded border bg-surface-muted/50 px-3 py-2.5">
              <label className="flex cursor-pointer items-center gap-2 text-sm text-foreground">
                <input
                  type="checkbox"
                  checked={nextEnabled}
                  onChange={(event) => setDraftEnabled(event.target.checked)}
                  className="h-4 w-4 rounded border-input accent-navy-700"
                />
                Enabled in {environment}
              </label>
              <div className="flex-1 space-y-1">
                <Label htmlFor="rollout" className="text-label">
                  Percentage rollout
                </Label>
                <div className="flex items-center gap-3">
                  <input
                    id="rollout"
                    type="range"
                    min={0}
                    max={100}
                    step={5}
                    value={nextRollout}
                    disabled={!nextEnabled}
                    onChange={(event) => setDraftRollout(Number(event.target.value))}
                    className="h-1.5 w-full min-w-[140px] cursor-pointer accent-navy-700"
                  />
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={nextRollout}
                    disabled={!nextEnabled}
                    onChange={(event) =>
                      setDraftRollout(Math.min(100, Math.max(0, Number(event.target.value))))
                    }
                    className="h-8 w-[76px] text-sm tabular-nums"
                  />
                </div>
              </div>
              <span className="text-xs text-muted-foreground">
                {formatNumber(projectedAudience)} users in scope
                {dirty && audienceDelta !== 0
                  ? ` (${audienceDelta > 0 ? '+' : ''}${formatNumber(audienceDelta)})`
                  : ''}
              </span>
            </div>

            <div className="mt-3 space-y-2">
              {flag.environments.map((entry) => (
                <div
                  key={entry.environment}
                  className="flex flex-wrap items-center justify-between gap-3 rounded border px-3 py-2"
                >
                  <span className="text-sm font-medium capitalize text-foreground">
                    {entry.environment}
                  </span>
                  <FlagStateCell config={entry} />
                  <span className="text-xs text-muted-foreground">
                    updated {formatRelativeTime(entry.updatedAt)}
                  </span>
                </div>
              ))}
            </div>

            <DetailList
              className="mt-3 border-t pt-3"
              columns={3}
              items={[
                { label: 'Default value', value: flag.defaultValue ? 'true' : 'false' },
                { label: 'Targeting rules', value: `${flag.targetingRules.length}` },
                { label: 'Personal overrides', value: `${flag.personalOverrides.length}` },
              ]}
            />
          </Panel>

          <Panel
            title="Effective value"
            description="Resolved with the same evaluator the debugger uses."
            actions={
              users.length ? (
                <FilterSelect
                  label="User"
                  value={selectedUser?.id ?? ''}
                  onChange={setDebugUserId}
                  options={users.map((candidate) => ({
                    value: candidate.id,
                    label: candidate.name,
                  }))}
                  placeholder="Select a user"
                  triggerClassName="w-[170px]"
                />
              ) : null
            }
            footer={
              selectedUser
                ? `${selectedUser.email} · ${selectedUser.plan} · ${selectedUser.country} · ${selectedUser.segments.join(', ') || 'no segments'}`
                : undefined
            }
          >
            {evaluation ? (
              <EvaluationTrace evaluation={evaluation} />
            ) : (
              <p className="text-sm text-muted-foreground">Select a user to resolve the flag.</p>
            )}
          </Panel>
        </div>

        <TargetingPanel
          flag={flag}
          environment={environment}
          users={users}
          segments={segments.data ?? []}
          onChanged={refresh}
        />

        <div className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <Panel
            title="Code usage"
            description={`${footprint.references} references across ${footprint.repositories} repositories and ${footprint.services} services.`}
            actions={
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <GitBranch className="h-3.5 w-3.5" aria-hidden />
                {footprint.languages} languages ·{' '}
                {footprint.disabledPathCovered
                  ? 'disabled path covered by tests'
                  : 'no test covers the disabled path'}
                {footprint.cleanupCandidates
                  ? ` · ${footprint.cleanupCandidates} cleanup candidates`
                  : ''}
              </span>
            }
            bodyClassName="space-y-3"
          >
            {flag.codeLocations.map((location) => (
              <CodeSnippetPanel
                key={location.id}
                repository={location.repository}
                filePath={location.filePath}
                line={location.line}
                branch={location.branch}
                commit={location.commit}
                language={location.language}
                usageType={location.usageType}
                snippet={location.snippet}
                highlightLine={location.highlightLine}
                onOpenInDevin={() =>
                  toast.info('Sent to Devin', {
                    description: `${location.repository}/${location.filePath}:${location.line} · last changed by ${location.lastModifiedBy} ${formatRelativeTime(location.lastModifiedAt)}.`,
                  })
                }
              />
            ))}
          </Panel>

          <Panel title="Feature context" description="What the flag controls and who owns it.">
            <DetailList
              columns={1}
              items={[
                { label: 'Owning team', value: flag.ownerTeam },
                { label: 'Created', value: formatDate(flag.createdAt) },
                {
                  label: 'Estimated audience',
                  value: `${formatNumber(flag.estimatedAudience)} users in scope`,
                },
                { label: 'Rollout criteria', value: flag.rolloutCriteria ?? 'Not defined' },
                { label: 'Rollback criteria', value: flag.rollbackCriteria ?? 'Not defined' },
              ]}
            />
            {flag.resources.length ? (
              <ul className="mt-3 space-y-1 border-t pt-3">
                {flag.resources.map((resource) => (
                  <li key={resource.url} className="flex items-center gap-1.5 text-sm">
                    <Link2 className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
                    <a
                      href={resource.url}
                      className="text-navy-700 underline-offset-2 hover:underline"
                    >
                      {resource.label}
                    </a>
                    <span className="text-xs text-muted-foreground">({resource.type})</span>
                  </li>
                ))}
              </ul>
            ) : null}
          </Panel>
        </div>

        <ExpandableSection
          title="Flag activity"
          summary={`${activity.data?.length ?? 0} recorded changes`}
          defaultOpen
        >
          <ActivityTimeline events={activity.data ?? []} showRecordLink={false} />
        </ExpandableSection>
      </PageBody>

      {confirming === 'config' ? (
        <ConfirmDialog
          open
          onOpenChange={(open) => {
            if (!open) setConfirming(null)
          }}
          title={`Change the ${environment} configuration`}
          description={`${flag.name} resolves differently for everyone in scope as soon as this is applied.`}
          confirmLabel="Apply change"
          destructive={!nextEnabled && config.enabled}
          requireReason
          environment={environment}
          typedConfirmation={highBlastRadius ? flag.key : undefined}
          details={
            <div className="space-y-2">
              <SideBySideDiff
                rows={[
                  {
                    field: 'enabled',
                    before: String(config.enabled),
                    after: String(nextEnabled),
                  },
                  {
                    field: 'rolloutPercentage',
                    before: `${config.rolloutPercentage}%`,
                    after: `${nextEnabled ? nextRollout : 0}%`,
                  },
                  {
                    field: 'usersInScope',
                    before: formatNumber(preview.estimatedAudience),
                    after: formatNumber(projectedAudience),
                  },
                ]}
              />
              <p className="text-xs text-muted-foreground">
                {audienceDelta === 0
                  ? 'The audience in scope does not change.'
                  : `${audienceDelta > 0 ? 'Adds' : 'Removes'} roughly ${formatNumber(Math.abs(audienceDelta))} users.`}
              </p>
            </div>
          }
          onConfirm={applyConfig}
        />
      ) : null}

      {confirming === 'rollback' && config.previous ? (
        <ConfirmDialog
          open
          onOpenChange={(open) => {
            if (!open) setConfirming(null)
          }}
          title={`Roll back the ${environment} configuration`}
          description="The flag returns to the state it held before the last change."
          confirmLabel="Roll back"
          requireReason
          environment={environment}
          details={
            <SideBySideDiff
              beforeLabel="Current"
              afterLabel="After rollback"
              rows={[
                {
                  field: 'enabled',
                  before: String(config.enabled),
                  after: String(config.previous.enabled),
                },
                {
                  field: 'rolloutPercentage',
                  before: `${config.rolloutPercentage}%`,
                  after: `${config.previous.rolloutPercentage}%`,
                },
              ]}
            />
          }
          onConfirm={applyRollback}
        />
      ) : null}
    </>
  )
}
