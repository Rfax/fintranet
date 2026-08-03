import { ArrowDown, CheckCircle2, CircleSlash } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Pill } from '@/components/shared/Badges'
import { decidedByLabel } from '@/logic/flagEvaluation'
import type { FlagEvaluation } from '@/types'

function ValueChip({ value }: { value: boolean | null }) {
  if (value === null) {
    return <span className="font-mono text-xs text-muted-foreground">—</span>
  }
  return (
    <span
      className={cn(
        'rounded px-1.5 py-0.5 font-mono text-xs',
        value ? 'bg-emerald-100 text-emerald-900' : 'bg-slate-200 text-slate-700',
      )}
    >
      {String(value)}
    </span>
  )
}

/**
 * The ordered resolution path behind an effective value: environment default,
 * global state, targeting, rollout, override, then the final value.
 */
export function EvaluationTrace({
  evaluation,
  className,
}: {
  evaluation: FlagEvaluation
  className?: string
}) {
  return (
    <ol className={cn('space-y-1', className)}>
      {evaluation.steps.map((step, index) => (
        <li key={step.kind}>
          <div
            className={cn(
              'flex items-start gap-2.5 rounded border px-3 py-2',
              step.matched
                ? 'border-navy-300 bg-navy-50/70'
                : 'border-transparent bg-surface-muted/50',
            )}
          >
            <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border bg-surface text-2xs font-semibold text-muted-foreground">
              {index + 1}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-medium text-foreground">{step.label}</span>
                <ValueChip value={step.value} />
                {step.matched ? (
                  <Pill tone="neutral" icon={CheckCircle2}>
                    Applied
                  </Pill>
                ) : null}
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">{step.detail}</p>
            </div>
          </div>
          {index < evaluation.steps.length - 1 ? (
            <ArrowDown className="mx-4 my-0.5 h-3 w-3 text-slate-300" aria-hidden />
          ) : null}
        </li>
      ))}
      <li>
        <ArrowDown className="mx-4 my-0.5 h-3 w-3 text-slate-300" aria-hidden />
        <div
          className={cn(
            'flex flex-wrap items-center justify-between gap-2 rounded border px-3 py-2',
            evaluation.value
              ? 'border-emerald-300 bg-emerald-50/70'
              : 'border-slate-300 bg-slate-50',
          )}
        >
          <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
            {evaluation.value ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-700" aria-hidden />
            ) : (
              <CircleSlash className="h-4 w-4 text-slate-500" aria-hidden />
            )}
            Effective value
          </span>
          <span className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              Decided by {decidedByLabel(evaluation.decidedBy)}
            </span>
            <ValueChip value={evaluation.value} />
          </span>
        </div>
      </li>
    </ol>
  )
}
