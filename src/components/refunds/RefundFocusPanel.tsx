import { AlertOctagon, Banknote, Copy, ShieldAlert, Sparkles } from 'lucide-react'
import { Link } from 'react-router'
import { cn } from '@/lib/utils'
import { Pill, StatusBadge } from '@/components/shared/Badges'
import { DetailList, Panel } from '@/components/shared/Panel'
import { formatDate, formatMoney, formatRelativeTime, titleCase } from '@/logic/format'
import { highValueThreshold, remainingApprovals } from '@/services/refundService'
import type { RefundRequest, RefundSignal, RefundSignalType } from '@/types'

const panelIcon: Record<RefundSignalType, typeof Banknote> = {
  high_value: Banknote,
  possible_duplicate: Copy,
  elevated_fraud_signal: ShieldAlert,
  processor_failure: AlertOctagon,
  standard_request: Sparkles,
}

const panelTitle: Record<RefundSignalType, string> = {
  high_value: 'High-value approval',
  possible_duplicate: 'Possible duplicate refund',
  elevated_fraud_signal: 'Fraud risk evidence',
  processor_failure: 'Processor failure',
  standard_request: 'Standard refund review',
}

interface RefundFocusPanelProps {
  refund: RefundRequest
  signal: RefundSignal | null
  related: RefundRequest[]
}

