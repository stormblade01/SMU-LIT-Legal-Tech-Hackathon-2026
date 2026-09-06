import { CalendarClock, FileCheck2, FileSignature, FileText, Gavel, ShieldCheck, Users } from 'lucide-react'

import { FACT_GROUPS, type Fact, computeReadiness } from '@/lib/copilot'
import { cn } from '@/lib/utils'
import { FactRow } from './fact-row'
import { ReadinessMeter } from './readiness-meter'

const GROUP_ICONS: Record<string, typeof Users> = {
  parties: Users,
  agreement: FileSignature,
  breach: CalendarClock,
  jurisdiction: ShieldCheck,
  claim: FileText,
  evidence: FileCheck2,
  prefiling: Gavel,
}

export function FactsSidebar({ facts, className }: { facts: Fact[]; className?: string }) {
  const readiness = computeReadiness(facts)
  const confirmed = facts.filter((f) => f.status === 'confirmed').length

  return (
    <div className={cn('flex h-full flex-col bg-sidebar', className)}>
      <div className="border-b border-sidebar-border p-4">
        <div className="flex items-center gap-3">
          <ReadinessMeter value={readiness} />
          <div className="min-w-0">
            <h2 className="font-display text-sm font-semibold text-foreground">Filing readiness</h2>
            <p className="mt-0.5 text-[0.8rem] text-muted-foreground text-pretty">
              {readiness >= 100
                ? 'All requirements met — ready to file.'
                : `${confirmed} of ${facts.length} facts confirmed.`}
            </p>
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-4">
        <p className="px-1 pb-3 text-[0.68rem] font-medium uppercase tracking-widest text-muted-foreground/70">
          Extracted facts
        </p>
        <div className="flex flex-col gap-5">
          {FACT_GROUPS.map((group) => {
            const groupFacts = facts.filter((f) => f.groupId === group.id)
            const Icon = GROUP_ICONS[group.id]
            const done = groupFacts.every((f) => f.status === 'confirmed')
            return (
              <section key={group.id}>
                <div className="flex items-center gap-2 px-1 pb-1.5">
                  <Icon
                    className={cn('size-3.5', done ? 'text-success' : 'text-muted-foreground')}
                    aria-hidden="true"
                  />
                  <h3 className="text-[0.72rem] font-semibold uppercase tracking-wide text-foreground/80">
                    {group.title}
                  </h3>
                </div>
                <ul className="flex flex-col gap-1">
                  {groupFacts.map((fact) => (
                    <FactRow key={fact.id} fact={fact} />
                  ))}
                </ul>
              </section>
            )
          })}
        </div>
      </div>
    </div>
  )
}
