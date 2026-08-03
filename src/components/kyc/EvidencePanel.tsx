import {
  AlertTriangle,
  Check,
  FileWarning,
  Globe2,
  MapPinOff,
  ShieldAlert,
  Users,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Panel } from '@/components/shared/Panel'
import { Pill } from '@/components/shared/Badges'
import { formatDate, formatRelativeTime, titleCase } from '@/logic/format'
import type { FieldComparison, KycCase, KycRiskSignal, KycSignalType } from '@/types'

function ComparisonTable({
  rows,
  leftLabel,
  rightLabel,
}: {
  rows: FieldComparison[]
  leftLabel: string
  rightLabel: string
}) {
  return (
    <div className="overflow-hidden rounded border">
      <div className="grid grid-cols-[minmax(0,0.8fr)_minmax(0,1fr)_minmax(0,1fr)_auto] gap-2 border-b bg-surface-muted/70 px-3 py-1.5">
        <span className="text-label">Field</span>
        <span className="text-label">{leftLabel}</span>
        <span className="text-label">{rightLabel}</span>
        <span className="sr-only">Agreement</span>
      </div>
      {rows.map((row) => (
        <div
          key={row.field}
          className={cn(
            'grid grid-cols-[minmax(0,0.8fr)_minmax(0,1fr)_minmax(0,1fr)_auto] items-center gap-2 border-b px-3 py-1.5 text-sm last:border-b-0',
            !row.agrees && 'bg-rose-50/60',
          )}
        >
          <span className="truncate text-xs text-muted-foreground">{row.field}</span>
          <span className="truncate">{row.left}</span>
          <span className={cn('truncate', !row.agrees && 'font-medium text-rose-900')}>
            {row.right}
          </span>
          {row.agrees ? (
            <Check className="h-3.5 w-3.5 text-emerald-600" aria-label="Matches" />
          ) : (
            <X className="h-3.5 w-3.5 text-rose-600" aria-label="Conflicts" />
          )}
        </div>
      ))}
    </div>
  )
}

function Bullets({
  items,
  tone,
  title,
}: {
  items: string[]
  tone: 'strengthen' | 'weaken'
  title: string
}) {
  return (
    <div>
      <p className="text-label">{title}</p>
      <ul className="mt-1.5 space-y-1">
        {items.map((item) => (
          <li key={item} className="flex gap-2 text-sm text-foreground">
            <span
              className={cn(
                'mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full',
                tone === 'strengthen' ? 'bg-rose-500' : 'bg-emerald-500',
              )}
              aria-hidden
            />
            {item}
          </li>
        ))}
      </ul>
    </div>
  )
}

const panelMeta: Record<KycSignalType, { title: string; icon: typeof ShieldAlert }> = {
  sanctions_match: { title: 'Sanctions and PEP screening evidence', icon: ShieldAlert },
  document_mismatch: { title: 'Document versus profile comparison', icon: FileWarning },
  high_risk_jurisdiction: { title: 'Jurisdiction exposure', icon: Globe2 },
  duplicate_identity: { title: 'Linked identity evidence', icon: Users },
  address_verification_failure: { title: 'Address verification evidence', icon: MapPinOff },
  incomplete_evidence: { title: 'Outstanding evidence', icon: AlertTriangle },
}

interface EvidencePanelProps {
  kycCase: KycCase
  signal: KycRiskSignal
}

/**
 * The evidence a reviewer needs for the leading signal, shown in the shape that
 * matches that signal rather than a generic field list.
 */
