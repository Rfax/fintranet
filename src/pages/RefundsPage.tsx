import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import { RiskBadge, StatusBadge } from '@/components/shared/Badges'
import { DataTable, type Column } from '@/components/shared/DataTable'
import { FilterBar, FilterSelect } from '@/components/shared/FilterBar'
import { MetricCard, MetricRow } from '@/components/shared/MetricCard'
import { PageBody, PageHeader } from '@/components/shared/PageHeader'
import { Panel } from '@/components/shared/Panel'
import { ScaffoldNotice } from '@/components/shared/ScaffoldNotice'
import { RefundFocusCell } from '@/components/refunds/RefundFocusCell'
import { useAsyncData } from '@/hooks/useAsyncData'
import { selectPrimarySignal } from '@/logic/focus'
import { formatMoney, formatPercent, formatRelativeTime, titleCase } from '@/logic/format'
import { getRefundMetrics, isHighValue, listRefunds } from '@/services/refundService'
import type { RefundRequest, RefundStatus } from '@/types'

const statusOptions = [
  { value: 'all', label: 'All statuses' },
  { value: 'pending_review', label: 'Pending review' },
  { value: 'awaiting_second_approval', label: 'Awaiting 2nd approval' },
  { value: 'completed', label: 'Completed' },
  { value: 'failed', label: 'Failed' },
]

export function RefundsPage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')
  const [highValueOnly, setHighValueOnly] = useState(false)

  const metrics = useAsyncData(() => getRefundMetrics(), [])
  const queue = useAsyncData(
    () =>
      listRefunds({
        search,
        status: status === 'all' ? undefined : [status as RefundStatus],
        highValueOnly,
      }),
    [search, status, highValueOnly],
  )

  const columns = useMemo<Column<RefundRequest>[]>(
    () => [
      { id: 'id', header: 'Refund', className: 'font-mono text-xs', cell: (row) => row.id },
      {
        id: 'customer',
        header: 'Customer',
        cell: (row) => <span className="block truncate font-medium">{row.customerName}</span>,
      },
      {
        id: 'amount',
        header: 'Amount',
        className: 'tabular-nums',
        cell: (row) => (
          <span className={isHighValue(row.amount) ? 'font-semibold text-foreground' : 'text-foreground'}>
            {formatMoney(row.amount)}
          </span>
        ),
      },
      {
        id: 'reason',
        header: 'Reason',
        hideBelow: 'lg',
        cell: (row) => <span className="text-sm text-muted-foreground">{titleCase(row.reason)}</span>,
      },
      {
        id: 'focus',
        header: 'Review focus',
        className: 'max-w-[280px]',
        cell: (row) => <RefundFocusCell signal={selectPrimarySignal(row.signals)} />,
      },
      { id: 'risk', header: 'Risk', hideBelow: 'xl', cell: (row) => <RiskBadge level={row.risk} /> },
      { id: 'status', header: 'Status', cell: (row) => <StatusBadge status={row.status} /> },
      {
        id: 'requested',
        header: 'Requested',
        cell: (row) => (
          <span className="text-xs text-muted-foreground">{formatRelativeTime(row.requestedAt)}</span>
        ),
      },
    ],
    [],
  )

  return (
    <>
      <PageHeader
        title="Refund operations"
        breadcrumbs={[{ label: 'Refunds' }]}
        description="Queue of synthetic refund requests with the operational issue that should drive each decision."
      />
      <PageBody>
        <MetricRow>
          <MetricCard
            label="Requests today"
            value={metrics.data?.requestsToday ?? '--'}
            hint={metrics.data ? `${formatMoney(metrics.data.requestedAmountToday, { compact: true })} requested` : undefined}
          />
          <MetricCard label="Pending review" value={metrics.data?.pendingReview ?? '--'} hint="Awaiting an operator" />
          <MetricCard
            label="Avg. processing"
            value={metrics.data ? `${metrics.data.averageProcessingHours}h` : '--'}
            hint="Request to settlement"
          />
          <MetricCard
            label="Failure rate"
            value={metrics.data ? formatPercent(metrics.data.failureRatePct, 1) : '--'}
            tone={metrics.data && metrics.data.failureRatePct > 10 ? 'warning' : 'default'}
            hint="Processor failures in the sample"
          />
        </MetricRow>

        <Panel
          title="Refund queue"
          description="Approval is not the same as processor completion; both states appear here."
          bodyClassName="p-0"
        >
          <FilterBar
            search={{ value: search, onChange: setSearch, placeholder: 'Search refund, payment, or customer' }}
            trailing={
              <label className="flex cursor-pointer items-center gap-1.5 text-xs text-muted-foreground">
                <input
                  type="checkbox"
                  checked={highValueOnly}
                  onChange={(event) => setHighValueOnly(event.target.checked)}
                  className="h-3.5 w-3.5 rounded border-input"
                />
                High value only ($2,500+)
              </label>
            }
          >
            <FilterSelect label="Status" value={status} onChange={setStatus} options={statusOptions} />
          </FilterBar>
          <DataTable
            columns={columns}
            rows={queue.data ?? []}
            rowKey={(row) => row.id}
            loading={queue.loading}
            onRowClick={(row) => navigate(`/refunds/${row.id}`)}
            rowAccent={(row) =>
              row.risk === 'critical' ? 'critical' : row.status === 'failed' ? 'warning' : null
            }
            empty={{
              title: 'No refunds match these filters',
              description: 'Clear the search, status, or high-value filter to see the full synthetic queue.',
            }}
          />
        </Panel>

        <ScaffoldNotice
          planned={[
            'Seven-day refund volume chart and reason breakdown',
            'Filters for reason, amount band, and risk with saved filter state',
            'Approve, reject, escalate, and note actions with required reasons and confirmation',
            'Simulated dual approval for high-value refunds, blocking the same user twice',
            'Retry handling for processor failures, with completed refunds read-only',
          ]}
          available={[
            'Refund metrics and queue served through the async service layer',
            'Review-focus column derived from the ranked operational signals',
            'High-value shortcut and status filtering',
          ]}
        />
      </PageBody>
    </>
  )
}
