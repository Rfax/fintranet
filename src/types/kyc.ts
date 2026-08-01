import type {
  AttentionSignal,
  ISODateString,
  Money,
  RiskLevel,
} from './common'

export type KycCaseStatus =
  | 'awaiting_review'
  | 'in_review'
  | 'info_requested'
  | 'approved'
  | 'rejected'

/** Drives which focus panel the case detail page renders. */
export type KycSignalType =
  | 'sanctions_match'
  | 'document_mismatch'
  | 'high_risk_jurisdiction'
  | 'duplicate_identity'
  | 'address_verification_failure'
  | 'incomplete_evidence'

export type KycRiskSignal = AttentionSignal<KycSignalType>

export interface KycCustomerProfile {
  fullName: string
  dateOfBirth: string
  nationality: string
  residenceCountry: string
  occupation: string
  declaredAnnualIncome: Money
  sourceOfFunds: string
  email: string
  phone: string
  addressLine: string
  customerSince: ISODateString
}

export interface KycAccount {
  id: string
  product: 'checking' | 'savings' | 'card' | 'crypto_wallet'
  status: 'active' | 'restricted' | 'closed'
  openedAt: ISODateString
  balance: Money
}

export interface KycTransactionSummary {
  monthlyInflow: Money
  monthlyOutflow: Money
  monthlyTransactionCount: number
  largestSingleTransfer: Money
  cashSharePct: number
  cryptoSharePct: number
  primaryGeographies: string[]
  /** Plain-language notes about declared-versus-observed activity. */
  observations: string[]
}

export interface KycCounterparty {
  name: string
  country: string
  relationship: string
  volume: Money
  flagged: boolean
}

export interface KycVerificationResult {
  check: string
  outcome: 'passed' | 'failed' | 'inconclusive' | 'not_run'
  provider: string
  checkedAt: ISODateString
  detail: string
}

export interface KycDocument {
  id: string
  type: 'passport' | 'national_id' | 'drivers_license' | 'utility_bill' | 'bank_statement'
  fileName: string
  uploadedAt: ISODateString
  expiresAt?: ISODateString
  extractionConfidence?: number
  anomalies: string[]
}

export interface KycNote {
  id: string
  authorId: string
  authorName: string
  body: string
  createdAt: ISODateString
}

export interface KycLinkedIdentity {
  customerId: string
  customerName: string
  sharedAttributes: string[]
  matchStrength: number
  accountStatus: 'active' | 'restricted' | 'closed'
  priorReviewOutcome?: string
}

export interface KycCase {
  id: string
  customerId: string
  customerName: string
  country: string
  status: KycCaseStatus
  assigneeId: string | null
  submittedAt: ISODateString
  slaDueAt: ISODateString
  completedAt?: ISODateString
  overallRisk: RiskLevel
  riskSignals: KycRiskSignal[]
  profile: KycCustomerProfile
  accounts: KycAccount[]
  transactionSummary: KycTransactionSummary
  counterparties: KycCounterparty[]
  verificationResults: KycVerificationResult[]
  documents: KycDocument[]
  linkedIdentities: KycLinkedIdentity[]
  notes: KycNote[]
}

export interface KycQueueFilters {
  search?: string
  status?: KycCaseStatus[]
  risk?: RiskLevel[]
  assigneeId?: string | 'me' | null
  sort?: 'oldest' | 'newest' | 'highest_risk' | 'sla'
}

export interface KycWorkloadMetrics {
  openCases: number
  receivedToday: number
  completedToday: number
  overdue: number
  averageReviewMinutes: number
  previousAverageReviewMinutes: number
  oldestUnreviewedCaseId: string | null
  backlogByRisk: Record<RiskLevel, number>
  trend: KycTrendPoint[]
}

export interface KycTrendPoint {
  date: string
  received: number
  completed: number
  averageReviewMinutes: number
}
