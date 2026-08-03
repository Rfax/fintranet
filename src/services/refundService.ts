import { refundRequests as seedRefunds, refundVolumeTrend } from '@/data/refunds'
import { findUser, signedInUserId } from '@/data/users'
import { selectPrimarySignal } from '@/logic/focus'
import type {
  Money,
  RefundAmountBand,
  RefundMetrics,
  RefundNote,
  RefundQueueFilters,
  RefundReason,
  RefundRequest,
  RefundSignal,
  RefundStatus,
} from '@/types'
import { appendActivity } from './activityService'
import { reject, respond, ServiceError } from './client'
import { loadCollection, saveCollection } from './store'

const STORE_KEY = 'refund-requests'
const HIGH_VALUE_THRESHOLD_MINOR = 250_000

const amountBands: Record<RefundAmountBand, [number, number]> = {
  under_100: [0, 10_000],
  '100_to_1000': [10_000, 100_000],
  '1000_to_2500': [100_000, 250_000],
  over_2500: [250_000, Number.MAX_SAFE_INTEGER],
}

const READ_ONLY_STATUSES: RefundStatus[] = ['completed', 'rejected']

function refunds(): RefundRequest[] {
  return loadCollection(STORE_KEY, seedRefunds)
}

function matchesFilters(refund: RefundRequest, filters: RefundQueueFilters): boolean {
  const search = filters.search?.trim().toLowerCase()
  if (search) {
    const haystack =
      `${refund.id} ${refund.customerName} ${refund.customerId} ${refund.payment.paymentId}`.toLowerCase()
    if (!haystack.includes(search)) return false
  }
  if (filters.status?.length && !filters.status.includes(refund.status)) return false
  if (filters.reason?.length && !filters.reason.includes(refund.reason)) return false
  if (filters.risk?.length && !filters.risk.includes(refund.risk)) return false
  if (filters.amountBand) {
    const [min, max] = amountBands[filters.amountBand]
    if (refund.amount.amountMinor < min || refund.amount.amountMinor >= max) return false
  }
  if (filters.highValueOnly && refund.amount.amountMinor < HIGH_VALUE_THRESHOLD_MINOR) return false
  return true
}

export function listRefunds(filters: RefundQueueFilters = {}): Promise<RefundRequest[]> {
  const filtered = refunds()
    .filter((refund) => matchesFilters(refund, filters))
    .sort((a, b) => Date.parse(b.requestedAt) - Date.parse(a.requestedAt))
  return respond(filtered)
}

export function getRefund(refundId: string): Promise<RefundRequest> {
  const found = refunds().find((refund) => refund.id.toLowerCase() === refundId.toLowerCase())
  if (!found) {
    return reject(new ServiceError(`No refund matches ${refundId}`, 'not_found'))
  }
  return respond(found)
}

export function listRelatedRefunds(refund: RefundRequest): Promise<RefundRequest[]> {
  const related = refunds().filter(
    (candidate) =>
      candidate.id !== refund.id &&
      (refund.relatedRefundIds.includes(candidate.id) ||
        candidate.payment.paymentId === refund.payment.paymentId),
  )
  return respond(related, 60)
}

export function getPrimarySignal(refund: RefundRequest): RefundSignal | null {
  return selectPrimarySignal(refund.signals)
}

export function isHighValue(amount: Money): boolean {
  return amount.amountMinor >= HIGH_VALUE_THRESHOLD_MINOR
}

export function highValueThreshold(): Money {
  return { amountMinor: HIGH_VALUE_THRESHOLD_MINOR, currency: 'USD' }
}

export function isReadOnly(refund: RefundRequest): boolean {
  return READ_ONLY_STATUSES.includes(refund.status)
}

export function remainingApprovals(refund: RefundRequest): number {
  const approved = refund.approvals.filter((entry) => entry.decision === 'approved').length
  return Math.max(refund.requiredApprovals - approved, 0)
}

export function hasApproved(refund: RefundRequest, userId: string): boolean {
  return refund.approvals.some(
    (entry) => entry.approverId === userId && entry.decision === 'approved',
  )
}

