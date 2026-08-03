import type { AttentionSignal, ISODateString, Money, RiskLevel } from './common'

export type RefundStatus =
  | 'pending_review'
  | 'awaiting_second_approval'
  | 'escalated'
  | 'approved'
  | 'rejected'
  | 'processing'
  | 'completed'
  | 'failed'

export type RefundReason =
  | 'item_not_received'
  | 'item_not_as_described'
  | 'duplicate_charge'
  | 'subscription_cancelled'
  | 'fraudulent_charge'
  | 'service_issue'

/** Drives which focus panel the refund detail page renders. */
export type RefundSignalType =
  | 'high_value'
  | 'possible_duplicate'
  | 'elevated_fraud_signal'
  | 'processor_failure'
  | 'standard_request'

export type RefundSignal = AttentionSignal<RefundSignalType>

export interface RefundPayment {
  paymentId: string
  capturedAt: ISODateString
  amount: Money
  method: 'card' | 'bank_transfer' | 'wallet'
  cardLast4?: string
  processor: string
  merchant: string
  itemName: string
  itemCategory: string
}

/** How this request compares with the customer's own history. */
export interface CustomerRefundContext {
  accountAgeDays: number
  priorRefundCount: number
  priorRefundValue: Money
  refundRatePct: number
  cohortRefundRatePct: number
  daysSinceLastRefund: number | null
  commonReasons: RefundReason[]
  priorDisputes: number
  summary: string
}

/** How this request compares with the item, merchant, or refund type. */
export interface ItemRefundContext {
  scope: 'item' | 'merchant' | 'category'
  scopeLabel: string
  refundRatePct: number
  baselineRefundRatePct: number
  requestsLast30Days: number
  changeVsPriorPeriodPct: number
  commonReasons: RefundReason[]
  summary: string
}

export interface RefundApproval {
  approverId: string
  approverName: string
  decidedAt: ISODateString
  decision: 'approved' | 'rejected'
}

export interface RefundNote {
  id: string
  authorId: string
  authorName: string
  body: string
  createdAt: ISODateString
}

export interface RefundRequest {
  id: string
  customerId: string
  customerName: string
  amount: Money
  reason: RefundReason
  status: RefundStatus
  risk: RiskLevel
  requestedAt: ISODateString
  resolvedAt?: ISODateString
  payment: RefundPayment
  signals: RefundSignal[]
  customerContext: CustomerRefundContext
  itemContext: ItemRefundContext
  requiredApprovals: number
  approvals: RefundApproval[]
  processorError?: {
    code: string
    category: 'network' | 'issuer_declined' | 'insufficient_funds' | 'timeout'
    attempts: number
    fundsMoved: boolean
    lastAttemptAt: ISODateString
  }
  relatedRefundIds: string[]
  notes: RefundNote[]
  escalation?: {
    escalatedById: string
    escalatedByName: string
    escalatedAt: ISODateString
    reason: string
  }
  decisionReason?: string
}

export type RefundAmountBand = 'under_100' | '100_to_1000' | '1000_to_2500' | 'over_2500'

export interface RefundQueueFilters {
  search?: string
  status?: RefundStatus[]
  reason?: RefundReason[]
  risk?: RiskLevel[]
  amountBand?: RefundAmountBand
  highValueOnly?: boolean
}

export interface RefundMetrics {
  requestsToday: number
  requestedAmountToday: Money
  pendingReview: number
  averageProcessingHours: number
  failureRatePct: number
  volumeTrend: { date: string; count: number; amountMinor: number }[]
  reasonBreakdown: { reason: RefundReason; count: number; amountMinor: number }[]
}
