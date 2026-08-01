import { useState } from 'react'
import { Link } from 'react-router'
import { Bug } from 'lucide-react'
import { PageBody, PageHeader } from '@/components/shared/PageHeader'
import { DetailList, Panel } from '@/components/shared/Panel'
import { ScaffoldNotice } from '@/components/shared/ScaffoldNotice'
import { FilterSelect } from '@/components/shared/FilterBar'
import { EmptyState } from '@/components/shared/EmptyState'
import { useAsyncData } from '@/hooks/useAsyncData'
import { useSession } from '@/hooks/useSession'
import { listFlags, listSyntheticUsers } from '@/services/flagService'

const evaluationOrder = [
  'Environment default',
  'Global state',
  'Matching group or segment',
  'Percentage rollout result',
  'User-specific override',
  'Final effective value',
]

export function FlagDebuggerPage() {
  const { environment } = useSession()
  const users = useAsyncData(() => listSyntheticUsers(), [])
  const flags = useAsyncData(() => listFlags(), [])
  const [userId, setUserId] = useState('')

  const selectedUser = users.data?.find((user) => user.id === userId)

  return (
    <>
      <PageHeader
        title="Effective-flag debugger"
        breadcrumbs={[{ label: 'Feature Flags', to: '/flags' }, { label: 'Debugger' }]}
        description="Resolve what a specific synthetic user actually sees, and why, instead of reading a flag as simply on or off."
      />
      <PageBody>
        <Panel
          title="Select a synthetic user"
          description={`Evaluation is simulated against the ${environment} environment and does not use the runtime SDK.`}
        >
          <div className="flex flex-wrap items-end gap-3">
            <FilterSelect
              label="User"
              value={userId}
              onChange={setUserId}
              options={[
                { value: '', label: 'Choose a user' },
                ...(users.data ?? []).map((user) => ({
                  value: user.id,
                  label: `${user.name} (${user.id})`,
                })),
              ]}
            />
            {selectedUser ? (
              <DetailList
                className="flex-1"
                columns={3}
                items={[
                  { label: 'Plan', value: selectedUser.plan },
                  { label: 'Country', value: selectedUser.country },
                  {
                    label: 'Segments',
                    value: selectedUser.segments.join(', ') || 'None',
                  },
                ]}
              />
            ) : null}
          </div>
        </Panel>

        <Panel
          title="Effective values"
          description={
            selectedUser
              ? `${flags.data?.length ?? 0} flags would be resolved for ${selectedUser.name}.`
              : 'Choose a user to resolve every relevant flag.'
          }
        >
          {selectedUser ? (
            <ul className="space-y-1.5">
              {(flags.data ?? []).map((flag) => (
                <li
                  key={flag.key}
                  className="flex items-center justify-between gap-3 rounded border bg-surface-muted/50 px-3 py-2"
                >
                  <Link to={`/flags/${flag.key}`} className="min-w-0">
                    <span className="block truncate text-sm text-foreground">{flag.name}</span>
                    <span className="block truncate font-mono text-xs text-muted-foreground">{flag.key}</span>
                  </Link>
                  <span className="shrink-0 rounded border border-dashed px-2 py-0.5 text-xs text-muted-foreground">
                    Evaluation pending implementation
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              icon={Bug}
              title="No user selected"
              description="Pick one of the synthetic users above to see the flags that apply to them."
            />
          )}
        </Panel>

        <Panel title="Planned evaluation trace" description="Each step will show the rule that produced the value.">
          <ol className="space-y-1.5">
            {evaluationOrder.map((step, index) => (
              <li key={step} className="flex items-center gap-2.5 text-sm text-foreground">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border bg-surface text-2xs font-semibold text-muted-foreground">
                  {index + 1}
                </span>
                {step}
              </li>
            ))}
          </ol>
        </Panel>

        <ScaffoldNotice
          planned={[
            'Ordered evaluation trace naming the rule that determined the result',
            'Search and filtering across a user\u2019s resolved flag set',
            'Copyable debugging summary for sharing in a ticket',
            '"My flags" view for the mock signed-in user with safe personal overrides',
          ]}
          available={[
            'Synthetic user directory and flag inventory served by the service layer',
            'Clear statement that evaluation is simulated rather than SDK-accurate',
          ]}
        />
      </PageBody>
    </>
  )
}
