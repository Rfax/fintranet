import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ActivityTimeline } from '@/components/shared/ActivityTimeline'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { FilterBar, FilterSelect } from '@/components/shared/FilterBar'
import { PageBody, PageHeader } from '@/components/shared/PageHeader'
import { Panel } from '@/components/shared/Panel'
import { PrototypeNotice } from '@/components/shared/EnvironmentWarning'
import { ScaffoldNotice } from '@/components/shared/ScaffoldNotice'
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
  const [confirmOpen, setConfirmOpen] = useState(false)

  const activity = useAsyncData(
    () =>
      listActivity({
        search,
        module: module === 'all' ? undefined : (module as ActivityModule),
      }),
    [search, module],
  )

  return (
    <>
      <PageHeader
        title="Activity history"
        breadcrumbs={[{ label: 'Activity' }]}
        description="Actions from all three modules with actor, reason, and before/after values. This is a prototype history, not a compliance-grade audit log."
        actions={
          <Button variant="outline" size="sm" onClick={() => setConfirmOpen(true)}>
            Clear locally recorded events
          </Button>
        }
      />
      <PageBody>
        <PrototypeNotice />

        <Panel title="Combined timeline" bodyClassName="p-0">
          <FilterBar
            search={{ value: search, onChange: setSearch, placeholder: 'Search record, actor, or action' }}
          >
            <FilterSelect label="Module" value={module} onChange={setModule} options={moduleOptions} />
          </FilterBar>
          <div className="px-4 py-4">
            {activity.loading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, index) => (
                  <Skeleton key={index} className="h-12 w-full" />
                ))}
              </div>
            ) : (
              <ActivityTimeline events={activity.data ?? []} />
            )}
          </div>
        </Panel>

        <ScaffoldNotice
          planned={[
            'Events generated automatically by every consequential action in the three modules',
            'Per-record timelines embedded in case, refund, and flag detail views',
            'Filtering by actor and date range',
          ]}
          available={[
            'Seeded cross-module history with reasons and before/after diffs',
            'Events recorded during a session persist in localStorage and can be cleared',
          ]}
        />
      </PageBody>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Clear locally recorded activity?"
        description="Removes events this browser recorded during prototype sessions. Seeded synthetic history is unaffected."
        confirmLabel="Clear events"
        destructive
        onConfirm={() => {
          void clearRecordedActivity().then(() => {
            activity.reload()
            toast.success('Locally recorded activity cleared', {
              description: 'Seeded synthetic events remain in the timeline.',
            })
          })
        }}
      />
    </>
  )
}
