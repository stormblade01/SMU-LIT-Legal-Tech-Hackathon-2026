import { Circle, CircleAlert, CircleCheckBig } from 'lucide-react'

import type { Fact } from '@/lib/copilot'
import { cn } from '@/lib/utils'

const STATUS = {
  confirmed: { Icon: CircleCheckBig, tone: 'text-success' },
  review: { Icon: CircleAlert, tone: 'text-warning' },
  missing: { Icon: Circle, tone: 'text-muted-foreground/40' },
} as const

export function FactRow({ fact }: { fact: Fact }) {
  const { Icon, tone } = STATUS[fact.status]
  const filled = fact.status !== 'missing'

  return (
    <li
      className={cn(
        'flex gap-2.5 rounded-md px-2.5 py-2 transition-colors',
        filled ? 'bg-card' : 'bg-transparent',
      )}
    >
      <Icon className={cn('mt-0.5 size-4 shrink-0', tone)} aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            'text-[0.8rem] font-medium leading-tight',
            filled ? 'text-foreground' : 'text-muted-foreground',
          )}
        >
          {fact.label}
        </p>
        {fact.value ? (
          <p className="mt-1 text-[0.8rem] leading-snug text-foreground/80 text-pretty">
            {fact.value}
          </p>
        ) : (
          <p className="mt-1 text-[0.75rem] italic leading-snug text-muted-foreground/70">
            Awaiting information
          </p>
        )}
        {fact.source && (
          <p className="mt-1 text-[0.68rem] uppercase tracking-wide text-muted-foreground/70">
            {fact.source}
          </p>
        )}
      </div>
    </li>
  )
}
