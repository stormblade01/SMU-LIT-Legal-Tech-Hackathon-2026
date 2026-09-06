'use client'

import { BadgeCheck, ClipboardCopy, Eye, ShieldCheck } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

/**
 * Evidence-traceable value: the AI also reports WHERE the fact came from
 * (a named attached document, or a user statement). The UI renders it as
 * "[Source: Invoice_IMG_123.jpg]" so nothing appears fabricated — aligning
 * with the Singapore Courts' Guide on the Use of Generative AI.
 */
export interface Valued<T> {
  value: T
  source: string
}

export interface CJTSFormData {
  disputeType?: Valued<string>
  claimantName?: Valued<string>
  claimantContact?: Valued<string>
  respondentName?: Valued<string>
  respondentAddress?: Valued<string>
  dateOfDispute?: Valued<string>
  claimAmount?: Valued<number>
  claimSummary?: string
  evidenceList?: string[]
}

const FIELD_LABELS: Record<keyof CJTSFormData, string> = {
  disputeType: 'Dispute Type',
  claimantName: 'Claimant Name',
  claimantContact: 'Claimant Contact',
  respondentName: 'Respondent Name',
  respondentAddress: 'Respondent Address',
  dateOfDispute: 'Date of Dispute',
  claimAmount: 'Claim Amount (SGD)',
  claimSummary: 'Claim Summary / Timeline',
  evidenceList: 'Evidence List',
}

function SourceTag({ source }: { source?: string }) {
  if (!source) return null
  return (
    <span className="mt-1.5 inline-flex max-w-full items-center gap-1 rounded-md bg-primary/5 px-1.5 py-0.5 text-[0.66rem] leading-snug text-muted-foreground ring-1 ring-primary/10">
      <span className="font-semibold uppercase tracking-wide text-primary/70">Source:</span>
      <span className="truncate">{source}</span>
    </span>
  )
}

function Field({
  label,
  children,
  source,
}: {
  label: string
  children?: React.ReactNode
  source?: string
}) {
  const isEmpty = children === undefined || children === null || children === ''
  return (
    <div className="rounded-lg border border-border bg-muted/40 px-3 py-2.5">
      <p className="text-[0.66rem] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      {isEmpty ? (
        <p className="mt-1 text-[0.8rem] italic text-muted-foreground/60">
          Awaiting information…
        </p>
      ) : (
        <div className="mt-1 flex flex-col">
          <div className="text-[0.86rem] font-semibold leading-snug text-foreground">
            {children}
          </div>
          <SourceTag source={source} />
        </div>
      )}
    </div>
  )
}

export function buildCJTSFormText(data: CJTSFormData): string {
  const amount = data.claimAmount
    ? `$${data.claimAmount.value.toLocaleString('en-SG', { maximumFractionDigits: 2 })}`
    : '—'
  const rows: string[] = [
    'DRAFT CJTS CLAIM (VERIFIED)',
    '— — — — — — — — — — — —',
    `Dispute Type:        ${data.disputeType ? data.disputeType.value : '—'}${data.disputeType ? ` [Source: ${data.disputeType.source}]` : ''}`,
    `Claimant Name:       ${data.claimantName ? data.claimantName.value : '—'}${data.claimantName ? ` [Source: ${data.claimantName.source}]` : ''}`,
    `Claimant Contact:    ${data.claimantContact ? data.claimantContact.value : '—'}${data.claimantContact ? ` [Source: ${data.claimantContact.source}]` : ''}`,
    `Respondent Name:     ${data.respondentName ? data.respondentName.value : '—'}${data.respondentName ? ` [Source: ${data.respondentName.source}]` : ''}`,
    `Respondent Address:  ${data.respondentAddress ? data.respondentAddress.value : '—'}${data.respondentAddress ? ` [Source: ${data.respondentAddress.source}]` : ''}`,
    `Date of Dispute:     ${data.dateOfDispute ? data.dateOfDispute.value : '—'}${data.dateOfDispute ? ` [Source: ${data.dateOfDispute.source}]` : ''}`,
    `Claim Amount (SGD):  ${amount}${data.claimAmount ? ` [Source: ${data.claimAmount.source}]` : ''}`,
    '',
    'Claim Summary:',
    data.claimSummary ?? '—',
    '',
    'Evidence:',
    data.evidenceList && data.evidenceList.length > 0
      ? data.evidenceList.map((item) => `- ${item}`).join('\n')
      : '—',
    '',
    '— Mock preview only. Final submission must be made via the official Singpass CJTS portal. —',
  ]
  return rows.join('\n')
}
type CJTSFormCardProps = {
  formData: CJTSFormData
  isConfirmed: boolean
  onVerify: () => void
}

