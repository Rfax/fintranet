import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import { Pill } from '@/components/shared/Badges'
import { DataTable, type Column } from '@/components/shared/DataTable'
import { FilterBar, FilterSelect } from '@/components/shared/FilterBar'
import { PageBody, PageHeader } from '@/components/shared/PageHeader'
import { Panel } from '@/components/shared/Panel'
import { ScaffoldNotice } from '@/components/shared/ScaffoldNotice'
import { EnvironmentWarning } from '@/components/shared/EnvironmentWarning'
import { FlagStateCell } from '@/components/flags/FlagStateCell'
import { useAsyncData } from '@/hooks/useAsyncData'
import { useSession } from '@/hooks/useSession'
import { flagFocusLabel, selectPrimarySignal } from '@/logic/focus'
import { formatRelativeTime, titleCase } from '@/logic/format'
import { environmentConfig, listFlags } from '@/services/flagService'
import type { FeatureFlag } from '@/types'

const lifecycleOptions = [
  { value: 'all', label: 'All lifecycles' },
  { value: 'development', label: 'Development' },
  { value: 'rollout', label: 'Rollout' },
  { value: 'permanent', label: 'Permanent' },
  { value: 'rollback', label: 'Rollback' },
  { value: 'cleanup', label: 'Cleanup' },
]

export function FlagsPage() {
  const navigate = useNavigate()
  const { environment } = useSession()
  const [search, setSearch] = useState('')
  const [lifecycle, setLifecycle] = useState('all')
  const [staleOnly, setStaleOnly] = useState(false)

  const flags = useAsyncData(() => listFlags({ search, staleOnly }), [search, staleOnly])
  const rows = (flags.data ?? []).filter(
    (flag) => lifecycle === 'all' || flag.lifecycle === lifecycle,
  )

  const columns = useMemo<Column<FeatureFlag>[]>(
    () => [
      {
        id: 'flag',
        header: 'Flag',
        cell: (row) => (
          <div className="min-w-0">
            <span className="block truncate text-sm font-medium text-foreground">{row.name}</span>
            <span className="block truncate font-mono text-xs text-muted-foreground">{row.key}</span>
          </div>
        ),
      },
      {
        id: 'state',
        header: `${titleCase(environment)} state`,
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
              <span className="block truncate text-sm text-foreground">{flagFocusLabel(signal.type)}</span>
              <span className="block truncate text-xs text-muted-foreground">{signal.headline}</span>
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
        cell: (row) => <Pill tone={row.lifecycle === 'cleanup' ? 'warning' : 'neutral'}>{titleCase(row.lifecycle)}</Pill>,
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
        cell: (row) => <span className="text-xs text-muted-foreground">{formatRelativeTime(row.updatedAt)}</span>,
      },
    ],
    [environment],
  )

  return (
    <>
      <PageHeader
        title="Feature flags"
        breadcrumbs={[{ label: 'Feature Flags' }]}
        description="Flags described by developer usage, blast radius, and effective behaviour rather than a single on/off record."
      />
      <PageBody>
        <EnvironmentWarning environment={environment} />

        <Panel
          title="Flag inventory"
          description={`Enabled state and rollout shown for the simulated ${environment} environment.`}
          bodyClassName="p-0"
        >
          <FilterBar
            search={{ value: search, onChange: setSearch, placeholder: 'Search flag name or key' }}
            trailing={
              <label className="flex cursor-pointer items-center gap-1.5 text-xs text-muted-foreground">
                <input
                  type="checkbox"
                  checked={staleOnly}
                  onChange={(event) => setStaleOnly(event.target.checked)}
                  className="h-3.5 w-3.5 rounded border-input"
                />
                Stale flags only
              </label>
            }
          >
            <FilterSelect
              label="Lifecycle"
              value={lifecycle}
              onChange={setLifecycle}
              options={lifecycleOptions}
            />
          </FilterBar>
          <DataTable
            columns={columns}
            rows={rows}
            rowKey={(row) => row.key}
            loading={flags.loading}
            onRowClick={(row) => navigate(`/flags/${row.key}`)}
            empty={{
              title: 'No flags match these filters',
              description: 'Clear the search, lifecycle, or stale filter to see every synthetic flag.',
            }}
          />
        </Panel>

        <ScaffoldNotice
          planned={[
            'Owner and health filters, plus grouping by service or repository',
            'Enable, disable, and rollout changes with a required reason, before/after diff, and confirmation',
            'Production changes gated behind the simulated admin role and a typed confirmation',
            '"My flags" view with safe personal overrides for the mock signed-in user',
            'Audience preview showing how many users a proposed change would affect',
          ]}
          available={[
            'Flag inventory with per-environment enabled state and rollout share',
            'Operational-focus column derived from the ranked flag signals',
            'Stale-flag and lifecycle shortcuts served by the async service layer',
          ]}
        />
      </PageBody>
    </>
  )
}
