import { useMemo } from 'react'
import { useNavigate } from 'react-router'
import { RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { RiskBadge, StatusBadge } from '@/components/shared/Badges'
import { DataTable, type Column } from '@/components/shared/DataTable'
import { FilterBar, FilterSelect } from '@/components/shared/FilterBar'
import { MetricCard, MetricRow } from '@/components/shared/MetricCard'
import { PageBody, PageHeader } from '@/components/shared/PageHeader'
import { Panel } from '@/components/shared/Panel'
import { ReasonBreakdown, VolumeChart } from '@/components/refunds/RefundCharts'
import { RefundFocusCell } from '@/components/refunds/RefundFocusCell'
import { useAsyncData } from '@/hooks/useAsyncData'
import { useLocalStorageState } from '@/hooks/useLocalStorageState'
import { selectPrimarySignal } from '@/logic/focus'
import { formatMoney, formatPercent, formatRelativeTime, titleCase } from '@/logic/format'
import { getRefundMetrics, isHighValue, listRefunds } from '@/services/refundService'
import type {
  RefundAmountBand,
  RefundReason,
  RefundRequest,
  RefundStatus,
  RiskLevel,
} from '@/types'

const statusOptions = [
  { value: 'all', label: 'All statuses' },
  { value: 'pending_review', label: 'Pending review' },
  { value: 'awaiting_second_approval', label: 'Awaiting 2nd approval' },
  { value: 'escalated', label: 'Escalated' },
  { value: 'processing', label: 'Processing' },
  { value: 'completed', label: 'Completed' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'failed', label: 'Failed' },
]

const reasonOptions = [
  { value: 'all', label: 'All reasons' },
  { value: 'item_not_received', label: 'Item not received' },
  { value: 'item_not_as_described', label: 'Not as described' },
  { value: 'duplicate_charge', label: 'Duplicate charge' },
  { value: 'subscription_cancelled', label: 'Subscription cancelled' },
  { value: 'fraudulent_charge', label: 'Fraudulent charge' },
  { value: 'service_issue', label: 'Service issue' },
]

const amountOptions = [
  { value: 'all', label: 'Any amount' },
  { value: 'under_100', label: 'Under $100' },
  { value: '100_to_1000', label: '$100 – $1,000' },
  { value: '1000_to_2500', label: '$1,000 – $2,500' },
  { value: 'over_2500', label: 'Over $2,500' },
]

const riskOptions = [
  { value: 'all', label: 'All risk' },
  { value: 'critical', label: 'Critical' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
]

interface StoredRefundFilters {
  search: string
  status: string
  reason: string
  amountBand: string
  risk: string
  highValueOnly: boolean
}

const defaultFilters: StoredRefundFilters = {
  search: '',
  status: 'all',
  reason: 'all',
  amountBand: 'all',
  risk: 'all',
  highValueOnly: false,
}

export function RefundsPage() {
  const navigate = useNavigate()
  const [filters, setFilters] = useLocalStorageState<StoredRefundFilters>(
    'refund-queue-filters',
    defaultFilters,
  )

  const metrics = useAsyncData(() => getRefundMetrics(), [])
  const queue = useAsyncData(
    () =>
      listRefunds({
        search: filters.search,
        status: filters.status === 'all' ? undefined : [filters.status as RefundStatus],
        reason: filters.reason === 'all' ? undefined : [filters.reason as RefundReason],
        risk: filters.risk === 'all' ? undefined : [filters.risk as RiskLevel],
        amountBand:
          filters.amountBand === 'all' ? undefined : (filters.amountBand as RefundAmountBand),
        highValueOnly: filters.highValueOnly,
      }),
    [
      filters.search,
      filters.status,
      filters.reason,
      filters.risk,
      filters.amountBand,
      filters.highValueOnly,
    ],
  )

  const columns = useMemo<Column<RefundRequest>[]>(
    () => [
      {
        id: 'id',
        header: 'Refund',
        className: 'whitespace-nowrap font-mono text-xs',
        cell: (row) => row.id,
      },
      {
        id: 'customer',
        header: 'Customer',
        cell: (row) => <span className="block truncate font-medium">{row.customerName}</span>,
      },
      {
        id: 'amount',
        header: 'Amount',
        className: 'whitespace-nowrap tabular-nums',
        cell: (row) => (
          <span
            className={
              isHighValue(row.amount) ? 'font-semibold text-foreground' : 'text-foreground'
            }
          >
            {formatMoney(row.amount)}
          </span>
        ),
      },
      {
        id: 'reason',
        header: 'Reason',
        hideBelow: 'lg',
        cell: (row) => (
          <span className="text-sm text-muted-foreground">{titleCase(row.reason)}</span>
        ),
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
        className: 'whitespace-nowrap',
        cell: (row) => (
          <span className="text-xs text-muted-foreground">
            {formatRelativeTime(row.requestedAt)}
          </span>
        ),
      },
    ],
    [],
  )

  const data = metrics.data
  const filtersActive = JSON.stringify(filters) !== JSON.stringify(defaultFilters)

  return (
    <>
      <PageHeader
        title="Refund operations"
        breadcrumbs={[{ label: 'Refunds' }]}
        description="Refund requests with the operational issue that should drive each decision. Approval and processor completion are tracked separately."
      />
      <PageBody>
        <MetricRow>
          <MetricCard
            label="Requests today"
            value={data?.requestsToday ?? '--'}
            hint={
              data
                ? `${formatMoney(data.requestedAmountToday, { compact: true })} requested`
                : undefined
            }
          />
          <MetricCard
            label="Pending review"
            value={data?.pendingReview ?? '--'}
            hint="Awaiting an operator. Select to filter."
            onClick={() =>
              setFilters((current) => ({ ...current, status: 'pending_review' }))
            }
          />
          <MetricCard
            label="Avg. processing"
            value={data ? `${data.averageProcessingHours}h` : '--'}
            hint="Request to settlement"
          />
          <MetricCard
            label="Failure rate"
            value={data ? formatPercent(data.failureRatePct, 1) : '--'}
            tone={data && data.failureRatePct > 10 ? 'warning' : 'default'}
            hint="Processor failures. Select to filter."
            onClick={() => setFilters((current) => ({ ...current, status: 'failed' }))}
          />
        </MetricRow>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
          <Panel title="Refund volume" description="Requests per day over the last 7 days">
            {data ? <VolumeChart trend={data.volumeTrend} /> : <div className="h-[170px]" />}
          </Panel>
          <Panel title="Reason breakdown" description="Select a reason to filter the queue">
            {data ? (
              <ReasonBreakdown
                breakdown={data.reasonBreakdown}
                activeReason={filters.reason}
                onSelect={(reason) => setFilters((current) => ({ ...current, reason }))}
              />
            ) : null}
          </Panel>
        </div>

        <Panel
          title="Refund queue"
          description="High-value and failed refunds are escalated in the list."
          bodyClassName="p-0"
        >
          <FilterBar
            search={{
              value: filters.search,
              onChange: (search) => setFilters((current) => ({ ...current, search })),
              placeholder: 'Search refund, payment, or customer',
            }}
            trailing={
              <>
                <label className="flex cursor-pointer items-center gap-1.5 text-xs text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={filters.highValueOnly}
                    onChange={(event) =>
                      setFilters((current) => ({
                        ...current,
                        highValueOnly: event.target.checked,
                      }))
                    }
                    className="h-3.5 w-3.5 rounded border-input accent-navy-700"
                  />
                  High value only ($2,500+)
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
              label="Status"
              value={filters.status}
              onChange={(status) => setFilters((current) => ({ ...current, status }))}
              options={statusOptions}
              triggerClassName="w-[180px]"
            />
            <FilterSelect
              label="Reason"
              value={filters.reason}
              onChange={(reason) => setFilters((current) => ({ ...current, reason }))}
              options={reasonOptions}
              triggerClassName="w-[180px]"
            />
            <FilterSelect
              label="Amount"
              value={filters.amountBand}
              onChange={(amountBand) => setFilters((current) => ({ ...current, amountBand }))}
              options={amountOptions}
              triggerClassName="w-[150px]"
            />
            <FilterSelect
              label="Risk"
              value={filters.risk}
              onChange={(risk) => setFilters((current) => ({ ...current, risk }))}
              options={riskOptions}
              triggerClassName="w-[130px]"
            />
          </FilterBar>
          <DataTable
            columns={columns}
            rows={queue.data ?? []}
            rowKey={(row) => row.id}
            loading={queue.loading}
            onRowClick={(row) => navigate(`/refunds/${row.id}`)}
            rowAccent={(row) =>
              row.status === 'failed' || row.risk === 'critical'
                ? 'critical'
                : isHighValue(row.amount)
                  ? 'warning'
                  : null
            }
            empty={{
              title: 'No refunds match these filters',
              description: 'Clear the filters to see the full refund queue.',
            }}
          />
        </Panel>
      </PageBody>
    </>
  )
}
