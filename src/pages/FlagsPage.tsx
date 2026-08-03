import { useMemo } from 'react'
import { useNavigate } from 'react-router'
import { Bug, RotateCcw, Star } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Pill } from '@/components/shared/Badges'
import { DataTable, type Column } from '@/components/shared/DataTable'
import { FilterBar, FilterSelect } from '@/components/shared/FilterBar'
import { MetricCard, MetricRow } from '@/components/shared/MetricCard'
import { PageBody, PageHeader } from '@/components/shared/PageHeader'
import { Panel } from '@/components/shared/Panel'
import { EnvironmentSelect } from '@/components/flags/EnvironmentSelect'
import { FlagStateCell } from '@/components/flags/FlagStateCell'
import { useAsyncData } from '@/hooks/useAsyncData'
import { useFlagEnvironment } from '@/hooks/useFlagEnvironment'
import { useLocalStorageState } from '@/hooks/useLocalStorageState'
import { useSession } from '@/hooks/useSession'
import { flagFocusLabel, selectPrimarySignal } from '@/logic/focus'
import { formatRelativeTime, titleCase } from '@/logic/format'
import { environmentConfig, listFlags, listMyFlags } from '@/services/flagService'
import type { FeatureFlag, FlagLifecycle } from '@/types'

const lifecycleOptions = [
  { value: 'all', label: 'All lifecycles' },
  { value: 'development', label: 'Development' },
  { value: 'rollout', label: 'Rollout' },
  { value: 'permanent', label: 'Permanent' },
  { value: 'rollback', label: 'Rollback' },
  { value: 'cleanup', label: 'Cleanup' },
]

const stateOptions = [
  { value: 'all', label: 'Any state' },
  { value: 'enabled', label: 'Enabled' },
  { value: 'disabled', label: 'Disabled' },
]

interface StoredFlagFilters {
  search: string
  lifecycle: string
  state: string
  ownerTeam: string
  staleOnly: boolean
}

const defaultFilters: StoredFlagFilters = {
  search: '',
  lifecycle: 'all',
  state: 'all',
  ownerTeam: 'all',
  staleOnly: false,
}

