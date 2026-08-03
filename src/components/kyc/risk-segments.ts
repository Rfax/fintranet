import type { RiskLevel } from '@/types'

export const riskSegmentClasses: Record<RiskLevel, string> = {
  critical: 'bg-rose-500',
  high: 'bg-orange-400',
  medium: 'bg-amber-400',
  low: 'bg-emerald-500',
}
