import type { ISODateString, Role } from './common'

export interface AppUser {
  id: string
  name: string
  email: string
  team: string
  role: Role
  avatarInitials: string
}

export type ActivityModule = 'kyc' | 'refunds' | 'flags'

export type ActivityAction =
  | 'case.approved'
  | 'case.rejected'
  | 'case.info_requested'
  | 'case.assigned'
  | 'case.note_added'
  | 'refund.retried'
  | 'refund.approved'
  | 'refund.rejected'
  | 'refund.escalated'
  | 'refund.note_added'
  | 'flag.enabled'
  | 'flag.disabled'
  | 'flag.rollout_changed'
  | 'flag.targeting_changed'
  | 'flag.override_set'
  | 'flag.override_cleared'
  | 'flag.rolled_back'

export interface ActivityChange {
  field: string
  before: string
  after: string
}

export interface ActivityEvent {
  id: string
  module: ActivityModule
  action: ActivityAction
  actorId: string
  actorName: string
  recordType: 'kyc_case' | 'refund' | 'feature_flag'
  recordId: string
  recordLabel: string
  summary: string
  reason?: string
  changes?: ActivityChange[]
  occurredAt: ISODateString
}