function replace(
  refundId: string,
  update: (refund: RefundRequest) => RefundRequest,
): RefundRequest | null {
  const list = refunds()
  const index = list.findIndex((refund) => refund.id === refundId)
  if (index === -1) return null
  const updated = update(list[index])
  const next = [...list]
  next[index] = updated
  saveCollection(STORE_KEY, next)
  return updated
}

function find(refundId: string): RefundRequest | undefined {
  return refunds().find((refund) => refund.id === refundId)
}

function record(
  refund: RefundRequest,
  action: Parameters<typeof appendActivity>[0]['action'],
  actorId: string,
  summary: string,
  reason?: string,
  changes?: { field: string; before: string; after: string }[],
): void {
  appendActivity({
    module: 'refunds',
    action,
    actorId,
    actorName: findUser(actorId)?.name ?? 'Unknown operator',
    recordType: 'refund',
    recordId: refund.id,
    recordLabel: `${refund.id} - ${refund.customerName}`,
    summary,
    reason,
    changes,
  })
}

/**
 * Records one approval. A refund only moves to processing once every required
 * approval is in; the processor completes it separately.
 */
export function approveRefund(
  refundId: string,
  reason: string,
  actorId: string = signedInUserId,
): Promise<RefundRequest> {
  const before = find(refundId)
  if (!before) return reject(new ServiceError(`No refund matches ${refundId}`, 'not_found'))
  if (isReadOnly(before)) {
    return reject(new ServiceError(`${refundId} is closed and cannot be changed`, 'conflict'))
  }
  if (hasApproved(before, actorId)) {
    return reject(
      new ServiceError('You have already approved this refund; a second approver is required', 'forbidden'),
    )
  }

  const actor = findUser(actorId)
  const approvals = [
    ...before.approvals,
    {
      approverId: actorId,
      approverName: actor?.name ?? 'Unknown operator',
      decidedAt: new Date().toISOString(),
      decision: 'approved' as const,
    },
  ]
  const approvedCount = approvals.filter((entry) => entry.decision === 'approved').length
  const complete = approvedCount >= before.requiredApprovals
  const status: RefundStatus = complete ? 'processing' : 'awaiting_second_approval'

  const updated = replace(refundId, (refund) => ({
    ...refund,
    approvals,
    status,
    decisionReason: reason.trim() || refund.decisionReason,
  }))
  if (!updated) return reject(new ServiceError(`No refund matches ${refundId}`, 'not_found'))

  record(
    updated,
    'refund.approved',
    actorId,
    complete
      ? 'Approved the refund and released it to the processor'
      : `Recorded approval ${approvedCount} of ${before.requiredApprovals}`,
    reason.trim() || undefined,
    [
      { field: 'status', before: before.status, after: status },
      {
        field: 'approvals',
        before: `${approvedCount - 1} of ${before.requiredApprovals}`,
        after: `${approvedCount} of ${before.requiredApprovals}`,
      },
    ],
  )

  return respond(updated)
}

export function rejectRefund(
  refundId: string,
  reason: string,
  actorId: string = signedInUserId,
): Promise<RefundRequest> {
  if (!reason.trim()) {
    return reject(new ServiceError('A reason is required to reject a refund', 'conflict'))
  }
  const before = find(refundId)
  if (!before) return reject(new ServiceError(`No refund matches ${refundId}`, 'not_found'))
  if (isReadOnly(before)) {
    return reject(new ServiceError(`${refundId} is closed and cannot be changed`, 'conflict'))
  }

  const actor = findUser(actorId)
  const updated = replace(refundId, (refund) => ({
    ...refund,
    status: 'rejected',
    resolvedAt: new Date().toISOString(),
    decisionReason: reason.trim(),
    approvals: [
      ...refund.approvals,
      {
        approverId: actorId,
        approverName: actor?.name ?? 'Unknown operator',
        decidedAt: new Date().toISOString(),
        decision: 'rejected' as const,
      },
    ],
  }))
  if (!updated) return reject(new ServiceError(`No refund matches ${refundId}`, 'not_found'))

  record(updated, 'refund.rejected', actorId, 'Rejected the refund request', reason.trim(), [
    { field: 'status', before: before.status, after: 'rejected' },
  ])
  return respond(updated)
}

