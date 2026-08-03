import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { cn } from '@/lib/utils'
import { formatMoney, titleCase } from '@/logic/format'
import type { RefundMetrics } from '@/types'

const axisStyle = { fontSize: 11, fill: 'hsl(215 16% 47%)' }
const gridStroke = 'hsl(214 32% 91%)'

const tooltipStyle = {
  fontSize: 12,
  borderRadius: 6,
  border: '1px solid hsl(214 32% 91%)',
  boxShadow: '0 4px 12px rgb(15 23 42 / 0.08)',
}

function shortDate(value: unknown): string {
  return new Date(`${String(value)}T00:00:00Z`).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  })
}

export function VolumeChart({ trend }: { trend: RefundMetrics['volumeTrend'] }) {
  return (
    <ResponsiveContainer width="100%" height={170}>
      <BarChart data={trend} margin={{ top: 4, right: 4, bottom: 0, left: -18 }}>
        <CartesianGrid stroke={gridStroke} vertical={false} />
        <XAxis dataKey="date" tickFormatter={shortDate} tick={axisStyle} tickLine={false} axisLine={false} />
        <YAxis tick={axisStyle} tickLine={false} axisLine={false} width={40} />
        <Tooltip
          contentStyle={tooltipStyle}
          labelFormatter={shortDate}
          cursor={{ fill: 'hsl(214 32% 91% / 0.4)' }}
          formatter={(value, _name, item) => [
            `${String(value)} requests · ${formatMoney(
              { amountMinor: Number(item?.payload?.amountMinor ?? 0), currency: 'USD' },
              { compact: true },
            )}`,
            'Refunds',
          ]}
        />
        <Bar dataKey="count" fill="hsl(215 45% 55%)" radius={[2, 2, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}

const reasonColors = [
  'bg-navy-600',
  'bg-sky-500',
  'bg-emerald-500',
  'bg-amber-400',
  'bg-orange-400',
  'bg-rose-500',
]

interface ReasonBreakdownProps {
  breakdown: RefundMetrics['reasonBreakdown']
  activeReason: string
  onSelect: (reason: string) => void
}

/** Reason mix, where each row filters the queue to that reason. */
export function ReasonBreakdown({ breakdown, activeReason, onSelect }: ReasonBreakdownProps) {
  const total = breakdown.reduce((sum, entry) => sum + entry.count, 0)

  return (
    <ul className="space-y-1.5">
      {breakdown.map((entry, index) => {
        const share = total === 0 ? 0 : (entry.count / total) * 100
        const active = activeReason === entry.reason
        return (
          <li key={entry.reason}>
            <button
              type="button"
              onClick={() => onSelect(active ? 'all' : entry.reason)}
              aria-pressed={active}
              className={cn(
                'w-full rounded border px-2.5 py-1.5 text-left transition-colors hover:border-navy-300 hover:bg-navy-50/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                active ? 'border-navy-400 bg-navy-50' : 'border-transparent',
              )}
            >
              <div className="flex items-baseline justify-between gap-2 text-sm">
                <span className="truncate text-foreground">{titleCase(entry.reason)}</span>
                <span className="shrink-0 tabular-nums text-muted-foreground">
                  {entry.count} ·{' '}
                  {formatMoney({ amountMinor: entry.amountMinor, currency: 'USD' }, { compact: true })}
                </span>
              </div>
              <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-surface-muted">
                <span
                  className={cn('block h-full', reasonColors[index % reasonColors.length])}
                  style={{ width: `${share}%` }}
                />
              </div>
            </button>
          </li>
        )
      })}
    </ul>
  )
}
