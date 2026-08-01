import { useParams } from 'react-router'
import { AlertTriangle, GitBranch, Link2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Pill } from '@/components/shared/Badges'
import { CodeSnippetPanel } from '@/components/shared/CodeSnippetPanel'
import { EmptyState } from '@/components/shared/EmptyState'
import { EnvironmentWarning } from '@/components/shared/EnvironmentWarning'
import { ExpandableSection } from '@/components/shared/ExpandableSection'
import { PageBody, PageHeader } from '@/components/shared/PageHeader'
import { DetailList, Panel } from '@/components/shared/Panel'
import { ScaffoldNotice } from '@/components/shared/ScaffoldNotice'
import { FlagStateCell } from '@/components/flags/FlagStateCell'
import { useAsyncData } from '@/hooks/useAsyncData'
import { useSession } from '@/hooks/useSession'
import { explainFocusSelection, flagFocusLabel, rankSignals } from '@/logic/focus'
import { formatDate, formatNumber, formatRelativeTime, titleCase } from '@/logic/format'
import { environmentConfig, getCodeFootprint, getFlag } from '@/services/flagService'

export function FlagDetailPage() {
  const { flagKey = '' } = useParams()
  const { environment } = useSession()
  const { data: flag, loading, error } = useAsyncData(() => getFlag(flagKey), [flagKey])

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
            description={error?.message ?? `No synthetic flag matches ${flagKey}.`}
          />
        </Panel>
      </PageBody>
    )
  }

  const config = environmentConfig(flag, environment)
  const primary = rankSignals(flag.signals)[0]
  const footprint = getCodeFootprint(flag)

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
          </>
        }
        description={flag.description}
        actions={
          <>
            <Button variant="outline" size="sm" disabled>
              Change rollout
            </Button>
            <Button size="sm" disabled>
              {config.enabled ? 'Disable' : 'Enable'}
            </Button>
          </>
        }
      />
      <PageBody>
        <EnvironmentWarning environment={environment} />

        {primary ? (
          <Panel
            emphasis="primary"
            title={
              <span className="flex flex-wrap items-center gap-2">
                <span className="text-label">Operational focus</span>
                <span className="text-base font-semibold text-foreground">{flagFocusLabel(primary.type)}</span>
              </span>
            }
            description={primary.headline}
            footer={`Why this is first: ${explainFocusSelection(flag.signals)} Source: ${primary.source}.`}
          >
            <p className="text-sm text-foreground">{primary.explanation}</p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
              {primary.evidence.map((item) => (
                <div
                  key={`${item.label}-${item.value}`}
                  className={
                    item.conflicting
                      ? 'rounded border border-rose-200 bg-rose-50/70 px-2.5 py-1.5'
                      : 'rounded border bg-surface-muted/60 px-2.5 py-1.5'
                  }
                >
                  <p className="text-label">{item.label}</p>
                  <p className="mt-0.5 truncate text-sm text-foreground">{item.value}</p>
                </div>
              ))}
            </div>
          </Panel>
        ) : null}

        <div className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <Panel
            title="Configuration"
            description="Default value, environment configuration, rollout, and targeting are distinct layers."
          >
            <div className="space-y-2">
              {flag.environments.map((entry) => (
                <div
                  key={entry.environment}
                  className="flex flex-wrap items-center justify-between gap-3 rounded border bg-surface-muted/50 px-3 py-2"
                >
                  <span className="text-sm font-medium capitalize text-foreground">{entry.environment}</span>
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
                { label: 'Rollback criteria', value: flag.rollbackCriteria ?? 'Not defined' },
              ]}
            />
            {flag.resources.length ? (
              <ul className="mt-3 space-y-1 border-t pt-3">
                {flag.resources.map((resource) => (
                  <li key={resource.url} className="flex items-center gap-1.5 text-sm">
                    <Link2 className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
                    <a href={resource.url} className="text-navy-700 underline-offset-2 hover:underline">
                      {resource.label}
                    </a>
                    <span className="text-xs text-muted-foreground">({resource.type})</span>
                  </li>
                ))}
              </ul>
            ) : null}
          </Panel>
        </div>

        <Panel
          title="Code usage"
          description={`${footprint.references} references across ${footprint.repositories} repositories and ${footprint.services} services (synthetic index).`}
          actions={
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <GitBranch className="h-3.5 w-3.5" aria-hidden />
              Simulated repository data
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
                toast.info('Simulated Devin hand-off', {
                  description: `${location.repository}/${location.filePath}:${location.line} would open in Devin. No real integration is configured.`,
                })
              }
            />
          ))}
        </Panel>

        <ExpandableSection
          title="Targeting rules and overrides"
          summary={`${flag.targetingRules.length} rules · ${flag.personalOverrides.length} personal overrides`}
        >
          {flag.targetingRules.length === 0 && flag.personalOverrides.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No targeting rules or personal overrides are configured for this flag.
            </p>
          ) : (
            <div className="space-y-2">
              {flag.targetingRules.map((rule) => (
                <div key={rule.id} className="rounded border bg-surface-muted/50 px-3 py-2">
                  <p className="font-mono text-xs text-foreground">
                    {rule.attribute} {rule.operator} [{rule.values.join(', ')}] → {String(rule.value)}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{rule.description}</p>
                </div>
              ))}
              {flag.personalOverrides.map((override) => (
                <div
                  key={`${override.userId}-${override.environment}`}
                  className="rounded border border-violet-200 bg-violet-50/60 px-3 py-2"
                >
                  <p className="text-sm text-foreground">
                    Personal override · {override.userName} → {String(override.value)} in {override.environment}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {override.reason}
                    {override.expiresAt ? ` · expires ${formatRelativeTime(override.expiresAt)}` : ''}
                  </p>
                </div>
              ))}
            </div>
          )}
        </ExpandableSection>

        <ScaffoldNotice
          planned={[
            'Type-specific focus panels for exposure, risky change, staleness, scheduled rollout, and dependencies',
            'Enable/disable and rollout edits with required reason, before/after diff, and confirmation',
            'Effective value for a selected user, resolved through the evaluation trace',
            'Adding or removing users and segments from targeting rules with an audience preview',
            'Grouped code references with test coverage and stale-reference hints',
          ]}
          available={[
            'Environment configuration separated from default value, rollout, targeting, and overrides',
            'Synthetic code index with copyable references and a simulated Devin hand-off',
            'Personal overrides visually distinguished from global configuration',
          ]}
        />
      </PageBody>
    </>
  )
}
