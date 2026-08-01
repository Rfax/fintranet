import { kycCases, kycTrend } from '@/data/kycCases'
import { signedInUserId } from '@/data/users'
import { selectPrimarySignal } from '@/logic/focus'
import { slaState } from '@/logic/format'
import type {
  KycCase,
  KycQueueFilters,
  KycRiskSignal,
  KycWorkloadMetrics,
  RiskLevel,
} from '@/types'
import { respond, ServiceError, reject } from './client'

const riskOrder: Record<RiskLevel, number> = { critical: 4, high: 3, medium: 2, low: 1 }

function matchesFilters(kycCase: KycCase, filters: KycQueueFilters): boolean {
  const search = filters.search?.trim().toLowerCase()
  if (search) {
    const haystack = `${kycCase.id} ${kycCase.customerName} ${kycCase.customerId}`.toLowerCase()
    if (!haystack.includes(search)) return false
  }
  if (filters.status?.length && !filters.status.includes(kycCase.status)) return false
  if (filters.risk?.length && !filters.risk.includes(kycCase.overallRisk)) return false
  if (filters.assigneeId === 'me' && kycCase.assigneeId !== signedInUserId) return false
  if (
    filters.assigneeId &&
    filters.assigneeId !== 'me' &&
    kycCase.assigneeId !== filters.assigneeId
  ) {
    return false
  }
  return true
}

function sortCases(cases: KycCase[], sort: KycQueueFilters['sort']): KycCase[] {
  const sorted = [...cases]
  switch (sort) {
    case 'newest':
      return sorted.sort((a, b) => Date.parse(b.submittedAt) - Date.parse(a.submittedAt))
    case 'highest_risk':
      return sorted.sort(
        (a, b) =>
          riskOrder[b.overallRisk] - riskOrder[a.overallRisk] ||
          Date.parse(a.slaDueAt) - Date.parse(b.slaDueAt),
      )
    case 'sla':
      return sorted.sort((a, b) => Date.parse(a.slaDueAt) - Date.parse(b.slaDueAt))
    case 'oldest':
    default:
      return sorted.sort((a, b) => Date.parse(a.submittedAt) - Date.parse(b.submittedAt))
  }
}

export function listKycCases(filters: KycQueueFilters = {}): Promise<KycCase[]> {
  const filtered = kycCases.filter((kycCase) => matchesFilters(kycCase, filters))
  return respond(sortCases(filtered, filters.sort))
}

export function getKycCase(caseId: string): Promise<KycCase> {
  const found = kycCases.find((kycCase) => kycCase.id.toLowerCase() === caseId.toLowerCase())
  if (!found) {
    return reject(new ServiceError(`No KYC case matches ${caseId}`, 'not_found'))
  }
  return respond(found)
}

/** The signal the adaptive detail view leads with. */
export function getPrimarySignal(kycCase: KycCase): KycRiskSignal | null {
  return selectPrimarySignal(kycCase.riskSignals)
}

export function getKycWorkloadMetrics(now: Date = new Date()): Promise<KycWorkloadMetrics> {
  const open = kycCases.filter(
    (kycCase) => !['approved', 'rejected'].includes(kycCase.status),
  )
  const backlogByRisk = open.reduce<Record<RiskLevel, number>>(
    (acc, kycCase) => {
      acc[kycCase.overallRisk] += 1
      return acc
    },
    { low: 0, medium: 0, high: 0, critical: 0 },
  )
  const oldest = [...open].sort(
    (a, b) => Date.parse(a.submittedAt) - Date.parse(b.submittedAt),
  )[0]
  const today = kycTrend[kycTrend.length - 1]
  const yesterday = kycTrend[kycTrend.length - 2]

  return respond({
    openCases: open.length,
    receivedToday: today.received,
    completedToday: today.completed,
    overdue: open.filter((kycCase) => slaState(kycCase.slaDueAt, now) === 'breached').length,
    averageReviewMinutes: today.averageReviewMinutes,
    previousAverageReviewMinutes: yesterday.averageReviewMinutes,
    oldestUnreviewedCaseId: oldest?.id ?? null,
    backlogByRisk,
    trend: kycTrend,
  })
}
