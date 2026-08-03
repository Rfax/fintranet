import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { cn } from '@/lib/utils'
import type { KycTrendPoint } from '@/types'

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

export function IntakeChart({ trend }: { trend: KycTrendPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={180}>
      <BarChart data={trend} margin={{ top: 4, right: 4, bottom: 0, left: -18 }}>
        <CartesianGrid stroke={gridStroke} vertical={false} />
        <XAxis dataKey="date" tickFormatter={shortDate} tick={axisStyle} tickLine={false} axisLine={false} interval={2} />
        <YAxis tick={axisStyle} tickLine={false} axisLine={false} width={40} />
        <Tooltip
          contentStyle={tooltipStyle}
          labelFormatter={shortDate}
          cursor={{ fill: 'hsl(214 32% 91% / 0.4)' }}
        />
        <Legend wrapperStyle={{ fontSize: 11 }} iconType="square" iconSize={8} />
        <Bar dataKey="received" name="Received" fill="hsl(215 45% 55%)" radius={[2, 2, 0, 0]} />
        <Bar dataKey="completed" name="Completed" fill="hsl(160 60% 36%)" radius={[2, 2, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}

export function ReviewTimeChart({ trend }: { trend: KycTrendPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={180}>
      <AreaChart data={trend} margin={{ top: 4, right: 4, bottom: 0, left: -18 }}>
        <defs>
          <linearGradient id="reviewTime" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="hsl(215 45% 55%)" stopOpacity={0.35} />
            <stop offset="100%" stopColor="hsl(215 45% 55%)" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke={gridStroke} vertical={false} />
        <XAxis dataKey="date" tickFormatter={shortDate} tick={axisStyle} tickLine={false} axisLine={false} interval={2} />
        <YAxis tick={axisStyle} tickLine={false} axisLine={false} width={40} unit="m" />
        <Tooltip
          contentStyle={tooltipStyle}
          labelFormatter={shortDate}
          formatter={(value) => [`${String(value)} min`, 'Average review time']}
        />
        <Area
          type="monotone"
          dataKey="averageReviewMinutes"
          stroke="hsl(215 45% 45%)"
          strokeWidth={2}
          fill="url(#reviewTime)"
        />
        <Line type="monotone" dataKey="averageReviewMinutes" stroke="transparent" dot={false} />
      </AreaChart>
    </ResponsiveContainer>
  )
}

export interface Segment {
  id: string
  label: string
  count: number
  className: string
  active?: boolean
}

interface SegmentBarProps {
  segments: Segment[]
  onSelect: (id: string) => void
  emptyLabel: string
}

/** Clickable backlog split: each segment applies its own queue filter. */
export function SegmentBar({ segments, onSelect, emptyLabel }: SegmentBarProps) {
  const total = segments.reduce((sum, segment) => sum + segment.count, 0)

  if (total === 0) {
    return <p className="text-xs text-muted-foreground">{emptyLabel}</p>
  }

  return (
    <div className="space-y-2">
      <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-surface-muted">
        {segments
          .filter((segment) => segment.count > 0)
          .map((segment) => (
            <span
              key={segment.id}
              className={cn('h-full', segment.className)}
              style={{ width: `${(segment.count / total) * 100}%` }}
              title={`${segment.label}: ${segment.count}`}
            />
          ))}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {segments.map((segment) => (
          <button
            key={segment.id}
            type="button"
            onClick={() => onSelect(segment.id)}
            aria-pressed={segment.active ?? false}
            className={cn(
              'inline-flex items-center gap-1.5 rounded border px-2 py-1 text-xs transition-colors hover:border-navy-300 hover:bg-navy-50/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              segment.active ? 'border-navy-400 bg-navy-50 font-medium text-navy-900' : 'border-border',
            )}
          >
            <span className={cn('h-2 w-2 rounded-sm', segment.className)} aria-hidden />
            {segment.label}
            <span className="font-mono text-muted-foreground">{segment.count}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