/** The evidence that matters for this refund's leading operational issue. */
export function RefundFocusPanel({ refund, signal, related }: RefundFocusPanelProps) {
  const type: RefundSignalType = signal?.type ?? 'standard_request'
  const Icon = panelIcon[type]

  const header = (
    <span className="flex items-center gap-2">
      <Icon className="h-4 w-4 text-navy-700" aria-hidden />
      <span className="text-base font-semibold text-foreground">{panelTitle[type]}</span>
    </span>
  )

  const description = signal?.headline ?? 'Nothing unusual about this request.'

  if (type === 'high_value') {
    const approved = refund.approvals.filter((entry) => entry.decision === 'approved')
    const remaining = remainingApprovals(refund)
    return (
      <Panel
        emphasis="primary"
        title={header}
        description={description}
        actions={
          <Pill tone={remaining > 0 ? 'warning' : 'positive'}>
            {approved.length} of {refund.requiredApprovals} approvals
          </Pill>
        }
        bodyClassName="space-y-3 px-4 py-3"
      >
        <DetailList
          columns={3}
          items={[
            { label: 'Refund amount', value: formatMoney(refund.amount), emphasis: true },
            { label: 'Approval threshold', value: formatMoney(highValueThreshold()) },
            {
              label: 'Approvals remaining',
              value: remaining === 0 ? 'None — fully approved' : `${remaining}`,
              emphasis: remaining > 0,
            },
          ]}
        />
        <div>
          <p className="text-label">Approval chain</p>
          {approved.length === 0 ? (
            <p className="mt-1 text-sm text-muted-foreground">
              No approvals recorded yet. Two different operators must approve before the transfer is
              released.
            </p>
          ) : (
            <ul className="mt-1.5 space-y-1">
              {approved.map((entry) => (
                <li
                  key={`${entry.approverId}-${entry.decidedAt}`}
                  className="flex items-center justify-between rounded border bg-surface-muted/60 px-2.5 py-1.5 text-sm"
                >
                  <span className="text-foreground">{entry.approverName}</span>
                  <span className="text-xs text-muted-foreground">
                    {formatRelativeTime(entry.decidedAt)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Panel>
    )
  }

  if (type === 'possible_duplicate') {
    return (
      <Panel
        emphasis="primary"
        title={header}
        description={description}
        actions={<Pill tone="warning">{related.length} related attempts</Pill>}
        bodyClassName="space-y-3 px-4 py-3"
      >
        <p className="text-sm text-muted-foreground">
          All attempts below reference payment{' '}
          <span className="font-mono text-xs">{refund.payment.paymentId}</span> captured{' '}
          {formatDate(refund.payment.capturedAt)} for{' '}
          {formatMoney(refund.payment.amount)}.
        </p>
        {related.length === 0 ? (
          <p className="text-sm text-muted-foreground">No other attempts reference this payment.</p>
        ) : (
          <ul className="space-y-1.5">
            {related.map((attempt) => {
              const overlaps = attempt.amount.amountMinor === refund.amount.amountMinor
              return (
                <li
                  key={attempt.id}
                  className={cn(
                    'flex flex-wrap items-center justify-between gap-2 rounded border px-2.5 py-1.5 text-sm',
                    overlaps ? 'border-rose-200 bg-rose-50/60' : 'bg-surface-muted/60',
                  )}
                >
                  <Link
                    to={`/refunds/${attempt.id}`}
                    className="font-mono text-xs text-navy-700 underline-offset-2 hover:underline"
                  >
                    {attempt.id}
                  </Link>
                  <span className="tabular-nums text-foreground">
                    {formatMoney(attempt.amount)}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {titleCase(attempt.reason)} · {formatRelativeTime(attempt.requestedAt)}
                  </span>
                  <StatusBadge status={attempt.status} />
                  {overlaps ? <Pill tone="critical">Same amount</Pill> : null}
                </li>
              )
            })}
          </ul>
        )}
      </Panel>
    )
  }

  if (type === 'elevated_fraud_signal') {
    const context = refund.customerContext
    return (
      <Panel
        emphasis="primary"
        title={header}
        description={description}
        actions={<Pill tone="critical">{titleCase(refund.risk)} risk</Pill>}
        bodyClassName="space-y-3 px-4 py-3"
      >
        <DetailList
          columns={3}
          items={[
            {
              label: 'Refund velocity',
              value:
                context.daysSinceLastRefund === null
                  ? 'First refund on file'
                  : `${context.priorRefundCount} prior · last ${context.daysSinceLastRefund}d ago`,
              emphasis: context.daysSinceLastRefund !== null && context.daysSinceLastRefund <= 7,
            },
            {
              label: 'Prior disputes and chargebacks',
              value: `${context.priorDisputes}`,
              emphasis: context.priorDisputes > 0,
            },
            { label: 'Account age', value: `${context.accountAgeDays} days` },
          ]}
        />
        {signal ? (
          <div className="grid gap-2 sm:grid-cols-2">
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
        ) : null}
      </Panel>
    )
  }

  if (type === 'processor_failure' && refund.processorError) {
    const error = refund.processorError
    return (
      <Panel
        emphasis="primary"
        title={header}
        description={description}
        actions={
          <Pill tone={error.fundsMoved ? 'critical' : 'warning'}>
            {error.fundsMoved ? 'Funds left the account' : 'No funds moved'}
          </Pill>
        }
        bodyClassName="space-y-3 px-4 py-3"
      >
        <DetailList
          columns={3}
          items={[
            { label: 'Error category', value: titleCase(error.category), emphasis: true },
            { label: 'Processor code', value: error.code },
            { label: 'Attempts', value: `${error.attempts}` },
            { label: 'Last attempt', value: formatRelativeTime(error.lastAttemptAt) },
            { label: 'Processor', value: refund.payment.processor },
            {
              label: 'Funds moved',
              value: error.fundsMoved ? 'Yes — reconcile before retrying' : 'No',
              emphasis: error.fundsMoved,
            },
          ]}
        />
        <p className="rounded border-l-2 border-amber-300 bg-amber-50/70 px-3 py-2 text-sm text-amber-950">
          {error.fundsMoved
            ? 'The transfer left the funding account before it failed. Confirm with the processor before retrying so the customer is not paid twice.'
            : 'The refund was approved but never settled. Retrying re-submits the same transfer to the processor.'}
        </p>
      </Panel>
    )
  }

  return (
    <Panel
      emphasis="primary"
      title={header}
      description={description}
      bodyClassName="space-y-3 px-4 py-3"
    >
      <DetailList
        columns={3}
        items={[
          { label: 'Original payment', value: refund.payment.paymentId },
          { label: 'Captured', value: formatDate(refund.payment.capturedAt) },
          { label: 'Payment amount', value: formatMoney(refund.payment.amount) },
          { label: 'Requested refund', value: formatMoney(refund.amount), emphasis: true },
          { label: 'Stated reason', value: titleCase(refund.reason) },
          {
            label: 'Eligibility',
            value:
              refund.amount.amountMinor <= refund.payment.amount.amountMinor
                ? 'Within the captured amount'
                : 'Exceeds the captured amount',
            emphasis: refund.amount.amountMinor > refund.payment.amount.amountMinor,
          },
        ]}
      />
      <p className="text-sm text-muted-foreground">
        Nothing on this request needs escalation. Confirm the payment matches the claim and decide.
      </p>
    </Panel>
  )
}
