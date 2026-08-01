import { Compass } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Panel } from './Panel'

interface ScaffoldNoticeProps {
  /** What this route will do once the feature slice is implemented. */
  planned: string[]
  /** What the scaffolding already provides on this route. */
  available?: string[]
  className?: string
}

/**
 * Placeholder content for routes whose feature slice is not built yet. It
 * states the intent of the view instead of leaving the route blank.
 */
export function ScaffoldNotice({ planned, available, className }: ScaffoldNoticeProps) {
  return (
    <Panel
      title={
        <span className="flex items-center gap-2 text-sm font-semibold">
          <Compass className="h-4 w-4 text-navy-600" aria-hidden />
          Planned for this view
        </span>
      }
      description="Scaffolding placeholder. The shell, types, fixtures, and service layer below it are already in place."
      className={cn(className)}
    >
      <div className="grid gap-5 lg:grid-cols-2">
        <div>
          <p className="text-label">To be implemented</p>
          <ul className="mt-2 space-y-1.5">
            {planned.map((item) => (
              <li key={item} className="flex gap-2 text-sm text-foreground">
                <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-navy-400" aria-hidden />
                {item}
              </li>
            ))}
          </ul>
        </div>
        {available?.length ? (
          <div>
            <p className="text-label">Working today</p>
            <ul className="mt-2 space-y-1.5">
              {available.map((item) => (
                <li key={item} className="flex gap-2 text-sm text-muted-foreground">
                  <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" aria-hidden />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </Panel>
  )
}
