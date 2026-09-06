import type { UIMessage } from 'ai'

import { INITIAL_FACTS, type Fact } from './copilot'

/**
 * Client-side fact extraction for the readiness sidebar.
 *
 * The copilot asks one question at a time in a fixed sequence, so we can
 * interpret each user reply against the question that was asked immediately
 * before it. This gives us a reliable, deterministic way to update the
 * "Filing readiness" checklist and progress meter as the conversation
 * proceeds — no extra AI calls (important: the Gemini free tier is limited).
 */

const MONTHS =
  '(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec|January|February|March|April|June|July|August|September|October|November|December)'

function textOf(message: UIMessage): string {
  return (message.parts as Array<{ type: string; text?: string }>)
    .filter((p) => p.type === 'text')
    .map((p) => p.text ?? '')
    .join(' ')
}

function hasFiles(message: UIMessage): boolean {
  return message.parts.some((p) => p.type === 'file')
}

function findAmount(text: string): string | undefined {
  const dollar = text.match(/\$\s?([\d][\d,]*(?:\.\d{2})?)/)
  if (dollar) return `$${dollar[1]}`
  const plain = text.match(/\b(\d[\d,]{3,}(?:\.\d{2})?)\b/)
  if (plain && parseFloat(plain[1].replace(/,/g, '')) <= 20000) return plain[1]
  return undefined
}

function findDate(text: string): string | undefined {
  const m = text.match(new RegExp(`\\b${MONTHS}\\s*(?:19|20)\\d{2}\\b`, 'i'))
  if (m) return m[0]
  const alt = text.match(/\b(?:19|20)\d{2}\b/)
  return alt?.[0]
}

type QuestionKind =
  | 'two-year'
  | 'amount'
  | 'nature'
  | 'parties'
  | 'agreement'
  | 'breach'
  | 'damages'
  | 'other'

function classifyQuestion(assistantText: string): QuestionKind {
  const t = assistantText
  if (/2 ?years|time limit|last 2/i.test(t)) return 'two-year'
  if (/20,?000|how much|claim amount|amount you are claiming|under ?\$? ?20/i.test(t))
    return 'amount'
  if (/which of the following|nature of dispute|dispute category|four topics|\ba\b\)|\bb\b\)/i.test(t))
    return 'nature'
  if (/filing this claim against|who (are|is) you|claiming against|respondent/i.test(t))
    return 'parties'
  if (/agreement.{0,30}(date|made|signed)|when .{0,20}agreement|how .{0,20}agreement/i.test(t))
    return 'agreement'
  if (/breach|went wrong|fail|missed|default/i.test(t)) return 'breach'
  if (/damages|exact monetary|how (is it|it is) calculated|instalments?$/i.test(t))
    return 'damages'
  return 'other'
}

function natureFromText(text: string): string | undefined {
  const t = text
  if (/\(a\)|sale of goods|\bgoods\b|\bbuying\b/i.test(t)) return 'Contract for sale of goods'
  if (/\(b\)|provision of services|work, services|\bservices\b|\bcontractor\b/i.test(t))
    return 'Contract for provision of services'
  if (/\(c\)|damage to property|property damage|\bdamage(?:d)?\b(?!\s*to the amount)/i.test(t))
    return 'Damage to property'
  if (/\(d\)|lease(?!r)|\btenan|\bdeposit\b|\brent\b/i.test(t))
    return 'Lease not exceeding 2 years (residential premises)'
  // Letter answers like "b", "option b", "I think it is b".
  if (/(?:^|[^a-z])(?:is|choose|pick|select|go with|option|letter)\s*b\b/i.test(t))
    return 'Contract for provision of services'
  if (/(?:^|[^a-z])(?:is|choose|pick|select|go with|option|letter)\s*a\b/i.test(t))
    return 'Contract for sale of goods'
  if (/(?:^|[^a-z])(?:is|choose|pick|select|go with|option|letter)\s*c\b/i.test(t))
    return 'Damage to property'
  if (/(?:^|[^a-z])(?:is|choose|pick|select|go with|option|letter)\s*d\b/i.test(t))
    return 'Lease not exceeding 2 years (residential premises)'
  if (/^\s*b\s*\.?\s*$/i.test(t)) return 'Contract for provision of services'
  if (/^\s*a\s*\.?\s*$/i.test(t)) return 'Contract for sale of goods'
  if (/^\s*c\s*\.?\s*$/i.test(t)) return 'Damage to property'
  if (/^\s*d\s*\.?\s*$/i.test(t)) return 'Lease not exceeding 2 years (residential premises)'
  return undefined
}

