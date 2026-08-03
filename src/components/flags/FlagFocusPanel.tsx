import {
  Ban,
  CalendarClock,
  FlaskConical,
  Link2,
  Radio,
  RotateCcw,
  Timer,
} from 'lucide-react'
import { Link } from 'react-router'
import { cn } from '@/lib/utils'
import { Pill } from '@/components/shared/Badges'
import { DetailList, Panel } from '@/components/shared/Panel'
import { flagFocusLabel } from '@/logic/focus'
import { formatDate, formatNumber, formatRelativeTime } from '@/logic/format'
import type { EnvironmentConfig, FeatureFlag, FlagSignal, FlagSignalType } from '@/types'

const panelIcon: Record<FlagSignalType, typeof Radio> = {
  broad_production_exposure: Radio,
  recent_risky_change: RotateCcw,
  stale_flag: Timer,
  scheduled_rollout: CalendarClock,
  dependent_flag: Link2,
  development_flag: FlaskConical,
}

interface FlagFocusPanelProps {
  flag: FeatureFlag
  signal: FlagSignal | null
  config: EnvironmentConfig
  audience: number
}

/** The evidence behind the flag's leading operational concern. */
export function FlagFocusPanel({ flag, signal, config, audience }: FlagFocusPanelProps) {
  const type = signal?.type
  const Icon = type ? panelIcon[type] : Ban

  const header = (
    <span className="flex flex-col">
      <span className="text-label">Operational focus</span>
      <span className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-navy-700" aria-hidden />
        <span className="text-base font-semibold text-foreground">
          {type ? flagFocusLabel(type) : 'No operational concern'}
        </span>
      </span>
    </span>
  )

  if (!signal) {
    return (
      <Panel
        title={header}
        description="Nothing about this flag's exposure, age, or dependencies needs attention."
      >
        <DetailList
          columns={3}
          items={[
            { label: 'Enabled', value: config.enabled ? 'Yes' : 'No' },
            { label: 'Rollout', value: `${config.rolloutPercentage}%` },
            { label: 'Users in scope', value: formatNumber(audience) },
          ]}
        />
      </Panel>
    )
  }

  const evidence = (
    <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
      {signal.evidence.map((item) => (
        <div
          key={`${item.label}-${item.value}`}
          className={
            item.conflicting
              ? 'rounded border border-rose-200 bg-rose-50/70 px-2.5 py-1.5'
              : 'rounded border bg-surface-muted/60 px-2.5 py-1.5'
          }
        >
          <p className="text-label">{item.label}</p>
          <p className="mt-0.5 text-sm text-foreground">{item.value}</p>
        </div>
      ))}
    </div>
  )

  if (type === 'broad_production_exposure') {
    return (
      <Panel
        emphasis="primary"
        title={header}
        description={signal.headline}
        actions={<Pill tone="warning">{formatNumber(audience)} users in scope</Pill>}
        bodyClassName="space-y-3 px-4 py-3"
      >
        <p className="text-sm text-foreground">{signal.explanation}</p>
        <div className="rounded border bg-surface-muted/60 px-3 py-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Production rollout</span>
            <span className="tabular-nums">{config.rolloutPercentage}%</span>
          </div>
          <span className="mt-1.5 block h-2 overflow-hidden rounded-full bg-slate-200">
            <span
              className={cn(
                'block h-full rounded-full',
                config.rolloutPercentage >= 50 ? 'bg-amber-500' : 'bg-navy-600',
              )}
              style={{ width: `${config.rolloutPercentage}%` }}
            />
          </span>
        </div>
        {evidence}
      </Panel>
    )
  }

  if (type === 'recent_risky_change') {
    return (
      <Panel
        emphasis="primary"
        title={header}
        description={signal.headline}
        actions={
          config.previous ? (
            <Pill tone="warning">Changed {formatRelativeTime(config.updatedAt)}</Pill>
          ) : null
        }
        bodyClassName="space-y-3 px-4 py-3"
      >
        <p className="text-sm text-foreground">{signal.explanation}</p>
        {config.previous ? (
          <DetailList
            columns={4}
            items={[
              { label: 'Previous enabled', value: String(config.previous.enabled) },
              { label: 'Previous rollout', value: `${config.previous.rolloutPercentage}%` },
              { label: 'Current enabled', value: String(config.enabled), emphasis: true },
              {
                label: 'Current rollout',
                value: `${config.rolloutPercentage}%`,
                emphasis: true,
              },
            ]}
          />
        ) : null}
        {evidence}
        <p className="text-xs text-muted-foreground">
          Rollback criteria: {flag.rollbackCriteria ?? 'not defined for this flag'}.
        </p>
      </Panel>
    )
  }

  if (type === 'stale_flag') {
    return (
      <Panel
        emphasis="primary"
        title={header}
        description={signal.headline}
        actions={<Pill tone="warning">Untouched {formatRelativeTime(flag.updatedAt)}</Pill>}
        bodyClassName="space-y-3 px-4 py-3"
      >
        <p className="text-sm text-foreground">{signal.explanation}</p>
        <DetailList
          columns={4}
          items={[
            { label: 'Created', value: formatDate(flag.createdAt) },
            { label: 'Last change', value: formatRelativeTime(flag.updatedAt), emphasis: true },
            {
              label: 'Expected removal',
              value: flag.expectedRemovalAt ? formatDate(flag.expectedRemovalAt) : 'Not scheduled',
            },
            { label: 'Code references', value: `${flag.codeLocations.length}` },
          ]}
        />
        {evidence}
      </Panel>
    )
  }

  if (type === 'scheduled_rollout' && flag.rolloutPlan) {
    return (
      <Panel
        emphasis="primary"
        title={header}
        description={signal.headline}
        actions={<Pill tone="neutral">{flag.rolloutPlan.length} stages</Pill>}
        bodyClassName="space-y-3 px-4 py-3"
      >
        <p className="text-sm text-foreground">{signal.explanation}</p>
        <ol className="space-y-1">
          {flag.rolloutPlan.map((stage) => (
            <li
              key={stage.label}
              className={cn(
                'flex flex-wrap items-center justify-between gap-2 rounded border px-3 py-1.5 text-sm',
                stage.state === 'active'
                  ? 'border-navy-300 bg-navy-50'
                  : 'border-transparent bg-surface-muted/60',
              )}
            >
              <span className="text-foreground">{stage.label}</span>
              <span className="tabular-nums text-muted-foreground">{stage.percentage}%</span>
              <span className="text-xs text-muted-foreground">
                {formatDate(stage.scheduledFor)}
              </span>
              <Pill
                tone={
                  stage.state === 'complete'
                    ? 'positive'
                    : stage.state === 'active'
                      ? 'warning'
                      : 'neutral'
                }
              >
                {stage.state}
              </Pill>
            </li>
          ))}
        </ol>
        {flag.rolloutCriteria ? (
          <p className="text-xs text-muted-foreground">
            Advance criteria: {flag.rolloutCriteria}
          </p>
        ) : null}
      </Panel>
    )
  }

  if (type === 'dependent_flag') {
    return (
      <Panel
        emphasis="primary"
        title={header}
        description={signal.headline}
        actions={<Pill tone="warning">{flag.dependencies.length} linked flags</Pill>}
        bodyClassName="space-y-3 px-4 py-3"
      >
        <p className="text-sm text-foreground">{signal.explanation}</p>
        <ul className="space-y-1.5">
          {flag.dependencies.map((dependency) => (
            <li
              key={dependency.flagKey}
              className="rounded border bg-surface-muted/60 px-3 py-2 text-sm"
            >
              <span className="flex flex-wrap items-center gap-2">
                <Pill tone={dependency.relationship === 'blocks' ? 'critical' : 'neutral'}>
                  {dependency.relationship}
                </Pill>
                <Link
                  to={`/flags/${dependency.flagKey}`}
                  className="font-mono text-xs text-navy-700 underline-offset-2 hover:underline"
                >
                  {dependency.flagKey}
                </Link>
              </span>
              <p className="mt-1 text-xs text-muted-foreground">{dependency.description}</p>
            </li>
          ))}
        </ul>
        {evidence}
      </Panel>
    )
  }

  return (
    <Panel
      emphasis="primary"
      title={header}
      description={signal.headline}
      bodyClassName="space-y-3 px-4 py-3"
    >
      <p className="text-sm text-foreground">{signal.explanation}</p>
      {evidence}
    </Panel>
  )
}
