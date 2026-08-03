import { kycCases as seedCases, kycTrend } from '@/data/kycCases'
import { findUser, signedInUserId } from '@/data/users'
import { selectPrimarySignal } from '@/logic/focus'
import { slaState } from '@/logic/format'
import type {
  KycCase,
  KycCaseStatus,
  KycNote,
  KycQueueFilters,
  KycRiskSignal,
  KycWorkloadMetrics,
  RiskLevel,
} from '@/types'
import { appendActivity } from './activityService'
import { respond, ServiceError, reject } from './client'
import { loadCollection, saveCollection } from './store'

const STORE_KEY = 'kyc-cases'
const riskOrder: Record<RiskLevel, number> = { critical: 4, high: 3, medium: 2, low: 1 }

function cases(): KycCase[] {
  return loadCollection(STORE_KEY, seedCases)
}

function persist(next: KycCase[]): void {
  saveCollection(STORE_KEY, next)
}

function matchesFilters(kycCase: KycCase, filters: KycQueueFilters, now: Date): boolean {
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
  if (filters.overdueOnly && slaState(kycCase.slaDueAt, now) !== 'breached') return false
  return true
}

function sortCases(list: KycCase[], sort: KycQueueFilters['sort']): KycCase[] {
  const sorted = [...list]
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

export function listKycCases(
  filters: KycQueueFilters = {},
  now: Date = new Date(),
): Promise<KycCase[]> {
  const filtered = cases().filter((kycCase) => matchesFilters(kycCase, filters, now))
  return respond(sortCases(filtered, filters.sort))
}

export function getKycCase(caseId: string): Promise<KycCase> {
  const found = cases().find((kycCase) => kycCase.id.toLowerCase() === caseId.toLowerCase())
  if (!found) {
    return reject(new ServiceError(`No KYC case matches ${caseId}`, 'not_found'))
  }
  return respond(found)
}

/** The signal the adaptive detail view leads with. */
export function getPrimarySignal(kycCase: KycCase): KycRiskSignal | null {
  return selectPrimarySignal(kycCase.riskSignals)
}

/** The next case an operator should pick up under the same queue filters. */
export function getNextCaseId(
  currentCaseId: string,
  filters: KycQueueFilters = {},
  now: Date = new Date(),
): Promise<string | null> {
  const queue = sortCases(
    cases().filter((kycCase) => matchesFilters(kycCase, filters, now)),
    filters.sort,
  ).filter((kycCase) => !['approved', 'rejected'].includes(kycCase.status))

  const index = queue.findIndex((kycCase) => kycCase.id === currentCaseId)
  const next = index === -1 ? queue[0] : queue[index + 1] ?? queue[0]
  return respond(next && next.id !== currentCaseId ? next.id : null, 40)
}

export type KycDecision = 'approve' | 'reject' | 'request_info'

const decisionStatus: Record<KycDecision, KycCaseStatus> = {
  approve: 'approved',
  reject: 'rejected',
  request_info: 'info_requested',
}

const decisionAction = {
  approve: 'case.approved',
  reject: 'case.rejected',
  request_info: 'case.info_requested',
} as const

const decisionSummary: Record<KycDecision, string> = {
  approve: 'Approved the case',
  reject: 'Rejected the case',
  request_info: 'Requested more information from the customer',
}

function replace(caseId: string, update: (kycCase: KycCase) => KycCase): KycCase | null {
  const list = cases()
  const index = list.findIndex((kycCase) => kycCase.id === caseId)
  if (index === -1) return null
  const updated = update(list[index])
  const next = [...list]
  next[index] = updated
  persist(next)
  return updated
}

export function decideKycCase(
  caseId: string,
  decision: KycDecision,
  reason: string,
  actorId: string = signedInUserId,
): Promise<KycCase> {
  if (decision !== 'approve' && !reason.trim()) {
    return reject(new ServiceError('A reason is required for this decision', 'conflict'))
  }

  const before = cases().find((kycCase) => kycCase.id === caseId)
  if (!before) {
    return reject(new ServiceError(`No KYC case matches ${caseId}`, 'not_found'))
  }
  if (['approved', 'rejected'].includes(before.status)) {
    return reject(new ServiceError(`${caseId} has already been decided`, 'conflict'))
  }

  const status = decisionStatus[decision]
  const updated = replace(caseId, (kycCase) => ({
    ...kycCase,
    status,
    decisionReason: reason.trim() || undefined,
    decidedById: actorId,
    completedAt:
      status === 'approved' || status === 'rejected'
        ? new Date().toISOString()
        : kycCase.completedAt,
  }))
  if (!updated) {
    return reject(new ServiceError(`No KYC case matches ${caseId}`, 'not_found'))
  }

  const actor = findUser(actorId)
  appendActivity({
    module: 'kyc',
    action: decisionAction[decision],
    actorId,
    actorName: actor?.name ?? 'Unknown operator',
    recordType: 'kyc_case',
    recordId: updated.id,
    recordLabel: `${updated.id} - ${updated.customerName}`,
    summary: decisionSummary[decision],
    reason: reason.trim() || undefined,
    changes: [{ field: 'status', before: before.status, after: status }],
  })

  return respond(updated)
}

export function addKycNote(
  caseId: string,
  body: string,
  actorId: string = signedInUserId,
): Promise<KycCase> {
  if (!body.trim()) {
    return reject(new ServiceError('A note cannot be empty', 'conflict'))
  }
  const actor = findUser(actorId)
  const note: KycNote = {
    id: `NOTE-${Date.now()}`,
    authorId: actorId,
    authorName: actor?.name ?? 'Unknown operator',
    body: body.trim(),
    createdAt: new Date().toISOString(),
  }

  const updated = replace(caseId, (kycCase) => ({
    ...kycCase,
    notes: [note, ...kycCase.notes],
  }))
  if (!updated) {
    return reject(new ServiceError(`No KYC case matches ${caseId}`, 'not_found'))
  }

  appendActivity({
    module: 'kyc',
    action: 'case.note_added',
    actorId,
    actorName: note.authorName,
    recordType: 'kyc_case',
    recordId: updated.id,
    recordLabel: `${updated.id} - ${updated.customerName}`,
    summary: 'Added a review note',
    reason: note.body,
  })

  return respond(updated)
}

export function assignKycCase(
  caseId: string,
  assigneeId: string | null,
  actorId: string = signedInUserId,
): Promise<KycCase> {
  const before = cases().find((kycCase) => kycCase.id === caseId)
  const updated = replace(caseId, (kycCase) => ({
    ...kycCase,
    assigneeId,
    status: kycCase.status === 'awaiting_review' && assigneeId ? 'in_review' : kycCase.status,
  }))
  if (!before || !updated) {
    return reject(new ServiceError(`No KYC case matches ${caseId}`, 'not_found'))
  }

  appendActivity({
    module: 'kyc',
    action: 'case.assigned',
    actorId,
    actorName: findUser(actorId)?.name ?? 'Unknown operator',
    recordType: 'kyc_case',
    recordId: updated.id,
    recordLabel: `${updated.id} - ${updated.customerName}`,
    summary: assigneeId
      ? `Assigned the case to ${findUser(assigneeId)?.name ?? assigneeId}`
      : 'Unassigned the case',
    changes: [
      {
        field: 'assignee',
        before: before.assigneeId ? findUser(before.assigneeId)?.name ?? before.assigneeId : 'Unassigned',
        after: assigneeId ? findUser(assigneeId)?.name ?? assigneeId : 'Unassigned',
      },
    ],
  })

  return respond(updated)
}

export function getKycWorkloadMetrics(now: Date = new Date()): Promise<KycWorkloadMetrics> {
  const all = cases()
  const open = all.filter((kycCase) => !['approved', 'rejected'].includes(kycCase.status))
  const backlogByRisk = open.reduce<Record<RiskLevel, number>>(
    (acc, kycCase) => {
      acc[kycCase.overallRisk] += 1
      return acc
    },
    { low: 0, medium: 0, high: 0, critical: 0 },
  )
  const backlogBySla = open.reduce(
    (acc, kycCase) => {
      const state = slaState(kycCase.slaDueAt, now)
      if (state === 'breached') acc.breached += 1
      else if (state === 'due_soon') acc.dueSoon += 1
      else acc.onTrack += 1
      return acc
    },
    { onTrack: 0, dueSoon: 0, breached: 0 },
  )
  const oldest = [...open].sort(
    (a, b) => Date.parse(a.submittedAt) - Date.parse(b.submittedAt),
  )[0]
  const today = kycTrend[kycTrend.length - 1]
  const yesterday = kycTrend[kycTrend.length - 2]

  const recent = kycTrend.slice(-7)
  const netPerDay =
    recent.reduce((sum, point) => sum + point.completed - point.received, 0) / recent.length

  return respond({
    openCases: open.length,
    receivedToday: today.received,
    completedToday: today.completed,
    overdue: backlogBySla.breached,
    averageReviewMinutes: today.averageReviewMinutes,
    previousAverageReviewMinutes: yesterday.averageReviewMinutes,
    oldestUnreviewedCaseId: oldest?.id ?? null,
    oldestUnreviewedSubmittedAt: oldest?.submittedAt ?? null,
    backlogByRisk,
    backlogBySla,
    estimatedDaysToClear:
      netPerDay > 0 ? Number((open.length / netPerDay).toFixed(1)) : null,
    trend: kycTrend,
  })
}
