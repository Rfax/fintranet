import type { LucideIcon } from 'lucide-react'
import {
  AlertOctagon,
  AlertTriangle,
  CheckCircle2,
  CircleDashed,
  Clock,
  Info,
  MinusCircle,
  ShieldAlert,
  XCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { titleCase } from '@/logic/format'
import type { RiskLevel } from '@/types'

type Tone = 'neutral' | 'info' | 'positive' | 'warning' | 'danger' | 'critical'

const toneClasses: Record<Tone, string> = {
  neutral: 'border-slate-200 bg-slate-50 text-slate-700',
  info: 'border-sky-200 bg-sky-50 text-sky-800',
  positive: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  warning: 'border-amber-200 bg-amber-50 text-amber-900',
  danger: 'border-orange-200 bg-orange-50 text-orange-900',
  critical: 'border-rose-200 bg-rose-50 text-rose-800',
}

interface PillProps {
  icon?: LucideIcon
  tone?: Tone
  children: React.ReactNode
  className?: string
  title?: string
}

/**
 * Every status pill pairs colour with an icon and a word so colour is never
 * the only carrier of meaning.
 */
export function Pill({ icon: Icon, tone = 'neutral', children, className, title }: PillProps) {
  return (
    <span
      title={title}
      className={cn(
        'inline-flex items-center gap-1.5 rounded border px-1.5 py-0.5 text-xs font-medium leading-5',
        toneClasses[tone],
        className,
      )}
    >
      {Icon ? <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden /> : null}
      {children}
    </span>
  )
}

const riskConfig: Record<RiskLevel, { tone: Tone; icon: LucideIcon; label: string }> = {
  critical: { tone: 'critical', icon: AlertOctagon, label: 'Critical' },
  high: { tone: 'danger', icon: ShieldAlert, label: 'High' },
  medium: { tone: 'warning', icon: AlertTriangle, label: 'Medium' },
  low: { tone: 'positive', icon: CheckCircle2, label: 'Low' },
}

export function RiskBadge({ level, className }: { level: RiskLevel; className?: string }) {
  const config = riskConfig[level]
  return (
    <Pill icon={config.icon} tone={config.tone} className={className}>
      {config.label}
    </Pill>
  )
}

const statusTones: Record<string, { tone: Tone; icon: LucideIcon }> = {
  awaiting_review: { tone: 'info', icon: Clock },
  in_review: { tone: 'info', icon: CircleDashed },
  info_requested: { tone: 'warning', icon: Info },
  approved: { tone: 'positive', icon: CheckCircle2 },
  rejected: { tone: 'critical', icon: XCircle },
  pending_review: { tone: 'info', icon: Clock },
  awaiting_second_approval: { tone: 'warning', icon: CircleDashed },
  processing: { tone: 'info', icon: CircleDashed },
  completed: { tone: 'positive', icon: CheckCircle2 },
  failed: { tone: 'critical', icon: AlertOctagon },
  enabled: { tone: 'positive', icon: CheckCircle2 },
  disabled: { tone: 'neutral', icon: MinusCircle },
}

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const config = statusTones[status] ?? { tone: 'neutral' as Tone, icon: CircleDashed }
  return (
    <Pill icon={config.icon} tone={config.tone} className={className}>
      {titleCase(status)}
    </Pill>
  )
}

export function SlaBadge({
  state,
  label,
  className,
}: {
  state: 'breached' | 'due_soon' | 'on_track'
  label: string
  className?: string
}) {
  const config = {
    breached: { tone: 'critical' as Tone, icon: AlertOctagon, title: 'Past the review deadline' },
    due_soon: { tone: 'warning' as Tone, icon: Clock, title: 'Due within 8 hours' },
    on_track: { tone: 'neutral' as Tone, icon: Clock, title: 'Within the review window' },
  }[state]

  return (
    <Pill icon={config.icon} tone={config.tone} className={className} title={config.title}>
      {label}
    </Pill>
  )
}
