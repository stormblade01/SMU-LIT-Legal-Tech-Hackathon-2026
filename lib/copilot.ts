export type FactStatus = 'confirmed' | 'review' | 'missing'

export type Fact = {
  id: string
  groupId: string
  label: string
  status: FactStatus
  value?: string
  source?: string
}

export const FACT_GROUPS = [
  { id: 'parties', title: 'Parties' },
  { id: 'agreement', title: 'Agreement' },
  { id: 'breach', title: 'Breach' },
  { id: 'jurisdiction', title: 'Jurisdiction' },
  { id: 'claim', title: 'Claim' },
  { id: 'evidence', title: 'Evidence' },
  { id: 'prefiling', title: 'Pre-Filing' },
] as const

export const INITIAL_FACTS: Fact[] = [
  // Parties
  { id: 'respondent', groupId: 'parties', label: 'Respondent name', status: 'missing' },
  { id: 'respondent-contact', groupId: 'parties', label: 'Respondent address', status: 'missing' },
  // Agreement
  { id: 'agreement-date', groupId: 'agreement', label: 'Agreement date', status: 'missing' },
  { id: 'agreement-form', groupId: 'agreement', label: 'How the agreement was made', status: 'missing' },
  { id: 'repayment-terms', groupId: 'agreement', label: 'Repayment terms (instalments/dates)', status: 'missing' },
  // Breach
  { id: 'breach', groupId: 'breach', label: 'What went wrong', status: 'missing' },
  { id: 'missed-dates', groupId: 'breach', label: 'Dates payments were missed', status: 'missing' },
  // Jurisdiction
  { id: 'two-year', groupId: 'jurisdiction', label: 'Dispute within 2 years', status: 'missing' },
  { id: 'twenty-k', groupId: 'jurisdiction', label: 'Claim under $20,000', status: 'missing' },
  { id: 'nature', groupId: 'jurisdiction', label: 'Nature of dispute (SCT-covered)', status: 'missing' },
  // Claim
  { id: 'claim-amount', groupId: 'claim', label: 'Exact claim amount', status: 'missing' },
  { id: 'claim-breakdown', groupId: 'claim', label: 'How the amount is calculated', status: 'missing' },
  // Evidence
  { id: 'documents', groupId: 'evidence', label: 'Supporting documents', status: 'missing' },
  { id: 'correspondence', groupId: 'evidence', label: 'Correspondence / screenshots', status: 'missing' },
  // Pre-filing
  { id: 'timeline', groupId: 'prefiling', label: 'Chronological timeline', status: 'missing' },
  { id: 'summary', groupId: 'prefiling', label: 'Pre-filing summary', status: 'missing' },
  { id: 'verify', groupId: 'prefiling', label: 'Verify facts against originals', status: 'missing' },
]

export function computeReadiness(facts: Fact[]): number {
  if (facts.length === 0) return 0
  const confirmed = facts.filter((f) => f.status === 'confirmed').length
  return Math.round((confirmed / facts.length) * 100)
}