export function FlagsPage({ mine = false }: { mine?: boolean }) {
  const navigate = useNavigate()
  const { user } = useSession()
  const [environment, setEnvironment] = useFlagEnvironment()
  const [filters, setFilters] = useLocalStorageState<StoredFlagFilters>(
    'flag-inventory-filters',
    defaultFilters,
  )

  const flags = useAsyncData(
    () =>
      mine
        ? listMyFlags(user.id, environment)
        : listFlags({
            search: filters.search,
            environment,
            enabled: filters.state === 'all' ? undefined : filters.state === 'enabled',
            ownerTeam: filters.ownerTeam === 'all' ? undefined : filters.ownerTeam,
            lifecycle:
              filters.lifecycle === 'all' ? undefined : (filters.lifecycle as FlagLifecycle),
            staleOnly: filters.staleOnly,
          }),
    [
      mine,
      user.id,
      environment,
      filters.search,
      filters.state,
      filters.ownerTeam,
      filters.lifecycle,
      filters.staleOnly,
    ],
  )

  const allFlags = useAsyncData(() => listFlags({ environment }), [environment])
  const rows = flags.data ?? []
  const ownerOptions = useMemo(() => {
    const teams = [...new Set((allFlags.data ?? []).map((flag) => flag.ownerTeam))].sort()
    return [
      { value: 'all', label: 'All owners' },
      ...teams.map((team) => ({ value: team, label: team })),
    ]
  }, [allFlags.data])

  const enabledCount = (allFlags.data ?? []).filter(
    (flag) => environmentConfig(flag, environment).enabled,
  ).length
  const partialCount = (allFlags.data ?? []).filter((flag) => {
    const config = environmentConfig(flag, environment)
    return config.enabled && config.rolloutPercentage < 100
  }).length
  const cleanupCount = (allFlags.data ?? []).filter((flag) => flag.lifecycle === 'cleanup').length

  const columns = useMemo<Column<FeatureFlag>[]>(
    () => [
      {
        id: 'flag',
        header: 'Flag',
        cell: (row) => (
          <div className="min-w-0">
            <span className="block truncate text-sm font-medium text-foreground">{row.name}</span>
            <span className="block truncate font-mono text-xs text-muted-foreground">
              {row.key}
            </span>
          </div>
        ),
      },
      {
        id: 'state',
        header: `${titleCase(environment)} state`,
        className: 'whitespace-nowrap',
        cell: (row) => <FlagStateCell config={environmentConfig(row, environment)} />,
      },
      {
        id: 'focus',
        header: 'Operational focus',
        className: 'max-w-[260px]',
        cell: (row) => {
          const signal = selectPrimarySignal(row.signals)
          return signal ? (
            <div className="min-w-0">
              <span className="block truncate text-sm text-foreground">
                {flagFocusLabel(signal.type)}
              </span>
              <span className="block truncate text-xs text-muted-foreground">
                {signal.headline}
              </span>
            </div>
          ) : (
            <span className="text-xs text-muted-foreground">No signal raised</span>
          )
        },
      },
      {
        id: 'lifecycle',
        header: 'Lifecycle',
        hideBelow: 'lg',
        cell: (row) => (
          <Pill tone={row.lifecycle === 'cleanup' ? 'warning' : 'neutral'}>
            {titleCase(row.lifecycle)}
          </Pill>
        ),
      },
      {
        id: 'owner',
        header: 'Owner',
        hideBelow: 'xl',
        cell: (row) => <span className="text-sm text-muted-foreground">{row.ownerTeam}</span>,
      },
      {
        id: 'updated',
        header: 'Last updated',
        className: 'whitespace-nowrap',
        cell: (row) => (
          <span className="text-xs text-muted-foreground">{formatRelativeTime(row.updatedAt)}</span>
        ),
      },
    ],
    [environment],
  )

  const filtersActive = JSON.stringify(filters) !== JSON.stringify(defaultFilters)

  return (
    <>
      <PageHeader
        title={mine ? 'My flags' : 'Feature flags'}
        breadcrumbs={
          mine
            ? [{ label: 'Feature Flags', to: '/flags' }, { label: 'My flags' }]
            : [{ label: 'Feature Flags' }]
        }
        description={
          mine
            ? `Flags owned by ${user.name} or carrying a personal override for them in ${environment}.`
            : 'Flags described by developer usage, blast radius, and effective behaviour rather than a single on/off record.'
        }
        actions={
          <>
            <EnvironmentSelect value={environment} onChange={setEnvironment} />
            {mine ? (
              <Button variant="outline" size="sm" onClick={() => navigate('/flags')}>
                All flags
              </Button>
            ) : (
              <Button variant="outline" size="sm" onClick={() => navigate('/flags/my-flags')}>
                <Star className="mr-1.5 h-3.5 w-3.5" />
                My flags
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={() => navigate('/flags/debugger')}>
              <Bug className="mr-1.5 h-3.5 w-3.5" />
              Debugger
            </Button>
          </>
        }
      />
      <PageBody>
        <MetricRow>
          <MetricCard label="Flags" value={allFlags.data?.length ?? '--'} hint="Across all lifecycles" />
          <MetricCard
            label={`Enabled in ${environment}`}
            value={enabledCount}
            hint="Select to filter"
            onClick={() => setFilters((current) => ({ ...current, state: 'enabled' }))}
          />
          <MetricCard
            label="Partial rollout"
            value={partialCount}
            hint="Enabled below 100%"
          />
          <MetricCard
            label="Awaiting cleanup"
            value={cleanupCount}
            tone={cleanupCount > 0 ? 'warning' : 'default'}
            hint="Select to filter"
            onClick={() => setFilters((current) => ({ ...current, lifecycle: 'cleanup' }))}
          />
        </MetricRow>

        <Panel
          title={mine ? 'Owned and overridden flags' : 'Flag inventory'}
          description={`Enabled state and rollout shown for ${environment}.`}
          bodyClassName="p-0"
        >
          {mine ? null : (
            <FilterBar
              search={{
                value: filters.search,
                onChange: (search) => setFilters((current) => ({ ...current, search })),
                placeholder: 'Search flag name or key',
              }}
              trailing={
                <>
                  <label className="flex cursor-pointer items-center gap-1.5 text-xs text-muted-foreground">
                    <input
                      type="checkbox"
                      checked={filters.staleOnly}
                      onChange={(event) =>
                        setFilters((current) => ({ ...current, staleOnly: event.target.checked }))
                      }
                      className="h-3.5 w-3.5 rounded border-input accent-navy-700"
                    />
                    Stale flags only
                  </label>
                  {filtersActive ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 text-xs"
                      onClick={() => setFilters(defaultFilters)}
                    >
                      <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                      Clear filters
                    </Button>
                  ) : null}
                </>
              }
            >
              <FilterSelect
                label="State"
                value={filters.state}
                onChange={(state) => setFilters((current) => ({ ...current, state }))}
                options={stateOptions}
                triggerClassName="w-[140px]"
              />
              <FilterSelect
                label="Lifecycle"
                value={filters.lifecycle}
                onChange={(lifecycle) => setFilters((current) => ({ ...current, lifecycle }))}
                options={lifecycleOptions}
                triggerClassName="w-[160px]"
              />
              <FilterSelect
                label="Owner"
                value={filters.ownerTeam}
                onChange={(ownerTeam) => setFilters((current) => ({ ...current, ownerTeam }))}
                options={ownerOptions}
                triggerClassName="w-[190px]"
              />
            </FilterBar>
          )}
          <DataTable
            columns={columns}
            rows={rows}
            rowKey={(row) => row.key}
            loading={flags.loading}
            onRowClick={(row) => navigate(`/flags/${row.key}`)}
            rowAccent={(row) => (row.lifecycle === 'rollback' ? 'critical' : null)}
            empty={{
              title: mine ? 'No flags assigned to you' : 'No flags match these filters',
              description: mine
                ? 'Flags you own, or that carry a personal override for you, appear here.'
                : 'Clear the search, state, lifecycle, owner, or stale filter to see every flag.',
            }}
          />
        </Panel>
      </PageBody>
    </>
  )
}
