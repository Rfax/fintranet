import { useCallback, useState } from 'react'
import { useParams } from 'react-router'
import { AlertTriangle, ArrowLeftRight, RefreshCw, User } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { Pill, RiskBadge, StatusBadge } from '@/components/shared/Badges'
import { ActivityTimeline } from '@/components/shared/ActivityTimeline'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { EmptyState } from '@/components/shared/EmptyState'
import { PageBody, PageHeader } from '@/components/shared/PageHeader'
import { DetailList, Panel } from '@/components/shared/Panel'
import { RefundFocusPanel } from '@/components/refunds/RefundFocusPanel'
import { useAsyncData } from '@/hooks/useAsyncData'
import { useSession } from '@/hooks/useSession'
import { rankSignals } from '@/logic/focus'
import {
  formatDate,
  formatMoney,
  formatPercent,
  formatRelativeTime,
  titleCase,
} from '@/logic/format'
import { listActivity } from '@/services/activityService'
import {
  addRefundNote,
  approveRefund,
  escalateRefund,
  getRefund,
  hasApproved,
  isHighValue,
  isReadOnly,
  listRelatedRefunds,
  rejectRefund,
  remainingApprovals,
  retryRefund,
} from '@/services/refundService'

type RefundAction = 'approve' | 'reject' | 'escalate' | 'retry'

const actionCopy: Record<
  RefundAction,
  { title: string; confirmLabel: string; description: string; destructive: boolean; reason: boolean }
> = {
  approve: {
    title: 'Approve this refund',
    confirmLabel: 'Approve refund',
    description:
      'Approval releases the refund to the processor. Settlement is confirmed separately once the processor completes the transfer.',
    destructive: false,
    reason: true,
  },
  reject: {
    title: 'Reject this refund',
    confirmLabel: 'Reject refund',
    description: 'The customer keeps no refund. The reason is recorded in the activity history.',
    destructive: true,
    reason: true,
  },
  escalate: {
    title: 'Escalate this refund',
    confirmLabel: 'Escalate',
    description:
      'Escalation hands the request to a senior reviewer and keeps it out of the standard queue.',
    destructive: false,
    reason: true,
  },
  retry: {
    title: 'Retry the processor transfer',
    confirmLabel: 'Retry transfer',
    description:
      'The same transfer is resubmitted to the processor. Confirm no funds already moved before retrying.',
    destructive: false,
    reason: false,
  },
}

