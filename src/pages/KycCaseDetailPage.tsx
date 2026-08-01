import { useParams } from 'react-router'
import { AlertTriangle, FileText, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { RiskBadge, StatusBadge } from '@/components/shared/Badges'
import { EmptyState } from '@/components/shared/EmptyState'
import { ExpandableSection } from '@/components/shared/ExpandableSection'
import { PageBody, PageHeader } from '@/components/shared/PageHeader'
import { DetailList, Panel } from '@/components/shared/Panel'
import { ScaffoldNotice } from '@/components/shared/ScaffoldNotice'
import { findUser } from '@/data/users'
import { useAsyncData } from '@/hooks/useAsyncData'
import { explainFocusSelection, kycFocusLabel, rankSignals } from '@/logic/focus'
import { formatMoney, formatRelativeTime, titleCase } from '@/logic/format'
import { getKycCase } from '@/services/kycService'

export function KycCaseDetailPage() {
  const { caseId = '' } = useParams()
  const { data: kycCase, loading, error } = useAsyncData(() => getKycCase(caseId), [caseId])

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
            description={error?.message ?? `No synthetic case matches ${caseId}.`}
          />
        </Panel>
      </PageBody>
    )
  }

  const ranked = rankSignals(kycCase.riskSignals)
  const primary = ranked[0]
  const secondary = ranked.slice(1)
  const passedChecks = kycCase.verificationResults.filter((result) => result.outcome === 'passed').length

  return (
    <>
      <PageHeader
        title={kycCase.customerName}
        breadcrumbs={[
          { label: 'KYC Review', to: '/kyc' },
          { label: kycCase.id },
        ]}
        meta={
          <>
            <span className="font-mono text-xs text-muted-foreground">{kycCase.id}</span>
            <RiskBadge level={kycCase.overallRisk} />
            <StatusBadge status={kycCase.status} />
          </>
        }
        description={`Submitted ${formatRelativeTime(kycCase.submittedAt)} · ${
          findUser(kycCase.assigneeId)?.name ?? 'Unassigned'
        } · ${kycCase.country}`}
        actions={
          <>
            <Button variant="outline" size="sm" disabled>
              Request info
            </Button>
            <Button variant="outline" size="sm" disabled>
              Reject
            </Button>
            <Button size="sm" disabled>
              Approve
            </Button>
          </>
        }
      />
      <PageBody>
        {primary ? (
          <Panel
            emphasis="primary"
            title={
              <span className="flex flex-wrap items-center gap-2">
                <span className="text-label">Primary review focus</span>
                <span className="text-base font-semibold text-foreground">
                  {kycFocusLabel(primary.type)}
                </span>
              </span>
            }
            description={primary.headline}
            actions={
              <span className="text-xs text-muted-foreground">
                {primary.confidence !== undefined
                  ? `Confidence ${(primary.confidence * 100).toFixed(0)}%`
                  : 'Confidence not reported'}
              </span>
            }
            footer={`Why this is first: ${explainFocusSelection(kycCase.riskSignals)} Source: ${primary.source}.`}
          >
            <p className="text-sm text-foreground">{primary.explanation}</p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
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
                  <p className="mt-0.5 truncate text-sm text-foreground">{item.value}</p>
                </div>
              ))}
            </div>
          </Panel>
        ) : null}

        <div className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <Panel title="Customer financial picture" description="Declared profile compared with observed activity.">
            <DetailList
              columns={3}
              items={[
                { label: 'Declared income', value: formatMoney(kycCase.profile.declaredAnnualIncome) },
                { label: 'Monthly inflow', value: formatMoney(kycCase.transactionSummary.monthlyInflow), emphasis: true },
                { label: 'Monthly outflow', value: formatMoney(kycCase.transactionSummary.monthlyOutflow) },
                { label: 'Occupation', value: kycCase.profile.occupation },
                { label: 'Source of funds', value: kycCase.profile.sourceOfFunds },
                { label: 'Primary geographies', value: kycCase.transactionSummary.primaryGeographies.join(', ') },
              ]}
            />
            <ul className="mt-3 space-y-1.5 border-t pt-3">
              {kycCase.transactionSummary.observations.map((observation) => (
                <li key={observation} className="flex gap-2 text-sm text-foreground">
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" aria-hidden />
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
            title="Verification results"
            summary={`${passedChecks} of ${kycCase.verificationResults.length} checks passed`}
          >
            <ul className="divide-y">
              {kycCase.verificationResults.map((result) => (
                <li key={result.check} className="flex items-start justify-between gap-3 py-2 first:pt-0 last:pb-0">
                  <div className="min-w-0">
                    <p className="text-sm text-foreground">{result.check}</p>
                    <p className="text-xs text-muted-foreground">{result.detail}</p>
                  </div>
                  <StatusBadge status={result.outcome === 'passed' ? 'approved' : result.outcome} />
                </li>
              ))}
            </ul>
          </ExpandableSection>

          <ExpandableSection
            title="Documents"
            summary={`${kycCase.documents.length} submitted`}
          >
            <ul className="divide-y">
              {kycCase.documents.map((document) => (
                <li key={document.id} className="flex items-start gap-2 py-2 first:pt-0 last:pb-0">
                  <FileText className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
                  <div className="min-w-0">
                    <p className="truncate text-sm text-foreground">
                      {titleCase(document.type)} · <span className="font-mono text-xs">{document.fileName}</span>
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
            title="Linked identities"
            summary={
              kycCase.linkedIdentities.length === 0
                ? 'No related records'
                : `${kycCase.linkedIdentities.length} possible matches`
            }
            emphasis={primary?.type === 'duplicate_identity'}
            defaultOpen={primary?.type === 'duplicate_identity'}
          >
            {kycCase.linkedIdentities.length === 0 ? (
              <p className="text-sm text-muted-foreground">The identity graph returned no related records.</p>
            ) : (
              <ul className="space-y-2">
                {kycCase.linkedIdentities.map((identity) => (
                  <li key={identity.customerId} className="flex items-start gap-2 rounded border bg-surface-muted/50 px-3 py-2">
                    <Users className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
                    <div className="min-w-0">
                      <p className="text-sm text-foreground">
                        {identity.customerName}{' '}
                        <span className="font-mono text-xs text-muted-foreground">{identity.customerId}</span>
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Shares {identity.sharedAttributes.join(', ')} · match strength{' '}
                        {(identity.matchStrength * 100).toFixed(0)}% · account {identity.accountStatus}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </ExpandableSection>

          <ExpandableSection title="Accounts and balances" summary={`${kycCase.accounts.length} accounts`}>
            <ul className="divide-y">
              {kycCase.accounts.map((account) => (
                <li key={account.id} className="flex items-center justify-between py-2 first:pt-0 last:pb-0">
                  <span className="text-sm text-foreground">
                    {titleCase(account.product)}{' '}
                    <span className="font-mono text-xs text-muted-foreground">{account.id}</span>
                  </span>
                  <span className="text-sm tabular-nums text-foreground">{formatMoney(account.balance)}</span>
                </li>
              ))}
            </ul>
          </ExpandableSection>
        </div>

        <ScaffoldNotice
          planned={[
            'Type-specific focus panels for sanctions, document mismatch, jurisdiction, duplicates, and address failures',
            'Side-by-side evidence comparison with matching and conflicting fields called out',
            'Approve, reject, request-information, and note actions with required reasons and confirmation',
            'Notes, review history, and per-case activity timeline',
            'Next-case navigation that respects the current queue filter',
          ]}
          available={[
            'Deterministic focus selection with an explanation of why the signal ranked first',
            'Financial picture summarised before the evidence sections',
            'Progressive disclosure sections with compact collapsed summaries',
          ]}
        />
      </PageBody>
    </>
  )
}
