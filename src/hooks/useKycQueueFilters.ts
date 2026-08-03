import { useLocalStorageState } from './useLocalStorageState'
import type { KycCaseStatus, KycQueueFilters, RiskLevel } from '@/types'

export interface StoredKycFilters {
  status: string
  risk: string
  assignee: string
  overdueOnly: boolean
  sort: NonNullable<KycQueueFilters['sort']>
}

export const defaultKycFilters: StoredKycFilters = {
  status: 'all',
  risk: 'all',
  assignee: 'all',
  overdueOnly: false,
  sort: 'sla',
}

/** Queue filters persist so the detail page's "next case" follows the same queue. */
export function useKycQueueFilters() {
  return useLocalStorageState<StoredKycFilters>('kyc-queue-filters', defaultKycFilters)
}

export function toQueueFilters(filters: StoredKycFilters): KycQueueFilters {
  return {
    status: filters.status === 'all' ? undefined : [filters.status as KycCaseStatus],
    risk: filters.risk === 'all' ? undefined : [filters.risk as RiskLevel],
    assigneeId: filters.assignee === 'all' ? undefined : filters.assignee,
    overdueOnly: filters.overdueOnly || undefined,
    sort: filters.sort,
  }
}
