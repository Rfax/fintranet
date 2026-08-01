import { useParams } from 'react-router'
import { AlertTriangle, ArrowLeftRight, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { RiskBadge, StatusBadge } from '@/components/shared/Badges'
import { EmptyState } from '@/components/shared/EmptyState'
import { PageBody, PageHeader } from '@/components/shared/PageHeader'
import { DetailList, Panel } from '@/components/shared/Panel'
import { ScaffoldNotice } from '@/components/shared/ScaffoldNotice'
import { useAsyncData } from '@/hooks/useAsyncData'
import { explainFocusSelection, rankSignals, refundFocusLabel } from '@/logic/focus'
import { formatDate, formatMoney, formatPercent, formatRelativeTime, titleCase } from '@/logic/format'
import { getRefund } from '@/services/refundService'

export function RefundDetailPage() {
  const { refundId = '' } = useParams()
  const { data: refund, loading, error } = useAsyncData(() => getRefund(refundId), [refundId])

  if (loading) {
    return (
      <PageBody>
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-64 w-full" />
      </PageBody>
    )
  }

  if (error || !refund) {
    return (
      <PageBody>
        <Panel>
          <EmptyState
            icon={AlertTriangle}
            title="Refund not found"
            description={error?.message ?? `No synthetic refund matches ${refundId}.`}
          />
        </Panel>
      </PageBody>
    )
  }

  const primary = rankSignals(refund.signals)[0]
  const customerIsUnusual =
    refund.customerContext.refundRatePct > refund.customerContext.cohortRefundRatePct * 2
  const itemIsUnusual =
    refund.itemContext.refundRatePct > refund.itemContext.baselineRefundRatePct * 2

  return (
    <>
      <PageHeader
        title={`${formatMoney(refund.amount)} refund`}
        breadcrumbs={[{ label: 'Refunds', to: '/refunds' }, { label: refund.id }]}
        meta={
          <>
            <span className="font-mono text-xs text-muted-foreground">{refund.id}</span>
            <RiskBadge level={refund.risk} />
            <StatusBadge status={refund.status} />
          </>
        }
        description={`${refund.customerName} · ${titleCase(refund.reason)} · requested ${formatRelativeTime(refund.requestedAt)}`}
        actions={
          <>
            <Button variant="outline" size="sm" disabled>
              Escalate
            </Button>
            <Button variant="outline" size="sm" disabled>
              Reject
            </Button>
            <Button size="sm" disabled>
              Approve
            </Button>
          </>
        }
      />
      <PageBody>
        {primary ? (
          <Panel
            emphasis="primary"
            title={
              <span className="flex flex-wrap items-center gap-2">
                <span className="text-label">Operational focus</span>
                <span className="text-base font-semibold text-foreground">
                  {refundFocusLabel(primary.type)}
                </span>
              </span>
            }
            description={primary.headline}
            footer={`Why this is first: ${explainFocusSelection(refund.signals)} Source: ${primary.source}.`}
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

        <div className="grid gap-4 lg:grid-cols-2">
          <Panel
            emphasis={customerIsUnusual ? 'primary' : 'default'}
            title={
              <span className="flex items-center gap-2 text-sm font-semibold">
                <User className="h-4 w-4 text-navy-600" aria-hidden />
                Customer behaviour
              </span>
            }
            description={refund.customerContext.summary}
          >
            <DetailList
              columns={2}
              items={[
                { label: 'Account age', value: `${refund.customerContext.accountAgeDays} days` },
                { label: 'Prior refunds', value: `${refund.customerContext.priorRefundCount}` },
                {
                  label: 'Refund rate',
                  value: formatPercent(refund.customerContext.refundRatePct, 1),
                  emphasis: customerIsUnusual,
                },
                { label: 'Cohort rate', value: formatPercent(refund.customerContext.cohortRefundRatePct, 1) },
                {
                  label: 'Days since last refund',
                  value: refund.customerContext.daysSinceLastRefund ?? 'No prior refund',
                },
                { label: 'Prior disputes', value: `${refund.customerContext.priorDisputes}` },
              ]}
            />
          </Panel>

          <Panel
            emphasis={itemIsUnusual ? 'primary' : 'default'}
            title={
              <span className="flex items-center gap-2 text-sm font-semibold">
                <ArrowLeftRight className="h-4 w-4 text-navy-600" aria-hidden />
                {titleCase(refund.itemContext.scope)} behaviour
              </span>
            }
            description={refund.itemContext.summary}
          >
            <DetailList
              columns={2}
              items={[
                { label: 'Scope', value: refund.itemContext.scopeLabel },
                { label: 'Requests (30d)', value: `${refund.itemContext.requestsLast30Days}` },
                {
                  label: 'Refund rate',
                  value: formatPercent(refund.itemContext.refundRatePct, 1),
                  emphasis: itemIsUnusual,
                },
                { label: 'Baseline', value: formatPercent(refund.itemContext.baselineRefundRatePct, 1) },
                {
                  label: 'Change vs. prior period',
                  value: `${refund.itemContext.changeVsPriorPeriodPct > 0 ? '+' : ''}${refund.itemContext.changeVsPriorPeriodPct}%`,
                },
                {
                  label: 'Common reasons',
                  value: refund.itemContext.commonReasons.map(titleCase).join(', ') || 'None recorded',
                },
              ]}
            />
          </Panel>
        </div>

        <Panel title="Original payment" description="Approval is recorded separately from processor completion.">
          <DetailList
            columns={3}
            items={[
              { label: 'Payment ID', value: refund.payment.paymentId },
              { label: 'Captured', value: formatDate(refund.payment.capturedAt) },
              { label: 'Amount', value: formatMoney(refund.payment.amount) },
              { label: 'Method', value: `${titleCase(refund.payment.method)}${refund.payment.cardLast4 ? ` ····${refund.payment.cardLast4}` : ''}` },
              { label: 'Merchant', value: refund.payment.merchant },
              { label: 'Item', value: `${refund.payment.itemName} (${refund.payment.itemCategory})` },
            ]}
          />
        </Panel>

        <ScaffoldNotice
          planned={[
            'Type-specific focus panels for high value, duplicates, fraud signals, and processor failures',
            'Approve, reject, escalate, and note actions with confirmation and activity events',
            'Dual approval for high-value refunds that blocks the same approver twice',
            'Related refund attempts and retry state for failed processor transfers',
            'Explicit comparison-group and time-period labelling on every behavioural metric',
          ]}
          available={[
            'Customer-level and item-level comparison frames, emphasised when either looks unusual',
            'Deterministic focus selection shared with the KYC and flag modules',
          ]}
        />
      </PageBody>
    </>
  )
}