export function RefundDetailPage() {
  const { refundId = '' } = useParams()
  const { user } = useSession()
  const [action, setAction] = useState<RefundAction | null>(null)
  const [noteDraft, setNoteDraft] = useState('')
  const [savingNote, setSavingNote] = useState(false)

  const { data: refund, loading, error, reload } = useAsyncData(
    () => getRefund(refundId),
    [refundId],
  )
  const related = useAsyncData(
    () => (refund ? listRelatedRefunds(refund) : Promise.resolve([])),
    [refund?.id],
  )
  const activity = useAsyncData(
    () => listActivity({ module: 'refunds', recordId: refund?.id ?? refundId }),
    [refund?.id, refundId],
  )

  const refresh = useCallback(() => {
    reload()
    activity.reload()
  }, [reload, activity])

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
            description={error?.message ?? `No refund matches ${refundId}.`}
          />
        </Panel>
      </PageBody>
    )
  }

  const primary = rankSignals(refund.signals)[0] ?? null
  const customerIsUnusual =
    refund.customerContext.refundRatePct > refund.customerContext.cohortRefundRatePct * 2
  const itemIsUnusual =
    refund.itemContext.refundRatePct > refund.itemContext.baselineRefundRatePct * 2
  const readOnly = isReadOnly(refund)
  const alreadyApproved = hasApproved(refund, user.id)
  const remaining = remainingApprovals(refund)

  const runAction = async (reason: string) => {
    if (!action) return
    try {
      if (action === 'approve') {
        const updated = await approveRefund(refund.id, reason, user.id)
        toast.success(
          updated.status === 'processing'
            ? `${refund.id} approved and sent to the processor`
            : `Approval recorded. ${remainingApprovals(updated)} more required.`,
        )
      } else if (action === 'reject') {
        await rejectRefund(refund.id, reason, user.id)
        toast.success(`${refund.id} rejected`)
      } else if (action === 'escalate') {
        await escalateRefund(refund.id, reason, user.id)
        toast.success(`${refund.id} escalated for senior review`)
      } else {
        await retryRefund(refund.id, user.id)
        toast.success('Transfer resubmitted to the processor')
      }
      refresh()
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : 'The action could not be completed')
    } finally {
      setAction(null)
    }
  }

  const submitNote = async () => {
    setSavingNote(true)
    try {
      await addRefundNote(refund.id, noteDraft, user.id)
      setNoteDraft('')
      toast.success('Note added to the refund')
      refresh()
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : 'The note could not be saved')
    } finally {
      setSavingNote(false)
    }
  }

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
            {isHighValue(refund.amount) ? <Pill tone="warning">High value</Pill> : null}
          </>
        }
        description={`${refund.customerName} · ${titleCase(refund.reason)} · requested ${formatRelativeTime(refund.requestedAt)}`}
        actions={
          readOnly ? (
            <span className="text-xs text-muted-foreground">
              {titleCase(refund.status)}
              {refund.resolvedAt ? ` ${formatRelativeTime(refund.resolvedAt)}` : ''} · read-only
            </span>
          ) : (
            <>
              {refund.status === 'failed' ? (
                <Button size="sm" onClick={() => setAction('retry')}>
                  <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                  Retry transfer
                </Button>
              ) : null}
              <Button variant="outline" size="sm" onClick={() => setAction('escalate')}>
                Escalate
              </Button>
              <Button variant="outline" size="sm" onClick={() => setAction('reject')}>
                Reject
              </Button>
              <Button
                size="sm"
                disabled={alreadyApproved || refund.status === 'processing'}
                title={
                  alreadyApproved
                    ? 'You have already approved this refund; a second approver is required'
                    : undefined
                }
                onClick={() => setAction('approve')}
              >
                Approve
              </Button>
            </>
          )
        }
      />
      <PageBody>
        {refund.status === 'processing' ? (
          <div className="rounded-md border border-sky-200 bg-sky-50/70 px-3.5 py-2.5 text-sm text-sky-900">
            Approved and released. The processor has not confirmed settlement yet, so the refund is
            not complete.
          </div>
        ) : null}
        {alreadyApproved && remaining > 0 ? (
          <div className="rounded-md border border-amber-300 bg-amber-50/70 px-3.5 py-2.5 text-sm text-amber-950">
            You approved this refund. {remaining} more approval
            {remaining === 1 ? '' : 's'} from a different operator {remaining === 1 ? 'is' : 'are'}{' '}
            required before it can be released.
          </div>
        ) : null}
        {refund.escalation ? (
          <div className="rounded-md border border-orange-300 bg-orange-50/70 px-3.5 py-2.5 text-sm text-orange-950">
            <span className="font-medium">
              Escalated by {refund.escalation.escalatedByName}{' '}
              {formatRelativeTime(refund.escalation.escalatedAt)}:
            </span>{' '}
            {refund.escalation.reason}
          </div>
        ) : null}
        {readOnly && refund.decisionReason ? (
          <div className="rounded-md border border-navy-200 bg-navy-50/60 px-3.5 py-2.5 text-sm text-navy-900">
            <span className="font-medium">{titleCase(refund.status)}:</span> {refund.decisionReason}
          </div>
        ) : null}

        <RefundFocusPanel refund={refund} signal={primary} related={related.data ?? []} />

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
            footer="Compared with customers of a similar account age over the last 12 months."
          >
            <DetailList
              columns={2}
              items={[
                { label: 'Account age', value: `${refund.customerContext.accountAgeDays} days` },
                {
                  label: 'Prior refunds',
                  value: `${refund.customerContext.priorRefundCount} · ${formatMoney(refund.customerContext.priorRefundValue, { compact: true })}`,
                },
                {
                  label: 'Refund rate',
                  value: formatPercent(refund.customerContext.refundRatePct, 1),
                  emphasis: customerIsUnusual,
                },
                {
                  label: 'Cohort rate',
                  value: formatPercent(refund.customerContext.cohortRefundRatePct, 1),
                },
                {
                  label: 'Days since last refund',
                  value: refund.customerContext.daysSinceLastRefund ?? 'No prior refund',
                },
                { label: 'Prior disputes', value: `${refund.customerContext.priorDisputes}` },
                {
                  label: 'Common reasons',
                  value:
                    refund.customerContext.commonReasons.map(titleCase).join(', ') ||
                    'None recorded',
                },
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
            footer={`Compared with the ${refund.itemContext.scope} baseline over the last 30 days.`}
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
                {
                  label: 'Baseline',
                  value: formatPercent(refund.itemContext.baselineRefundRatePct, 1),
                },
                {
                  label: 'Change vs. prior period',
                  value: `${refund.itemContext.changeVsPriorPeriodPct > 0 ? '+' : ''}${refund.itemContext.changeVsPriorPeriodPct}%`,
                  emphasis: Math.abs(refund.itemContext.changeVsPriorPeriodPct) > 25,
                },
                {
                  label: 'Common reasons',
                  value:
                    refund.itemContext.commonReasons.map(titleCase).join(', ') || 'None recorded',
                },
              ]}
            />
          </Panel>
        </div>

        <Panel
          title="Original payment"
          description="Approval is recorded separately from processor completion."
        >
          <DetailList
            columns={3}
            items={[
              { label: 'Payment ID', value: refund.payment.paymentId },
              { label: 'Captured', value: formatDate(refund.payment.capturedAt) },
              { label: 'Amount', value: formatMoney(refund.payment.amount) },
              {
                label: 'Method',
                value: `${titleCase(refund.payment.method)}${refund.payment.cardLast4 ? ` ····${refund.payment.cardLast4}` : ''}`,
              },
              { label: 'Processor', value: refund.payment.processor },
              { label: 'Merchant', value: refund.payment.merchant },
              {
                label: 'Item',
                value: `${refund.payment.itemName} (${refund.payment.itemCategory})`,
              },
            ]}
          />
        </Panel>

        <div className="grid gap-4 lg:grid-cols-2">
          <Panel title="Internal notes" description="Visible to every operator on this refund.">
            <div className="space-y-2">
              <Textarea
                value={noteDraft}
                onChange={(event) => setNoteDraft(event.target.value)}
                placeholder="Record what you checked and anything the next operator needs to know."
                className="min-h-[72px] text-sm"
              />
              <div className="flex justify-end">
                <Button
                  size="sm"
                  disabled={noteDraft.trim().length === 0 || savingNote}
                  onClick={submitNote}
                >
                  Add note
                </Button>
              </div>
            </div>
            {refund.notes.length === 0 ? (
              <p className="mt-3 border-t pt-3 text-sm text-muted-foreground">
                No notes on this refund yet.
              </p>
            ) : (
              <ul className="mt-3 space-y-2.5 border-t pt-3">
                {refund.notes.map((note) => (
                  <li key={note.id}>
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-sm font-medium text-foreground">{note.authorName}</span>
                      <span className="text-xs text-muted-foreground">
                        {formatRelativeTime(note.createdAt)}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">{note.body}</p>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title="Refund activity" description="Every decision recorded for this refund.">
            <ActivityTimeline events={activity.data ?? []} showRecordLink={false} />
          </Panel>
        </div>
      </PageBody>

      {action ? (
        <ConfirmDialog
          open
          onOpenChange={(open) => {
            if (!open) setAction(null)
          }}
          title={actionCopy[action].title}
          description={actionCopy[action].description}
          confirmLabel={actionCopy[action].confirmLabel}
          destructive={actionCopy[action].destructive}
          requireReason={actionCopy[action].reason}
          details={
            <div className="rounded border bg-surface-muted/60 px-3 py-2 text-sm">
              <p className="font-medium text-foreground">
                {formatMoney(refund.amount)} to {refund.customerName}{' '}
                <span className="font-mono text-xs text-muted-foreground">{refund.id}</span>
              </p>
              <p className="text-xs text-muted-foreground">
                {titleCase(refund.reason)} · {refund.payment.merchant} ·{' '}
                {action === 'approve' && remaining > 1
                  ? `${remaining} approvals required`
                  : `${refund.requiredApprovals} approval${refund.requiredApprovals === 1 ? '' : 's'} required`}
              </p>
            </div>
          }
          onConfirm={runAction}
        />
      ) : null}
    </>
  )
}
