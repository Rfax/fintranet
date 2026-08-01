import { refundRequests, refundVolumeTrend } from '@/data/refunds'
import { selectPrimarySignal } from '@/logic/focus'
import type {
  Money,
  RefundMetrics,
  RefundQueueFilters,
  RefundRequest,
  RefundSignal,
} from '@/types'
import { reject, respond, ServiceError } from './client'

const HIGH_VALUE_THRESHOLD_MINOR = 250_000

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
  if (filters.highValueOnly && refund.amount.amountMinor < HIGH_VALUE_THRESHOLD_MINOR) return false
  return true
}

export function listRefunds(filters: RefundQueueFilters = {}): Promise<RefundRequest[]> {
  const filtered = refundRequests
    .filter((refund) => matchesFilters(refund, filters))
    .sort((a, b) => Date.parse(b.requestedAt) - Date.parse(a.requestedAt))
  return respond(filtered)
}

export function getRefund(refundId: string): Promise<RefundRequest> {
  const found = refundRequests.find(
    (refund) => refund.id.toLowerCase() === refundId.toLowerCase(),
  )
  if (!found) {
    return reject(new ServiceError(`No refund matches ${refundId}`, 'not_found'))
  }
  return respond(found)
}

export function getPrimarySignal(refund: RefundRequest): RefundSignal | null {
  return selectPrimarySignal(refund.signals)
}

export function isHighValue(amount: Money): boolean {
  return amount.amountMinor >= HIGH_VALUE_THRESHOLD_MINOR
}

export function getRefundMetrics(): Promise<RefundMetrics> {
  const today = refundVolumeTrend[refundVolumeTrend.length - 1]
  const pending = refundRequests.filter((refund) =>
    ['pending_review', 'awaiting_second_approval'].includes(refund.status),
  )
  const failed = refundRequests.filter((refund) => refund.status === 'failed')

  return respond({
    requestsToday: today.count,
    requestedAmountToday: { amountMinor: today.amountMinor, currency: 'USD' },
    pendingReview: pending.length,
    averageProcessingHours: 6.4,
    failureRatePct: Number(((failed.length / refundRequests.length) * 100).toFixed(1)),
    volumeTrend: refundVolumeTrend,
  })
}
