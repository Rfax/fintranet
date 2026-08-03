import { useMemo, useState } from 'react'
import { RotateCcw } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { ActivityTimeline } from '@/components/shared/ActivityTimeline'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { FilterBar, FilterSelect } from '@/components/shared/FilterBar'
import { MetricCard, MetricRow } from '@/components/shared/MetricCard'
import { PageBody, PageHeader } from '@/components/shared/PageHeader'
import { Panel } from '@/components/shared/Panel'
import { appUsers } from '@/data/users'
import { useAsyncData } from '@/hooks/useAsyncData'
import { clearRecordedActivity, listActivity } from '@/services/activityService'
import type { ActivityModule } from '@/types'

const moduleOptions = [
  { value: 'all', label: 'All modules' },
  { value: 'kyc', label: 'KYC' },
  { value: 'refunds', label: 'Refunds' },
  { value: 'flags', label: 'Feature flags' },
]

export function ActivityPage() {
  const [search, setSearch] = useState('')
  const [module, setModule] = useState('all')
  const [actor, setActor] = useState('all')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [confirmOpen, setConfirmOpen] = useState(false)

  const activity = useAsyncData(
    () =>
      listActivity({
        search,
        module: module === 'all' ? undefined : (module as ActivityModule),
        actorId: actor === 'all' ? undefined : actor,
        from: from || undefined,
        to: to || undefined,
      }),
    [search, module, actor, from, to],
  )

  const actorOptions = useMemo(
    () => [
      { value: 'all', label: 'All actors' },
      ...appUsers.map((user) => ({ value: user.id, label: user.name })),
    ],
    [],
  )

  const events = activity.data ?? []
  const counts = {
    kyc: events.filter((event) => event.module === 'kyc').length,
    refunds: events.filter((event) => event.module === 'refunds').length,
    flags: events.filter((event) => event.module === 'flags').length,
  }
  const filtersActive =
    Boolean(search) || module !== 'all' || actor !== 'all' || Boolean(from) || Boolean(to)

  return (
    <>
      <PageHeader
        title="Activity history"
        breadcrumbs={[{ label: 'Activity' }]}
        description="Decisions and configuration changes across all three modules, with actor, reason, and before/after values."
        actions={
          <Button variant="outline" size="sm" onClick={() => setConfirmOpen(true)}>
            Clear locally recorded events
          </Button>
        }
      />
      <PageBody>
        <MetricRow>
          <MetricCard label="Events" value={events.length} hint="Matching the current filters" />
          <MetricCard
            label="KYC decisions"
            value={counts.kyc}
            onClick={() => setModule('kyc')}
            hint="Select to filter"
          />
          <MetricCard
            label="Refund actions"
            value={counts.refunds}
            onClick={() => setModule('refunds')}
            hint="Select to filter"
          />
          <MetricCard
            label="Flag changes"
            value={counts.flags}
            onClick={() => setModule('flags')}
            hint="Select to filter"
          />
        </MetricRow>

        <Panel title="Combined timeline" bodyClassName="p-0">
          <FilterBar
            search={{
              value: search,
              onChange: setSearch,
              placeholder: 'Search record, actor, or action',
            }}
            trailing={
              filtersActive ? (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 text-xs"
                  onClick={() => {
                    setSearch('')
                    setModule('all')
                    setActor('all')
                    setFrom('')
                    setTo('')
                  }}
                >
                  <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                  Clear filters
                </Button>
              ) : null
            }
          >
            <FilterSelect
              label="Module"
              value={module}
              onChange={setModule}
              options={moduleOptions}
              triggerClassName="w-[160px]"
            />
            <FilterSelect
              label="Actor"
              value={actor}
              onChange={setActor}
              options={actorOptions}
              triggerClassName="w-[180px]"
            />
            <div className="space-y-1">
              <Label htmlFor="activity-from" className="text-label">
                From
              </Label>
              <Input
                id="activity-from"
                type="date"
                value={from}
                onChange={(event) => setFrom(event.target.value)}
                className="h-8 w-[150px] text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="activity-to" className="text-label">
                To
              </Label>
              <Input
                id="activity-to"
                type="date"
                value={to}
                onChange={(event) => setTo(event.target.value)}
                className="h-8 w-[150px] text-sm"
              />
            </div>
          </FilterBar>
          <div className="px-4 py-4">
            {activity.loading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, index) => (
                  <Skeleton key={index} className="h-12 w-full" />
                ))}
              </div>
            ) : (
              <ActivityTimeline events={events} />
            )}
          </div>
        </Panel>
      </PageBody>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Clear locally recorded activity?"
        description="Removes the events this browser recorded. Earlier history is unaffected."
        confirmLabel="Clear events"
        destructive
        onConfirm={() => {
          void clearRecordedActivity().then(() => {
            activity.reload()
            toast.success('Locally recorded activity cleared')
          })
        }}
      />
    </>
  )
}
