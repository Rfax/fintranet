import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import { RiskBadge, SlaBadge, StatusBadge } from '@/components/shared/Badges'
import { DataTable, type Column } from '@/components/shared/DataTable'
import { FilterBar, FilterSelect } from '@/components/shared/FilterBar'
import { MetricCard, MetricRow } from '@/components/shared/MetricCard'
import { PageBody, PageHeader } from '@/components/shared/PageHeader'
import { Panel } from '@/components/shared/Panel'
import { ScaffoldNotice } from '@/components/shared/ScaffoldNotice'
import { ReviewFocusCell } from '@/components/kyc/ReviewFocusCell'
import { findUser } from '@/data/users'
import { useAsyncData } from '@/hooks/useAsyncData'
import { selectPrimarySignal } from '@/logic/focus'
import { formatDuration, formatRelativeTime, slaState } from '@/logic/format'
import { getKycWorkloadMetrics, listKycCases } from '@/services/kycService'
import type { KycCase, KycCaseStatus } from '@/types'

const statusOptions = [
  { value: 'all', label: 'All statuses' },
  { value: 'awaiting_review', label: 'Awaiting review' },
  { value: 'in_review', label: 'In review' },
  { value: 'info_requested', label: 'Info requested' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
]

export function KycOverviewPage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')

  const metrics = useAsyncData(() => getKycWorkloadMetrics(), [])
  const queue = useAsyncData(
    () =>
      listKycCases({
        search,
        status: status === 'all' ? undefined : [status as KycCaseStatus],
        sort: 'sla',
      }),
    [search, status],
  )

  const columns = useMemo<Column<KycCase>[]>(
    () => [
      {
        id: 'id',
        header: 'Case',
        className: 'font-mono text-xs',
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

  const backlog = metrics.data?.backlogByRisk
  const reviewDelta = metrics.data
    ? metrics.data.averageReviewMinutes - metrics.data.previousAverageReviewMinutes
    : 0

  return (
    <>
      <PageHeader
        title="KYC review workload"
        breadcrumbs={[{ label: 'KYC Review' }]}
        description="Operation-wide view of the review queue: what is left, what is late, and whether reviews are keeping pace with intake."
      />
      <PageBody>
        <MetricRow>
          <MetricCard
            label="Open cases"
            value={metrics.data?.openCases ?? '--'}
            hint={
              backlog
                ? `${backlog.critical} critical / ${backlog.high} high`
                : 'Backlog by risk level'
            }
          />
          <MetricCard
            label="Overdue"
            value={metrics.data?.overdue ?? '--'}
            tone={metrics.data && metrics.data.overdue > 0 ? 'critical' : 'default'}
            hint="Past the review SLA"
          />
          <MetricCard
            label="Received today"
            value={metrics.data?.receivedToday ?? '--'}
            hint={`${metrics.data?.completedToday ?? '--'} completed`}
          />
          <MetricCard
            label="Avg. review time"
            value={metrics.data ? `${metrics.data.averageReviewMinutes}m` : '--'}
            delta={
              metrics.data
                ? {
                    value: `${Math.abs(reviewDelta)}m vs. yesterday`,
                    direction: reviewDelta === 0 ? 'flat' : reviewDelta > 0 ? 'up' : 'down',
                    goodDirection: 'down',
                  }
                : undefined
            }
          />
        </MetricRow>

        <Panel
          title="Review queue"
          description="Sorted by nearest SLA breach. Selecting a row opens the adaptive case detail."
          bodyClassName="p-0"
        >
          <FilterBar
            search={{
              value: search,
              onChange: setSearch,
              placeholder: 'Search case ID or customer',
            }}
          >
            <FilterSelect label="Status" value={status} onChange={setStatus} options={statusOptions} />
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
              description: 'Clear the search or status filter to see the full synthetic queue.',
            }}
          />
        </Panel>

        <ScaffoldNotice
          planned={[
            'Review-time and received-versus-completed trend charts over the last 14 days',
            'Backlog split by age and SLA band, with estimated time to clear the queue',
            'Sorting by oldest, newest, highest risk, and nearest SLA breach',
            '"Assigned to me" shortcut and persistent reviewer filters',
            'Clicking a metric or chart segment applies that filter to the queue',
          ]}
          available={[
            'Workload metrics and queue served through the async service layer',
            'Review-focus column derived from the ranked risk signals',
            'Overdue and high-risk rows escalated with an accent, icon, and label',
          ]}
        />
      </PageBody>
    </>
  )
}