export function EvidencePanel({ kycCase, signal }: EvidencePanelProps) {
  const meta = panelMeta[signal.type]
  const Icon = meta.icon

  const header = (
    <span className="flex items-center gap-2">
      <Icon className="h-4 w-4 text-navy-700" aria-hidden />
      <span className="text-sm font-semibold text-foreground">{meta.title}</span>
    </span>
  )

  if (signal.type === 'sanctions_match' && kycCase.sanctionsMatch) {
    const detail = kycCase.sanctionsMatch
    return (
      <Panel
        emphasis="primary"
        title={header}
        description={`${detail.listName} · screened ${formatRelativeTime(detail.screenedAt)}`}
        actions={
          <Pill tone={detail.nameMatchStrength >= 0.8 ? 'critical' : 'warning'}>
            Name match {(detail.nameMatchStrength * 100).toFixed(0)}%
          </Pill>
        }
        bodyClassName="space-y-3 px-4 py-3"
      >
        <ComparisonTable
          rows={detail.comparisons}
          leftLabel="Customer record"
          rightLabel="List entry"
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <p className="text-label">Listed entry</p>
            <p className="mt-0.5 text-sm text-foreground">{detail.entryName}</p>
            <p className="text-xs text-muted-foreground">
              Also known as {detail.entryAliases.join(', ')}
            </p>
          </div>
          <div>
            <p className="text-label">Entry notes</p>
            <p className="mt-0.5 text-sm text-foreground">{detail.entryNotes}</p>
          </div>
        </div>
      </Panel>
    )
  }

  if (signal.type === 'document_mismatch' && kycCase.documentComparison) {
    const detail = kycCase.documentComparison
    const conflicts = detail.comparisons.filter((row) => !row.agrees).length
    return (
      <Panel
        emphasis="primary"
        title={header}
        description={`${detail.documentType} ${detail.documentId}${
          detail.documentValidUntil ? ` · valid until ${formatDate(detail.documentValidUntil)}` : ''
        }`}
        actions={
          <Pill tone={conflicts > 1 ? 'critical' : 'warning'}>
            {conflicts} conflicting field{conflicts === 1 ? '' : 's'}
          </Pill>
        }
        bodyClassName="space-y-3 px-4 py-3"
      >
        <ComparisonTable
          rows={detail.comparisons}
          leftLabel="Submitted profile"
          rightLabel="Extracted from document"
        />
        <div>
          <p className="text-label">
            Extraction anomalies · confidence {(detail.extractionConfidence * 100).toFixed(0)}%
          </p>
          <ul className="mt-1.5 space-y-1">
            {detail.anomalies.map((anomaly) => (
              <li key={anomaly} className="flex gap-2 text-sm text-foreground">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" aria-hidden />
                {anomaly}
              </li>
            ))}
          </ul>
        </div>
      </Panel>
    )
  }

  if (signal.type === 'high_risk_jurisdiction' && kycCase.jurisdiction) {
    const detail = kycCase.jurisdiction
    return (
      <Panel
        emphasis="primary"
        title={header}
        description={`${detail.policyId} · ${detail.policyName}`}
        bodyClassName="space-y-3 px-4 py-3"
      >
        <p className="rounded border-l-2 border-navy-300 bg-surface-muted/60 px-3 py-2 text-sm text-foreground">
          {detail.policyStatement}
        </p>
        <div className="overflow-hidden rounded border">
          <div className="grid grid-cols-[auto_minmax(0,1.4fr)_minmax(0,1fr)_auto] gap-2 border-b bg-surface-muted/70 px-3 py-1.5">
            <span className="text-label">Country</span>
            <span className="text-label">Connection</span>
            <span className="text-label">Source</span>
            <span className="text-label">Tier</span>
          </div>
          {detail.connections.map((connection) => (
            <div
              key={`${connection.country}-${connection.connection}`}
              className="grid grid-cols-[auto_minmax(0,1.4fr)_minmax(0,1fr)_auto] items-center gap-2 border-b px-3 py-1.5 text-sm last:border-b-0"
            >
              <span className="font-mono text-xs">{connection.country}</span>
              <span className="truncate">{connection.connection}</span>
              <span className="truncate text-xs text-muted-foreground">{connection.source}</span>
              <Pill
                tone={
                  connection.tier === 'enhanced_diligence'
                    ? 'critical'
                    : connection.tier === 'monitored'
                      ? 'warning'
                      : 'neutral'
                }
              >
                {titleCase(connection.tier)}
              </Pill>
            </div>
          ))}
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Bullets items={detail.strengthening} tone="strengthen" title="Strengthens the concern" />
          <Bullets items={detail.weakening} tone="weaken" title="Weakens the concern" />
        </div>
      </Panel>
    )
  }

  if (signal.type === 'duplicate_identity' && kycCase.linkedIdentities.length > 0) {
    return (
      <Panel
        emphasis="primary"
        title={header}
        description="Records sharing identifying attributes with this applicant"
        bodyClassName="space-y-2 px-4 py-3"
      >
        {kycCase.linkedIdentities.map((identity) => (
          <div
            key={identity.customerId}
            className="rounded border bg-surface-muted/50 px-3 py-2"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm font-medium text-foreground">
                {identity.customerName}{' '}
                <span className="font-mono text-xs text-muted-foreground">
                  {identity.customerId}
                </span>
              </span>
              <div className="flex items-center gap-1.5">
                <Pill tone={identity.matchStrength >= 0.8 ? 'critical' : 'warning'}>
                  {(identity.matchStrength * 100).toFixed(0)}% match
                </Pill>
                <Pill tone={identity.accountStatus === 'active' ? 'neutral' : 'danger'}>
                  Account {identity.accountStatus}
                </Pill>
              </div>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Shares {identity.sharedAttributes.join(', ')}
              {identity.priorReviewOutcome ? ` · prior review: ${identity.priorReviewOutcome}` : ''}
            </p>
          </div>
        ))}
      </Panel>
    )
  }

  if (signal.type === 'address_verification_failure' && kycCase.addressVerification) {
    const detail = kycCase.addressVerification
    return (
      <Panel
        emphasis="primary"
        title={header}
        description={`${detail.provider} · checked ${formatRelativeTime(detail.checkedAt)}`}
        actions={<Pill tone="warning">{detail.mismatchedComponents.length} components unverified</Pill>}
        bodyClassName="space-y-3 px-4 py-3"
      >
        <div className="grid gap-2 sm:grid-cols-3">
          {[
            { label: 'Submitted', value: detail.submitted, tone: 'neutral' as const },
            { label: 'Normalized', value: detail.normalized, tone: 'neutral' as const },
            { label: 'Verified', value: detail.verified, tone: 'bad' as const },
          ].map((item) => (
            <div
              key={item.label}
              className={cn(
                'rounded border px-2.5 py-1.5',
                item.tone === 'bad' ? 'border-rose-200 bg-rose-50/70' : 'bg-surface-muted/60',
              )}
            >
              <p className="text-label">{item.label}</p>
              <p className="mt-0.5 text-sm text-foreground">{item.value}</p>
            </div>
          ))}
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <p className="text-label">Unverified components</p>
            <ul className="mt-1.5 space-y-1">
              {detail.mismatchedComponents.map((component) => (
                <li key={component} className="flex gap-2 text-sm text-foreground">
                  <X className="mt-0.5 h-3.5 w-3.5 shrink-0 text-rose-600" aria-hidden />
                  {component}
                </li>
              ))}
            </ul>
          </div>
          <div className="space-y-2">
            <div>
              <p className="text-label">Provider response</p>
              <p className="mt-0.5 font-mono text-xs text-foreground">{detail.providerResponse}</p>
            </div>
            <div>
              <p className="text-label">Supporting evidence on file</p>
              <p className="mt-0.5 text-sm text-foreground">
                {detail.evidenceSource}{' '}
                <span className="text-xs text-muted-foreground">
                  ({formatDate(detail.evidenceDate)})
                </span>
              </p>
            </div>
          </div>
        </div>
      </Panel>
    )
  }

  const outstanding = kycCase.verificationResults.filter(
    (result) => result.outcome !== 'passed',
  )

  return (
    <Panel
      emphasis="primary"
      title={header}
      description={
        signal.type === 'incomplete_evidence'
          ? 'No single dominant risk signal. Complete the outstanding checks before deciding.'
          : signal.headline
      }
      bodyClassName="space-y-3 px-4 py-3"
    >
      {outstanding.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Every verification check has passed. Review the financial picture and decide.
        </p>
      ) : (
        <ul className="divide-y">
          {outstanding.map((result) => (
            <li key={result.check} className="flex items-start justify-between gap-3 py-2 first:pt-0 last:pb-0">
              <div className="min-w-0">
                <p className="text-sm text-foreground">{result.check}</p>
                <p className="text-xs text-muted-foreground">{result.detail}</p>
              </div>
              <Pill tone={result.outcome === 'failed' ? 'critical' : 'warning'}>
                {titleCase(result.outcome)}
              </Pill>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  )
}