export function escalateRefund(
  refundId: string,
  reason: string,
  actorId: string = signedInUserId,
): Promise<RefundRequest> {
  if (!reason.trim()) {
    return reject(new ServiceError('A reason is required to escalate a refund', 'conflict'))
  }
  const before = find(refundId)
  if (!before) return reject(new ServiceError(`No refund matches ${refundId}`, 'not_found'))
  if (isReadOnly(before)) {
    return reject(new ServiceError(`${refundId} is closed and cannot be changed`, 'conflict'))
  }

  const actor = findUser(actorId)
  const updated = replace(refundId, (refund) => ({
    ...refund,
    status: 'escalated',
    escalation: {
      escalatedById: actorId,
      escalatedByName: actor?.name ?? 'Unknown operator',
      escalatedAt: new Date().toISOString(),
      reason: reason.trim(),
    },
  }))
  if (!updated) return reject(new ServiceError(`No refund matches ${refundId}`, 'not_found'))

  record(updated, 'refund.escalated', actorId, 'Escalated the refund for senior review', reason.trim(), [
    { field: 'status', before: before.status, after: 'escalated' },
  ])
  return respond(updated)
}

export function retryRefund(
  refundId: string,
  actorId: string = signedInUserId,
): Promise<RefundRequest> {
  const before = find(refundId)
  if (!before) return reject(new ServiceError(`No refund matches ${refundId}`, 'not_found'))
  if (before.status !== 'failed') {
    return reject(new ServiceError('Only a failed processor operation can be retried', 'conflict'))
  }

  const updated = replace(refundId, (refund) => ({
    ...refund,
    status: 'processing',
    processorError: refund.processorError
      ? {
          ...refund.processorError,
          attempts: refund.processorError.attempts + 1,
          lastAttemptAt: new Date().toISOString(),
        }
      : refund.processorError,
  }))
  if (!updated) return reject(new ServiceError(`No refund matches ${refundId}`, 'not_found'))

  record(
    updated,
    'refund.retried',
    actorId,
    `Retried the processor transfer (attempt ${updated.processorError?.attempts ?? 1})`,
    undefined,
    [{ field: 'status', before: 'failed', after: 'processing' }],
  )
  return respond(updated)
}

export function addRefundNote(
  refundId: string,
  body: string,
  actorId: string = signedInUserId,
): Promise<RefundRequest> {
  if (!body.trim()) return reject(new ServiceError('A note cannot be empty', 'conflict'))

  const actor = findUser(actorId)
  const note: RefundNote = {
    id: `RNOTE-${Date.now()}`,
    authorId: actorId,
    authorName: actor?.name ?? 'Unknown operator',
    body: body.trim(),
    createdAt: new Date().toISOString(),
  }
  const updated = replace(refundId, (refund) => ({
    ...refund,
    notes: [note, ...refund.notes],
  }))
  if (!updated) return reject(new ServiceError(`No refund matches ${refundId}`, 'not_found'))

  record(updated, 'refund.note_added', actorId, 'Added an internal note', note.body)
  return respond(updated)
}

export function getRefundMetrics(): Promise<RefundMetrics> {
  const all = refunds()
  const today = refundVolumeTrend[refundVolumeTrend.length - 1]
  const pending = all.filter((refund) =>
    ['pending_review', 'awaiting_second_approval', 'escalated'].includes(refund.status),
  )
  const failed = all.filter((refund) => refund.status === 'failed')

  const breakdown = new Map<RefundReason, { count: number; amountMinor: number }>()
  all.forEach((refund) => {
    const entry = breakdown.get(refund.reason) ?? { count: 0, amountMinor: 0 }
    entry.count += 1
    entry.amountMinor += refund.amount.amountMinor
    breakdown.set(refund.reason, entry)
  })

  return respond({
    requestsToday: today.count,
    requestedAmountToday: { amountMinor: today.amountMinor, currency: 'USD' },
    pendingReview: pending.length,
    averageProcessingHours: 6.4,
    failureRatePct: Number(((failed.length / all.length) * 100).toFixed(1)),
    volumeTrend: refundVolumeTrend,
    reasonBreakdown: [...breakdown.entries()]
      .map(([reason, entry]) => ({ reason, ...entry }))
      .sort((a, b) => b.count - a.count),
  })
}
