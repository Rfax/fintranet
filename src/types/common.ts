/** Shared vocabulary for every module. */

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical'

export type SignalSeverity = RiskLevel

export type EnvironmentKey = 'development' | 'staging' | 'production'

export type Role = 'viewer' | 'operator' | 'admin'

export type ISODateString = string

/** Money is stored in minor units to avoid floating point drift. */
export interface Money {
  amountMinor: number
  currency: 'USD' | 'EUR' | 'GBP'
}

/**
 * A ranked reason a record needs attention. The adaptive presentation layer
 * chooses which signal to lead with; it never changes the underlying outcome.
 */
export interface AttentionSignal<TType extends string = string> {
  id: string
  type: TType
  severity: SignalSeverity
  /** 0-1 strength of the evidence, when the source provides one. */
  confidence?: number
  headline: string
  explanation: string
  evidence: EvidenceItem[]
  source: string
  detectedAt: ISODateString
}

export interface EvidenceItem {
  label: string
  value: string
  /** Marks the value as the one that disagrees with the expected value. */
  conflicting?: boolean
}

export interface Paginated<T> {
  items: T[]
  total: number
}

export interface SortSpec<TField extends string = string> {
  field: TField
  direction: 'asc' | 'desc'
}
