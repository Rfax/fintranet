import { useState } from 'react'
import { Link } from 'react-router'
import { Bug, Check, ChevronRight, Copy } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/shared/EmptyState'
import { FilterBar, FilterSelect } from '@/components/shared/FilterBar'
import { PageBody, PageHeader } from '@/components/shared/PageHeader'
import { DetailList, Panel } from '@/components/shared/Panel'
import { EnvironmentSelect } from '@/components/flags/EnvironmentSelect'
import { EvaluationTrace } from '@/components/flags/EvaluationTrace'
import { useAsyncData } from '@/hooks/useAsyncData'
import { useFlagEnvironment } from '@/hooks/useFlagEnvironment'
import { decidedByLabel, evaluationSummaryText } from '@/logic/flagEvaluation'
import { evaluateForUser, listFlagUsers } from '@/services/flagService'

const valueOptions = [
  { value: 'all', label: 'Any value' },
  { value: 'true', label: 'Resolves true' },
  { value: 'false', label: 'Resolves false' },
]

export function FlagDebuggerPage() {
  const [environment, setEnvironment] = useFlagEnvironment()
  const [userId, setUserId] = useState('')
  const [search, setSearch] = useState('')
  const [valueFilter, setValueFilter] = useState('all')
  const [expandedKey, setExpandedKey] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const users = useAsyncData(() => listFlagUsers(), [])
  const selectedUser = users.data?.find((user) => user.id === userId) ?? null
  const evaluations = useAsyncData(
    () => (selectedUser ? evaluateForUser(selectedUser.id, environment, search) : Promise.resolve([])),
    [selectedUser?.id, environment, search],
  )

  const rows = (evaluations.data ?? []).filter(
    (evaluation) => valueFilter === 'all' || String(evaluation.value) === valueFilter,
  )
  const expanded = rows.find((evaluation) => evaluation.flagKey === expandedKey) ?? rows[0] ?? null

  const copySummary = async () => {
    if (!expanded || !selectedUser) return
    await navigator.clipboard.writeText(evaluationSummaryText(expanded, selectedUser))
    setCopied(true)
    setTimeout(() => setCopied(false), 1_500)
    toast.success('Debugging summary copied')
  }

  return (
    <>
      <PageHeader
        title="Effective-flag debugger"
        breadcrumbs={[{ label: 'Feature Flags', to: '/flags' }, { label: 'Debugger' }]}
        description="Resolve what a specific user actually sees, and which rule decided it, instead of reading a flag as simply on or off."
        actions={<EnvironmentSelect value={environment} onChange={setEnvironment} />}
      />
      <PageBody>
        <Panel
          title="Select a user"
          description={`Every flag is resolved against the ${environment} configuration.`}
        >
          <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
            <FilterSelect
              label="User"
              value={userId}
              onChange={setUserId}
              placeholder="Choose a user"
              triggerClassName="w-[260px]"
              options={(users.data ?? []).map((user) => ({
                value: user.id,
                label: `${user.name} (${user.id})`,
              }))}
            />
            {selectedUser ? (
              <DetailList
                className="flex-1"
                columns={4}
                items={[
                  { label: 'Email', value: selectedUser.email },
                  { label: 'Plan', value: selectedUser.plan },
                  { label: 'Country', value: selectedUser.country },
                  { label: 'Segments', value: selectedUser.segments.join(', ') || 'None' },
                ]}
              />
            ) : null}
          </div>
        </Panel>

        {selectedUser ? (
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
            <Panel
              title="Effective values"
              description={`${rows.length} flags resolved for ${selectedUser.name}.`}
              bodyClassName="p-0"
            >
              <FilterBar
                search={{
                  value: search,
                  onChange: setSearch,
                  placeholder: 'Search flag name or key',
                }}
              >
                <FilterSelect
                  label="Value"
                  value={valueFilter}
                  onChange={setValueFilter}
                  options={valueOptions}
                  triggerClassName="w-[150px]"
                />
              </FilterBar>
              {rows.length === 0 ? (
                <EmptyState
                  icon={Bug}
                  title="No flags match"
                  description="Clear the search or value filter to see the full resolved set."
                  className="py-8"
                />
              ) : (
                <ul className="divide-y">
                  {rows.map((evaluation) => {
                    const active = expanded?.flagKey === evaluation.flagKey
                    return (
                      <li key={evaluation.flagKey}>
                        <button
                          type="button"
                          onClick={() => setExpandedKey(evaluation.flagKey)}
                          aria-pressed={active}
                          className={cn(
                            'flex w-full items-center gap-3 px-3 py-2 text-left transition-colors hover:bg-surface-muted/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring',
                            active && 'bg-navy-50',
                          )}
                        >
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm text-foreground">
                              {evaluation.flagName}
                            </span>
                            <span className="block truncate font-mono text-xs text-muted-foreground">
                              {evaluation.flagKey}
                            </span>
                          </span>
                          <span
                            className={cn(
                              'shrink-0 rounded px-1.5 py-0.5 font-mono text-xs',
                              evaluation.value
                                ? 'bg-emerald-100 text-emerald-900'
                                : 'bg-slate-200 text-slate-700',
                            )}
                          >
                            {String(evaluation.value)}
                          </span>
                          <ChevronRight
                            className="h-3.5 w-3.5 shrink-0 text-muted-foreground"
                            aria-hidden
                          />
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}
            </Panel>

            {expanded ? (
              <Panel
                title={
                  <span className="flex flex-col">
                    <span className="text-label">Evaluation trace</span>
                    <span className="text-base font-semibold text-foreground">
                      {expanded.flagName}
                    </span>
                  </span>
                }
                description={`Decided by ${decidedByLabel(expanded.decidedBy)} for ${selectedUser.name} in ${environment}.`}
                actions={
                  <span className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={copySummary}>
                      {copied ? (
                        <Check className="mr-1 h-3.5 w-3.5" />
                      ) : (
                        <Copy className="mr-1 h-3.5 w-3.5" />
                      )}
                      Copy summary
                    </Button>
                    <Link
                      to={`/flags/${expanded.flagKey}`}
                      className="text-xs text-navy-700 underline-offset-2 hover:underline"
                    >
                      Open flag
                    </Link>
                  </span>
                }
              >
                <EvaluationTrace evaluation={expanded} />
              </Panel>
            ) : null}
          </div>
        ) : (
          <Panel>
            <EmptyState
              icon={Bug}
              title="No user selected"
              description="Pick a user above to resolve every flag that applies to them, with the rule that decided each value."
            />
          </Panel>
        )}
      </PageBody>
    </>
  )
}