function nameFromText(text: string): string | undefined {
  const against = text.match(/against\s+([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)*)/)
  if (against) return against[1]
  const afterIs = text.match(
    /(?:respondent(?:,|\s+is)?\s*[:\-]?\s*)([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)*)/,
  )
  if (afterIs) return afterIs[1]
  // Bare name answer at the start (e.g. "tan ah gao, blk 836 yishun").
  const leadingName = text.trim().match(/^([A-Za-z][a-zA-Z]+(?:\s+[A-Za-z][a-zA-Z]+){0,2})/)
  if (leadingName) {
    return leadingName[1]
      .split(' ')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }
  return undefined
}
export function computeFacts(messages: UIMessage[]): Fact[] {
  const map = new Map<string, Fact>()
  for (const f of INITIAL_FACTS) map.set(f.id, { ...f })

  const set = (id: string, patch: Partial<Fact>) => {
    const f = map.get(id)
    if (f) map.set(id, { ...f, ...patch })
  }

  const has = (id: string) => map.get(id)?.status === 'confirmed'

  let previousAssistantText = ''

  for (const message of messages) {
    if (message.role === 'assistant') {
      previousAssistantText = textOf(message)
      continue
    }
    if (message.role !== 'user') continue

    const raw = textOf(message)
    const lower = raw.toLowerCase()

    // Attached files always mean documents are being collected.
    if (hasFiles(message)) {
      set('documents', { status: 'confirmed', value: 'Evidence file(s) attached', source: 'Document' })
    }
    if (/whatsapp|email|chat|telegram|sms|screenshot|message/i.test(raw)) {
      set('correspondence', { status: 'confirmed', value: 'Correspondence described', source: 'Chat' })
    }

    switch (classifyQuestion(previousAssistantText)) {
      case 'two-year': {
        if (/(no|not|never|didn'?t|more than|before|exceed)/i.test(raw)) {
          set('two-year', { status: 'review', value: 'May fall outside the 2-year window', source: 'Chat' })
        } else if (/(yes|yeah|yep|within|under|last 2|correct|did|it was)/i.test(lower)) {
          set('two-year', { status: 'confirmed', value: 'Within the last 2 years', source: 'Chat' })
        }
        break
      }

      case 'amount': {
        const amount = findAmount(raw)
        if (amount) {
          set('claim-amount', { status: 'confirmed', value: amount, source: 'Chat' })
          const numeric = parseFloat(amount.replace(/[^0-9.]/g, ''))
          if (numeric <= 20000 || /20,?000|20 ?k/.test(lower)) {
            set('twenty-k', { status: 'confirmed', value: 'Within the $20,000 limit', source: 'Chat' })
          } else {
            set('twenty-k', { status: 'review', value: `${amount} may exceed the $20,000 limit`, source: 'Chat' })
          }
        } else if (/(yes|under|less than|ok|fine)/i.test(lower)) {
          set('twenty-k', { status: 'confirmed', value: 'Within the $20,000 limit', source: 'Chat' })
        } else if (/(no|more than|over|exceed)/i.test(lower)) {
          set('twenty-k', { status: 'review', value: 'Claim may exceed $20,000', source: 'Chat' })
        }
        break
      }

      case 'nature': {
        const label = natureFromText(raw)
        if (label) set('nature', { status: 'confirmed', value: label, source: 'Chat' })
        break
      }

      case 'parties': {
        const name = nameFromText(raw)
        if (name) set('respondent', { status: 'confirmed', value: name, source: 'Chat' })
        if (/blk|block|street|road|avenue|ave|#\s?\d|postal|singapore/i.test(raw)) {
          set('respondent-contact', { status: 'confirmed', value: 'Address provided', source: 'Chat' })
        }
        break
      }

      case 'agreement': {
        const date = findDate(raw)
        if (date) set('agreement-date', { status: 'confirmed', value: date, source: 'Chat' })
        if (/signed|written|digital|document|letter|pdf|form/i.test(raw)) {
          set('agreement-form', { status: 'confirmed', value: 'Written / signed document', source: 'Chat' })
        } else if (/whatsapp|text|chat|message|sms|telegram/i.test(raw)) {
          set('agreement-form', { status: 'confirmed', value: 'Messaging (e.g. WhatsApp)', source: 'Chat' })
        } else if (/verbal|oral|spoken|word of mouth|phone/i.test(raw)) {
          set('agreement-form', { status: 'confirmed', value: 'Verbal', source: 'Chat' })
        }
        if (/(instalment|portion|monthly|per month|\/month|payment plan|1,?500|2,?000|500\b)/i.test(raw)) {
          set('repayment-terms', { status: 'confirmed', value: 'Repayment plan described', source: 'Chat' })
        } else if (/(due|deadline|repay|pay back|10000|10,?000)/i.test(raw)) {
          set('repayment-terms', { status: 'review', value: 'Partially described', source: 'Chat' })
        }
        break
      }

      case 'breach': {
        if (/(no|not|never|didn'?t|fail|missed|default|did not|didnt)/i.test(raw)) {
          set('breach', { status: 'confirmed', value: 'Payments not made as agreed', source: 'Chat' })
        } else if (raw.trim()) {
          set('breach', { status: 'review', value: 'Breach described (to confirm)', source: 'Chat' })
        }
        const date = findDate(raw)
        if (date) {
          set('missed-dates', { status: 'confirmed', value: date, source: 'Chat' })
        } else if (/(dec|jan|feb|mar|apr|jun|jul|aug|sept?|oct|nov)/i.test(raw)) {
          set('missed-dates', { status: 'review', value: 'Month mentioned — for review', source: 'Chat' })
        }
        break
      }

      case 'damages': {
        const amount = findAmount(raw)
        if (amount) set('claim-amount', { status: 'confirmed', value: amount, source: 'Chat' })
        if (/(outstanding|balance|unpaid|total|instalment|1,?500|1,?000|6 x|6 \*)/i.test(raw)) {
          set('claim-breakdown', { status: 'confirmed', value: 'Calculation described', source: 'Chat' })
        } else if (raw.trim()) {
          set('claim-breakdown', { status: 'review', value: 'Calculation to confirm', source: 'Chat' })
        }
        break
      }

      default:
        break
    }

    previousAssistantText = ''
  }

  // Pre-filing readiness is derived from how complete the intake is.
  const coreFacts = [
    'two-year',
    'twenty-k',
    'nature',
    'respondent',
    'agreement-date',
    'agreement-form',
    'breach',
    'missed-dates',
    'claim-amount',
  ]
  const confirmedCore = coreFacts.filter((id) => has(id)).length
  const totalCore = coreFacts.length

  set('timeline', {
    status: confirmedCore === totalCore ? 'confirmed' : confirmedCore >= 5 ? 'review' : 'missing',
    value:
      confirmedCore === totalCore
        ? 'Ready to summarise'
        : confirmedCore >= 5
          ? `${confirmedCore} of ${totalCore} key facts confirmed`
          : undefined,
    source: 'Auto',
  })
  set('summary', {
    status: confirmedCore === totalCore || confirmedCore >= 5 ? 'review' : 'missing',
    value: confirmedCore === totalCore ? 'Ready to generate' : undefined,
    source: 'Auto',
  })

  return [...map.values()]
}