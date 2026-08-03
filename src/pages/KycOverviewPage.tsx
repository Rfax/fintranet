import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import { RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { RiskBadge, SlaBadge, StatusBadge } from '@/components/shared/Badges'
import { DataTable, type Column } from '@/components/shared/DataTable'
import { FilterBar, FilterSelect } from '@/components/shared/FilterBar'
import { MetricCard, MetricRow } from '@/components/shared/MetricCard'
import { PageBody, PageHeader } from '@/components/shared/PageHeader'
import { Panel } from '@/components/shared/Panel'
import {
  IntakeChart,
  ReviewTimeChart,
  SegmentBar,
  type Segment,
} from '@/components/kyc/WorkloadCharts'
import { riskSegmentClasses } from '@/components/kyc/risk-segments'
import { ReviewFocusCell } from '@/components/kyc/ReviewFocusCell'
import { appUsers, findUser } from '@/data/users'
import { useAsyncData } from '@/hooks/useAsyncData'
import {
  defaultKycFilters,
  toQueueFilters,
  useKycQueueFilters,
  type StoredKycFilters,
} from '@/hooks/useKycQueueFilters'
import { useSession } from '@/hooks/useSession'
import { selectPrimarySignal } from '@/logic/focus'
import { formatDuration, formatRelativeTime, slaState } from '@/logic/format'
import { getKycWorkloadMetrics, listKycCases } from '@/services/kycService'
import type { KycCase, RiskLevel } from '@/types'

const statusOptions = [
  { value: 'all', label: 'All statuses' },
  { value: 'awaiting_review', label: 'Awaiting review' },
  { value: 'in_review', label: 'In review' },
  { value: 'info_requested', label: 'Info requested' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
]

const riskOptions = [
  { value: 'all', label: 'All risk' },
  { value: 'critical', label: 'Critical' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
]

const sortOptions = [
  { value: 'sla', label: 'Nearest SLA breach' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'newest', label: 'Newest first' },
  { value: 'highest_risk', label: 'Highest risk' },
]

export function KycOverviewPage() {
  const navigate = useNavigate()
  const { user } = useSession()
  const [search, setSearch] = useState('')
  const [filters, setFilters] = useKycQueueFilters()

  const metrics = useAsyncData(() => getKycWorkloadMetrics(), [])
  const queue = useAsyncData(
    () => listKycCases({ search, ...toQueueFilters(filters) }),
    [search, filters.status, filters.risk, filters.assignee, filters.overdueOnly, filters.sort],
  )

  const assigneeOptions = useMemo(
    () => [
      { value: 'all', label: 'Anyone' },
      { value: 'me', label: 'Assigned to me' },
      ...appUsers
        .filter((entry) => entry.id !== user.id)
        .map((entry) => ({ value: entry.id, label: entry.name })),
    ],
    [user.id],
  )

  const columns = useMemo<Column<KycCase>[]>(
    () => [
      {
        id: 'id',
        header: 'Case',
        className: 'whitespace-nowrap font-mono text-xs',
        cell: (row) => row.id,
      },
      {
        id: 'customer',
        header: 'Customer',
        cell: (row) => (
          <span className="block truncate font-medium text-foreground">{row.customerName}</span>
        ),
      },
      {
        id: 'country',
        header: 'Country',
        hideBelow: 'lg',
        cell: (row) => <span className="text-sm text-muted-foreground">{row.country}</span>,
      },
      {
        id: 'risk',
        header: 'Risk',
        cell: (row) => <RiskBadge level={row.overallRisk} />,
      },
      {
        id: 'focus',
        header: 'Review focus',
        className: 'max-w-[280px]',
        cell: (row) => <ReviewFocusCell signal={selectPrimarySignal(row.riskSignals)} />,
      },
      {
        id: 'status',
        header: 'Status',
        cell: (row) => <StatusBadge status={row.status} />,
      },
      {
        id: 'assignee',
        header: 'Assignee',
        hideBelow: 'xl',
        cell: (row) => (
          <span className="text-sm text-muted-foreground">
            {findUser(row.assigneeId)?.name ?? 'Unassigned'}
          </span>
        ),
      },
      {
        id: 'sla',
        header: 'Age / SLA',
        className: 'whitespace-nowrap',
        cell: (row) => {
          const state = slaState(row.slaDueAt)
          return (
            <div className="flex flex-col gap-0.5">
              <span className="text-xs text-muted-foreground">
                {formatDuration(Date.now() - Date.parse(row.submittedAt))} old
              </span>
              <SlaBadge
                state={state}
                label={
                  state === 'breached'
                    ? `Overdue ${formatDuration(Date.now() - Date.parse(row.slaDueAt))}`
                    : `Due ${formatRelativeTime(row.slaDueAt)}`
                }
              />
            </div>
          )
        },
      },
    ],
    [],
  )

  const data = metrics.data
  const backlog = data?.backlogByRisk
  const reviewDelta = data ? data.averageReviewMinutes - data.previousAverageReviewMinutes : 0
  const oldest = data?.oldestUnreviewedSubmittedAt
  const filtersActive =
    search !== '' ||
    filters.status !== 'all' ||
    filters.risk !== 'all' ||
    filters.assignee !== 'all' ||
    filters.overdueOnly

  const riskSegments: Segment[] = (['critical', 'high', 'medium', 'low'] as RiskLevel[]).map(
    (level) => ({
      id: level,
      label: level === 'critical' ? 'Critical' : level === 'high' ? 'High' : level === 'medium' ? 'Medium' : 'Low',
      count: backlog?.[level] ?? 0,
      className: riskSegmentClasses[level],
      active: filters.risk === level,
    }),
  )

  const slaSegments: Segment[] = [
    {
      id: 'breached',
      label: 'Overdue',
      count: data?.backlogBySla.breached ?? 0,
      className: 'bg-rose-500',
      active: filters.overdueOnly,
    },
    {
      id: 'due_soon',
      label: 'Due within 8h',
      count: data?.backlogBySla.dueSoon ?? 0,
      className: 'bg-amber-400',
    },
    {
      id: 'on_track',
      label: 'On track',
      count: data?.backlogBySla.onTrack ?? 0,
      className: 'bg-emerald-500',
    },
  ]

  return (
    <>
      <PageHeader
        title="KYC review workload"
        breadcrumbs={[{ label: 'KYC Review' }]}
        description="Operation-wide view of the review queue: what is left, what is late, and whether reviews are keeping pace with intake."
        actions={
          <Button
            variant={filters.assignee === 'me' ? 'default' : 'outline'}
            size="sm"
            onClick={() =>
              setFilters((current) => ({
                ...current,
                assignee: current.assignee === 'me' ? 'all' : 'me',
              }))
            }
          >
            {filters.assignee === 'me' ? 'Showing my cases' : 'Assigned to me'}
          </Button>
        }
      />
      <PageBody>
        <MetricRow>
          <MetricCard
            label="Open cases"
            value={data?.openCases ?? '--'}
            hint={
              data?.estimatedDaysToClear
                ? `~${data.estimatedDaysToClear} days to clear at the current rate`
                : backlog
                  ? `${backlog.critical} critical / ${backlog.high} high`
                  : 'Backlog by risk level'
            }
            onClick={() => setFilters(defaultKycFilters)}
          />
          <MetricCard
            label="Overdue"
            value={data?.overdue ?? '--'}
            tone={data && data.overdue > 0 ? 'critical' : 'default'}
            hint="Past the review SLA. Select to filter."
            onClick={() => setFilters((current) => ({ ...current, overdueOnly: true, sort: 'sla' }))}
          />
          <MetricCard
            label="Received today"
            value={data?.receivedToday ?? '--'}
            hint={`${data?.completedToday ?? '--'} completed today`}
          />
          <MetricCard
            label="Avg. review time"
            value={data ? `${data.averageReviewMinutes}m` : '--'}
            delta={
              data
                ? {
                    value: `${Math.abs(reviewDelta)}m vs. yesterday`,
                    direction: reviewDelta === 0 ? 'flat' : reviewDelta > 0 ? 'up' : 'down',
                    goodDirection: 'down',
                  }
                : undefined
            }
            hint={
              oldest
                ? `Oldest unreviewed: ${formatDuration(Date.now() - Date.parse(oldest))}`
                : undefined
            }
          />
        </MetricRow>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <div className="grid gap-4 lg:grid-cols-2">
            <Panel title="Received vs. completed" description="Last 14 days">
              {data ? <IntakeChart trend={data.trend} /> : <div className="h-[180px]" />}
            </Panel>
            <Panel title="Average review time" description="Minutes per completed case">
              {data ? <ReviewTimeChart trend={data.trend} /> : <div className="h-[180px]" />}
            </Panel>
          </div>
          <Panel
            title="Backlog"
            description="Select a band to filter the queue below"
            bodyClassName="space-y-4 px-4 py-3"
          >
            <div className="space-y-2">
              <p className="text-label">By risk</p>
              <SegmentBar
                segments={riskSegments}
                emptyLabel="No open cases."
                onSelect={(id) =>
                  setFilters((current) => ({
                    ...current,
                    risk: current.risk === id ? 'all' : id,
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <p className="text-label">By SLA</p>
              <SegmentBar
                segments={slaSegments}
                emptyLabel="No open cases."
                onSelect={(id) =>
                  setFilters((current) => ({
                    ...current,
                    overdueOnly: id === 'breached' ? !current.overdueOnly : false,
                    sort: 'sla',
                  }))
                }
              />
            </div>
          </Panel>
        </div>

        <Panel
          title="Review queue"
          description="Selecting a row opens the adaptive case detail."
          bodyClassName="p-0"
        >
          <FilterBar
            search={{
              value: search,
              onChange: setSearch,
              placeholder: 'Search case ID or customer',
            }}
            trailing={
              filtersActive ? (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 text-xs"
                  onClick={() => {
                    setSearch('')
                    setFilters(defaultKycFilters)
                  }}
                >
                  <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                  Clear filters
                </Button>
              ) : null
            }
          >
            <FilterSelect
              label="Status"
              value={filters.status}
              onChange={(value) => setFilters((current) => ({ ...current, status: value }))}
              options={statusOptions}
            />
            <FilterSelect
              label="Risk"
              value={filters.risk}
              onChange={(value) => setFilters((current) => ({ ...current, risk: value }))}
              options={riskOptions}
              triggerClassName="w-[130px]"
            />
            <FilterSelect
              label="Assignee"
              value={filters.assignee}
              onChange={(value) => setFilters((current) => ({ ...current, assignee: value }))}
              options={assigneeOptions}
              triggerClassName="w-[170px]"
            />
            <FilterSelect
              label="Sort"
              value={filters.sort}
              onChange={(value) =>
                setFilters((current) => ({
                  ...current,
                  sort: value as StoredKycFilters['sort'],
                }))
              }
              options={sortOptions}
              triggerClassName="w-[180px]"
            />
            <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <input
                type="checkbox"
                className="h-3.5 w-3.5 rounded border-input accent-navy-700"
                checked={filters.overdueOnly}
                onChange={(event) =>
                  setFilters((current) => ({ ...current, overdueOnly: event.target.checked }))
                }
              />
              Overdue only
            </label>
          </FilterBar>
          <DataTable
            columns={columns}
            rows={queue.data ?? []}
            rowKey={(row) => row.id}
            loading={queue.loading}
            onRowClick={(row) => navigate(`/kyc/${row.id}`)}
            rowAccent={(row) =>
              slaState(row.slaDueAt) === 'breached'
                ? 'critical'
                : row.overallRisk === 'critical' || row.overallRisk === 'high'
                  ? 'warning'
                  : null
            }
            empty={{
              title: 'No cases match these filters',
              description: 'Clear the search or filters to see the full queue.',
            }}
          />
        </Panel>
      </PageBody>
    </>
  )
}
