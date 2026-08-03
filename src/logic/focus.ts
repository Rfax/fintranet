import type {
  AttentionSignal,
  KycSignalType,
  RefundSignalType,
  FlagSignalType,
  SignalSeverity,
} from '@/types'

/**
 * Deterministic display rules for the adaptive presentation layer.
 *
 * These rules only decide which signal is emphasised first. They never change
 * the underlying risk, eligibility, or configuration result.
 */

export const severityRank: Record<SignalSeverity, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
}

export function compareSignals(a: AttentionSignal, b: AttentionSignal): number {
  const bySeverity = severityRank[b.severity] - severityRank[a.severity]
  if (bySeverity !== 0) return bySeverity

  const byConfidence = (b.confidence ?? 0) - (a.confidence ?? 0)
  if (byConfidence !== 0) return byConfidence

  return Date.parse(b.detectedAt) - Date.parse(a.detectedAt)
}

/** Signals ordered the way the detail pages present them. */
export function rankSignals<T extends AttentionSignal>(signals: readonly T[]): T[] {
  return [...signals].sort(compareSignals)
}

/** The signal a detail page should lead with, or null when there are none. */
export function selectPrimarySignal<T extends AttentionSignal>(
  signals: readonly T[],
): T | null {
  return rankSignals(signals)[0] ?? null
}

const kycFocusLabels: Record<KycSignalType, string> = {
  sanctions_match: 'Possible sanctions match',
  document_mismatch: 'Document inconsistency',
  high_risk_jurisdiction: 'High-risk jurisdiction',
  duplicate_identity: 'Duplicate identity',
  address_verification_failure: 'Address verification failure',
  incomplete_evidence: 'Incomplete evidence',
}

const refundFocusLabels: Record<RefundSignalType, string> = {
  high_value: 'High value',
  possible_duplicate: 'Possible duplicate',
  elevated_fraud_signal: 'Elevated fraud signal',
  processor_failure: 'Processor failure',
  standard_request: 'Standard request',
}

const flagFocusLabels: Record<FlagSignalType, string> = {
  broad_production_exposure: 'Broad production exposure',
  recent_risky_change: 'Recent risky change',
  stale_flag: 'Stale flag',
  scheduled_rollout: 'Scheduled rollout',
  dependent_flag: 'Dependent flag',
  development_flag: 'Development flag',
}

export function kycFocusLabel(type: KycSignalType): string {
  return kycFocusLabels[type]
}

export function refundFocusLabel(type: RefundSignalType): string {
  return refundFocusLabels[type]
}

export function flagFocusLabel(type: FlagSignalType): string {
  return flagFocusLabels[type]
}
