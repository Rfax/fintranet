import { useCallback, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { AlertTriangle, ArrowRight, FileText, Users } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { Pill, RiskBadge, SlaBadge, StatusBadge } from '@/components/shared/Badges'
import { ActivityTimeline } from '@/components/shared/ActivityTimeline'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { EmptyState } from '@/components/shared/EmptyState'
import { ExpandableSection } from '@/components/shared/ExpandableSection'
import { PageBody, PageHeader } from '@/components/shared/PageHeader'
import { DetailList, Panel } from '@/components/shared/Panel'
import { EvidencePanel } from '@/components/kyc/EvidencePanel'
import { findUser } from '@/data/users'
import { useAsyncData } from '@/hooks/useAsyncData'
import { toQueueFilters, useKycQueueFilters } from '@/hooks/useKycQueueFilters'
import { useSession } from '@/hooks/useSession'
import { kycFocusLabel, rankSignals } from '@/logic/focus'
import {
  formatDate,
  formatDuration,
  formatMoney,
  formatPercent,
  formatRelativeTime,
  slaState,
  titleCase,
} from '@/logic/format'
import { listActivity } from '@/services/activityService'
import {
  addKycNote,
  assignKycCase,
  decideKycCase,
  getKycCase,
  getNextCase,
  type KycDecision,
} from '@/services/kycService'

const decisionCopy: Record<
  KycDecision,
  { title: string; confirmLabel: string; description: string; destructive: boolean }
> = {
  approve: {
    title: 'Approve this case',
    confirmLabel: 'Approve case',
    description:
      'Approving closes the review and releases the customer for onboarding. A reason is optional but recorded.',
    destructive: false,
  },
  reject: {
    title: 'Reject this case',
    confirmLabel: 'Reject case',
    description:
      'Rejecting closes the review and blocks onboarding. The reason is recorded in the activity history.',
    destructive: true,
  },
  request_info: {
    title: 'Request more information',
    confirmLabel: 'Request information',
    description:
      'The case moves to "info requested" and stays in the queue. Describe exactly what the customer must provide.',
    destructive: false,
  },
}

function NextCaseButton({
  remaining,
  disabled,
  onClick,
  variant,
}: {
  remaining: number
  disabled: boolean
  onClick: () => void
  variant: 'ghost' | 'outline'
}) {
  return (
    <Button
      variant={variant}
      size="sm"
      disabled={disabled}
      onClick={onClick}
      title={disabled ? 'No other cases match the current queue filters' : undefined}
    >
      Next case
      <span className="ml-1.5 text-xs text-muted-foreground">
        {remaining === 0 ? 'none left' : `${remaining} left`}
      </span>
      <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
    </Button>
  )
}

export function KycCaseDetailPage() {
  const { caseId = '' } = useParams()
  const navigate = useNavigate()
  const { user } = useSession()
  const [decision, setDecision] = useState<KycDecision | null>(null)
  const [noteDraft, setNoteDraft] = useState('')
  const [savingNote, setSavingNote] = useState(false)
  const [queueFilters] = useKycQueueFilters()

  const {
    data: kycCase,
    loading,
    error,
    reload,
  } = useAsyncData(() => getKycCase(caseId), [caseId])
  const activity = useAsyncData(
    () => listActivity({ module: 'kyc', recordId: kycCase?.id ?? caseId }),
    [kycCase?.id, caseId],
  )
  const nextCase = useAsyncData(
    () => getNextCase(caseId, toQueueFilters(queueFilters)),
    [caseId, queueFilters, kycCase?.status],
  )

  const refresh = useCallback(() => {
    reload()
    activity.reload()
    nextCase.reload()
  }, [reload, activity, nextCase])

  const remainingCases = nextCase.data?.remaining ?? 0
  const nextCaseId = nextCase.data?.id ?? null

  const openNextCase = useCallback(() => {
    if (nextCaseId) navigate(`/kyc/${nextCaseId}`)
  }, [navigate, nextCaseId])

  if (loading) {
    return (
      <PageBody>
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-64 w-full" />
      </PageBody>
    )
  }

  if (error || !kycCase) {
    return (
      <PageBody>
        <Panel>
          <EmptyState
            icon={AlertTriangle}
            title="Case not found"
            description={error?.message ?? `No case matches ${caseId}.`}
          />
        </Panel>
      </PageBody>
    )
  }

  const ranked = rankSignals(kycCase.riskSignals)
  const primary = ranked[0]
  const secondary = ranked.slice(1)
  const passedChecks = kycCase.verificationResults.filter(
    (result) => result.outcome === 'passed',
  ).length
  const decided = kycCase.status === 'approved' || kycCase.status === 'rejected'
  const sla = slaState(kycCase.slaDueAt)
  const summary = kycCase.transactionSummary
  const assignee = findUser(kycCase.assigneeId)

  const submitDecision = async (reason: string) => {
    if (!decision) return
    try {
      await decideKycCase(kycCase.id, decision, reason, user.id)
      toast.success(
        decision === 'approve'
          ? `${kycCase.id} approved`
          : decision === 'reject'
            ? `${kycCase.id} rejected`
            : `Information requested on ${kycCase.id}`,
      )
      refresh()
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : 'The decision could not be recorded')
    } finally {
      setDecision(null)
    }
  }

  const submitNote = async () => {
    setSavingNote(true)
    try {
      await addKycNote(kycCase.id, noteDraft, user.id)
      setNoteDraft('')
      toast.success('Note added to the case')
      refresh()
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : 'The note could not be saved')
    } finally {
      setSavingNote(false)
    }
  }

  const takeCase = async () => {
    try {
      await assignKycCase(kycCase.id, user.id, user.id)
      toast.success(`${kycCase.id} assigned to you`)
      refresh()
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : 'The case could not be assigned')
    }
  }

  return (
    <>
      <PageHeader
        title={kycCase.customerName}
        breadcrumbs={[{ label: 'KYC Review', to: '/kyc' }, { label: kycCase.id }]}
        meta={
          <>
            <span className="font-mono text-xs text-muted-foreground">{kycCase.id}</span>
            <RiskBadge level={kycCase.overallRisk} />
            <StatusBadge status={kycCase.status} />
            <SlaBadge
              state={sla}
              label={
                sla === 'breached'
                  ? `Overdue ${formatDuration(Date.now() - Date.parse(kycCase.slaDueAt))}`
                  : `Due ${formatRelativeTime(kycCase.slaDueAt)}`
              }
            />
          </>
        }
        description={`Submitted ${formatRelativeTime(kycCase.submittedAt)} · ${
          assignee?.name ?? 'Unassigned'
        } · ${kycCase.country}`}
        actions={
          decided ? (
            <>
              <span className="text-xs text-muted-foreground">
                Decided {kycCase.completedAt ? formatRelativeTime(kycCase.completedAt) : ''} by{' '}
                {findUser(kycCase.decidedById ?? null)?.name ?? 'an operator'}
              </span>
              <NextCaseButton
                variant="outline"
                remaining={remainingCases}
                disabled={!nextCaseId}
                onClick={openNextCase}
              />
            </>
          ) : (
            <>
              {kycCase.assigneeId === user.id ? null : (
                <Button variant="ghost" size="sm" onClick={takeCase}>
                  Assign to me
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={() => setDecision('request_info')}>
                Request info
              </Button>
              <Button variant="outline" size="sm" onClick={() => setDecision('reject')}>
                Reject
              </Button>
              <Button size="sm" onClick={() => setDecision('approve')}>
                Approve
              </Button>
              <NextCaseButton
                variant="ghost"
                remaining={remainingCases}
                disabled={!nextCaseId}
                onClick={openNextCase}
              />
            </>
          )
        }
      />
      <PageBody>
        {decided && kycCase.decisionReason ? (
          <div className="rounded-md border border-navy-200 bg-navy-50/60 px-3.5 py-2.5 text-sm text-navy-900">
            <span className="font-medium">{titleCase(kycCase.status)}:</span>{' '}
            {kycCase.decisionReason}
          </div>
        ) : null}

        {primary ? (
          <div className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
            <EvidencePanel kycCase={kycCase} signal={primary} />
            <Panel
              title={kycFocusLabel(primary.type)}
              actions={
                <Pill tone={primary.severity === 'low' ? 'neutral' : 'warning'}>
                  {primary.confidence !== undefined
                    ? `Confidence ${(primary.confidence * 100).toFixed(0)}%`
                    : 'Confidence not reported'}
                </Pill>
              }
              footer={`Source: ${primary.source}. Detected ${formatRelativeTime(primary.detectedAt)}.`}
              bodyClassName="space-y-3 px-4 py-3"
            >
              <p className="text-sm font-medium text-foreground">{primary.headline}</p>
              <p className="text-sm text-muted-foreground">{primary.explanation}</p>
              <div className="space-y-1.5 border-t pt-3">
                <p className="text-label">Suggested evidence</p>
                {primary.evidence.map((item) => (
                  <div
                    key={`${item.label}-${item.value}`}
                    className={
                      item.conflicting
                        ? 'rounded border border-rose-200 bg-rose-50/70 px-2.5 py-1.5'
                        : 'rounded border bg-surface-muted/60 px-2.5 py-1.5'
                    }
                  >
                    <p className="text-label">{item.label}</p>
                    <p className="mt-0.5 text-sm text-foreground">{item.value}</p>
                  </div>
                ))}
              </div>
            </Panel>
          </div>
        ) : null}

        <div className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <Panel
            title="Customer financial picture"
            description="Declared profile compared with observed activity."
          >
            <DetailList
              columns={3}
              items={[
                {
                  label: 'Declared income',
                  value: formatMoney(kycCase.profile.declaredAnnualIncome),
                },
                {
                  label: 'Monthly inflow',
                  value: formatMoney(summary.monthlyInflow),
                  emphasis: true,
                },
                { label: 'Monthly outflow', value: formatMoney(summary.monthlyOutflow) },
                { label: 'Transactions / month', value: summary.monthlyTransactionCount },
                { label: 'Largest transfer', value: formatMoney(summary.largestSingleTransfer) },
                {
                  label: 'Cash / crypto share',
                  value: `${formatPercent(summary.cashSharePct)} / ${formatPercent(summary.cryptoSharePct)}`,
                },
                { label: 'Occupation', value: kycCase.profile.occupation },
                { label: 'Source of funds', value: kycCase.profile.sourceOfFunds },
                {
                  label: 'Primary geographies',
                  value: summary.primaryGeographies.join(', '),
                },
              ]}
            />
            <ul className="mt-3 space-y-1.5 border-t pt-3">
              {summary.observations.map((observation) => (
                <li key={observation} className="flex gap-2 text-sm text-foreground">
                  <AlertTriangle
                    className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600"
                    aria-hidden
                  />
                  {observation}
                </li>
              ))}
            </ul>
          </Panel>

          <Panel title="Secondary signals" description="Ordered by severity, then confidence.">
            {secondary.length === 0 ? (
              <EmptyState
                title="No secondary signals"
                description="Only one signal was raised for this case."
                className="py-6"
              />
            ) : (
              <ul className="space-y-2.5">
                {secondary.map((signal) => (
                  <li key={signal.id} className="rounded border bg-surface-muted/50 px-3 py-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium text-foreground">
                        {kycFocusLabel(signal.type)}
                      </span>
                      <RiskBadge level={signal.severity} />
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{signal.headline}</p>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>

        <div className="grid gap-3 lg:grid-cols-2">
          <ExpandableSection
            title="Customer profile"
            summary={`${kycCase.profile.nationality} · customer since ${formatDate(kycCase.profile.customerSince)}`}
          >
            <DetailList
              columns={2}
              items={[
                { label: 'Full name', value: kycCase.profile.fullName },
                { label: 'Date of birth', value: kycCase.profile.dateOfBirth },
                { label: 'Nationality', value: kycCase.profile.nationality },
                { label: 'Residence', value: kycCase.profile.residenceCountry },
                { label: 'Address', value: kycCase.profile.addressLine },
                { label: 'Email', value: kycCase.profile.email },
                { label: 'Phone', value: kycCase.profile.phone },
                { label: 'Customer since', value: formatDate(kycCase.profile.customerSince) },
              ]}
            />
          </ExpandableSection>

          <ExpandableSection
            title="Accounts and balances"
            summary={`${kycCase.accounts.length} accounts`}
          >
            <ul className="divide-y">
              {kycCase.accounts.map((account) => (
                <li
                  key={account.id}
                  className="flex items-center justify-between gap-3 py-2 first:pt-0 last:pb-0"
                >
                  <span className="min-w-0 truncate text-sm text-foreground">
                    {titleCase(account.product)}{' '}
                    <span className="font-mono text-xs text-muted-foreground">{account.id}</span>
                    <span className="ml-2 text-xs text-muted-foreground">
                      opened {formatDate(account.openedAt)}
                    </span>
                  </span>
                  <span className="flex shrink-0 items-center gap-2">
                    <Pill tone={account.status === 'active' ? 'neutral' : 'danger'}>
                      {titleCase(account.status)}
                    </Pill>
                    <span className="text-sm tabular-nums text-foreground">
                      {formatMoney(account.balance)}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </ExpandableSection>

          <ExpandableSection
            title="Counterparties and geographic exposure"
            summary={`${kycCase.counterparties.filter((entry) => entry.flagged).length} flagged of ${kycCase.counterparties.length}`}
            emphasis={primary?.type === 'high_risk_jurisdiction'}
          >
            <ul className="divide-y">
              {kycCase.counterparties.map((counterparty) => (
                <li
                  key={`${counterparty.name}-${counterparty.country}`}
                  className="flex items-start justify-between gap-3 py-2 first:pt-0 last:pb-0"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm text-foreground">
                      {counterparty.name}{' '}
                      <span className="font-mono text-xs text-muted-foreground">
                        {counterparty.country}
                      </span>
                    </p>
                    <p className="text-xs text-muted-foreground">{counterparty.relationship}</p>
                  </div>
                  <span className="flex shrink-0 items-center gap-2">
                    {counterparty.flagged ? <Pill tone="critical">Flagged</Pill> : null}
                    <span className="text-sm tabular-nums text-foreground">
                      {formatMoney(counterparty.volume, { compact: true })}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </ExpandableSection>

          <ExpandableSection
            title="Verification results"
            summary={`${passedChecks} of ${kycCase.verificationResults.length} checks passed`}
          >
            <ul className="divide-y">
              {kycCase.verificationResults.map((result) => (
                <li
                  key={result.check}
                  className="flex items-start justify-between gap-3 py-2 first:pt-0 last:pb-0"
                >
                  <div className="min-w-0">
                    <p className="text-sm text-foreground">{result.check}</p>
                    <p className="text-xs text-muted-foreground">
                      {result.detail} · {result.provider} ·{' '}
                      {formatRelativeTime(result.checkedAt)}
                    </p>
                  </div>
                  <StatusBadge
                    status={result.outcome === 'passed' ? 'approved' : result.outcome}
                  />
                </li>
              ))}
            </ul>
          </ExpandableSection>

          <ExpandableSection
            title="Documents"
            summary={`${kycCase.documents.length} submitted`}
            emphasis={primary?.type === 'document_mismatch'}
          >
            <ul className="divide-y">
              {kycCase.documents.map((document) => (
                <li key={document.id} className="flex items-start gap-2 py-2 first:pt-0 last:pb-0">
                  <FileText
                    className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground"
                    aria-hidden
                  />
                  <div className="min-w-0">
                    <p className="truncate text-sm text-foreground">
                      {titleCase(document.type)} ·{' '}
                      <span className="font-mono text-xs">{document.fileName}</span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {document.anomalies.length > 0
                        ? document.anomalies.join('; ')
                        : 'No extraction anomalies reported'}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </ExpandableSection>

          <ExpandableSection
            title="Linked identities and devices"
            summary={
              kycCase.linkedIdentities.length === 0
                ? 'No related records'
                : `${kycCase.linkedIdentities.length} possible matches`
            }
            emphasis={primary?.type === 'duplicate_identity'}
          >
            {kycCase.linkedIdentities.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                The identity graph returned no related records.
              </p>
            ) : (
              <ul className="space-y-2">
                {kycCase.linkedIdentities.map((identity) => (
                  <li
                    key={identity.customerId}
                    className="flex items-start gap-2 rounded border bg-surface-muted/50 px-3 py-2"
                  >
                    <Users
                      className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground"
                      aria-hidden
                    />
                    <div className="min-w-0">
                      <p className="text-sm text-foreground">
                        {identity.customerName}{' '}
                        <span className="font-mono text-xs text-muted-foreground">
                          {identity.customerId}
                        </span>
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Shares {identity.sharedAttributes.join(', ')} · match strength{' '}
                        {(identity.matchStrength * 100).toFixed(0)}% · account{' '}
                        {identity.accountStatus}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </ExpandableSection>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Panel title="Notes" description="Visible to every reviewer on this case.">
            <div className="space-y-2">
              <Textarea
                value={noteDraft}
                onChange={(event) => setNoteDraft(event.target.value)}
                placeholder="Record what you checked, what you found, and what remains open."
                className="min-h-[72px] text-sm"
              />
              <div className="flex justify-end">
                <Button
                  size="sm"
                  disabled={noteDraft.trim().length === 0 || savingNote}
                  onClick={submitNote}
                >
                  Add note
                </Button>
              </div>
            </div>
            {kycCase.notes.length === 0 ? (
              <p className="mt-3 border-t pt-3 text-sm text-muted-foreground">
                No notes on this case yet.
              </p>
            ) : (
              <ul className="mt-3 space-y-2.5 border-t pt-3">
                {kycCase.notes.map((note) => (
                  <li key={note.id}>
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-sm font-medium text-foreground">{note.authorName}</span>
                      <span className="text-xs text-muted-foreground">
                        {formatRelativeTime(note.createdAt)}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">{note.body}</p>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title="Case activity" description="Every decision and note recorded for this case.">
            <ActivityTimeline events={activity.data ?? []} showRecordLink={false} />
          </Panel>
        </div>
      </PageBody>

      {decision ? (
        <ConfirmDialog
          open
          onOpenChange={(open) => {
            if (!open) setDecision(null)
          }}
          title={decisionCopy[decision].title}
          description={decisionCopy[decision].description}
          confirmLabel={decisionCopy[decision].confirmLabel}
          destructive={decisionCopy[decision].destructive}
          requireReason={decision !== 'approve'}
          details={
            <div className="rounded border bg-surface-muted/60 px-3 py-2 text-sm">
              <p className="font-medium text-foreground">
                {kycCase.customerName}{' '}
                <span className="font-mono text-xs text-muted-foreground">{kycCase.id}</span>
              </p>
              <p className="text-xs text-muted-foreground">
                {kycCase.overallRisk} risk ·{' '}
                {primary ? kycFocusLabel(primary.type) : 'No dominant signal'} ·{' '}
                {passedChecks} of {kycCase.verificationResults.length} checks passed
              </p>
            </div>
          }
          onConfirm={submitDecision}
        />
      ) : null}
    </>
  )
}