export function CJTSFormCard({ formData, isConfirmed, onVerify }: CJTSFormCardProps) {
  const fieldCount = Object.keys(formData).length
  const isEmpty = fieldCount === 0

  async function handleCopy() {
    const text = buildCJTSFormText(formData)
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      // Clipboard may be unavailable (e.g., insecure context) — fall back to prompt
      window.prompt('Copy the draft form text below:', text)
    }
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
          <Eye className="size-4" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <h2 className="font-display text-sm font-semibold text-foreground">
            Draft CJTS Submission
          </h2>
          <p className="truncate text-[0.7rem] text-muted-foreground">
            Auto-populated · each fact cites its source
          </p>
        </div>
      </div>

      {/* Status badge */}
      <div className="border-b border-border px-4 py-3">
        <div
          className={cn(
            'flex items-center gap-2 rounded-lg px-3 py-2 text-[0.78rem] font-medium',
            isConfirmed
              ? 'bg-success/10 text-success ring-1 ring-success/30'
              : 'bg-warning/10 text-warning ring-1 ring-warning/30',
          )}
        >
          {isConfirmed ? (
            <ShieldCheck className="size-4 shrink-0" aria-hidden="true" />
          ) : (
            <BadgeCheck className="size-4 shrink-0" aria-hidden="true" />
          )}
          {isConfirmed
            ? 'Status: Verified & Ready for CJTS'
            : 'Status: Working Draft (Pending User Verification)'}
        </div>
      </div>

      {/* Form fields */}
      <div className="min-h-0 flex-1 space-y-2.5 overflow-y-auto px-4 py-3">
        {isEmpty ? (
          <div className="rounded-lg border border-dashed border-border px-4 py-8 text-center">
            <p className="text-[0.8rem] text-muted-foreground">
              No claim details extracted yet. Chat with the copilot and the
              form will fill in here automatically.
            </p>
          </div>
        ) : (
          <>
            <Field label={FIELD_LABELS.disputeType} source={formData.disputeType?.source}>
              {formData.disputeType?.value}
            </Field>
            <Field label={FIELD_LABELS.claimantName} source={formData.claimantName?.source}>
              {formData.claimantName?.value}
            </Field>
            <Field label={FIELD_LABELS.claimantContact} source={formData.claimantContact?.source}>
              {formData.claimantContact?.value}
            </Field>
            <Field label={FIELD_LABELS.respondentName} source={formData.respondentName?.source}>
              {formData.respondentName?.value}
            </Field>
            <Field label={FIELD_LABELS.respondentAddress} source={formData.respondentAddress?.source}>
              {formData.respondentAddress?.value}
            </Field>
            <Field label={FIELD_LABELS.dateOfDispute} source={formData.dateOfDispute?.source}>
              {formData.dateOfDispute?.value}
            </Field>
            <Field label={FIELD_LABELS.claimAmount} source={formData.claimAmount?.source}>
              {formData.claimAmount !== undefined
                ? `$${formData.claimAmount.value.toLocaleString('en-SG', { maximumFractionDigits: 2 })}`
                : undefined}
            </Field>
            <Field label={FIELD_LABELS.claimSummary}>{formData.claimSummary}</Field>
            <Field label={FIELD_LABELS.evidenceList}>
              {formData.evidenceList && formData.evidenceList.length > 0 ? (
                <span className="flex flex-wrap gap-1.5">
                  {formData.evidenceList.map((item) => (
                    <span
                      key={item}
                      className="rounded-full bg-primary/10 px-2 py-0.5 text-[0.72rem] font-medium text-primary"
                    >
                      {item}
                    </span>
                  ))}
                </span>
              ) : undefined}
            </Field>
          </>
        )}
      </div>

      {/* Actions */}
      <div className="space-y-2 border-t border-border px-4 py-3">
        <Button
          type="button"
          className="w-full"
          onClick={onVerify}
          disabled={isConfirmed || isEmpty}
        >
          <ShieldCheck className="size-4" aria-hidden="true" />
          Verify &amp; Finalize Claim Details
        </Button>
        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={handleCopy}
          disabled={!isConfirmed}
        >
          <ClipboardCopy className="size-4" aria-hidden="true" />
          Copy Form Text for CJTS
        </Button>
        <p className="px-1 text-[0.66rem] leading-snug text-muted-foreground/70 text-pretty">
          Mock preview only. Final submission must be made via the official
          Singpass CJTS portal.
        </p>
      </div>
    </div>
  )
}
