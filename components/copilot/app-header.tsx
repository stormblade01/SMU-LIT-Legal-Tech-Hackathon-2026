'use client'

import { PanelRightOpen, Scale } from 'lucide-react'

type AppHeaderProps = {
  caseRef: string
  readiness: number
  onToggleSidebar: () => void
}

export function AppHeader({ caseRef, readiness, onToggleSidebar }: AppHeaderProps) {
  return (
    <header className="flex items-center gap-3 border-b border-primary/20 bg-primary px-4 py-3 text-primary-foreground">
      <span
        className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary-foreground/15 ring-1 ring-primary-foreground/20"
        aria-hidden="true"
      >
        <Scale className="size-5" />
      </span>
      <div className="min-w-0 flex-1">
        <h1 className="font-display text-[0.95rem] font-semibold leading-tight text-balance">
          Community Justice &amp; Tribunals System
        </h1>
        <p className="truncate text-[0.78rem] text-primary-foreground/70">
          Pre-Filing Copilot · Small Claims Track
        </p>
      </div>

      <div className="hidden items-center gap-2 rounded-lg bg-primary-foreground/10 px-2.5 py-1.5 sm:flex">
        <span className="text-[0.68rem] uppercase tracking-wide text-primary-foreground/60">
          Draft
        </span>
        <span className="font-display text-[0.8rem] font-semibold tabular-nums">{caseRef}</span>
      </div>

      <button
        type="button"
        onClick={onToggleSidebar}
        className="flex items-center gap-2 rounded-lg bg-primary-foreground/10 px-2.5 py-1.5 text-[0.8rem] font-medium transition-colors hover:bg-primary-foreground/20"
        aria-label="Open readiness checklist"
      >
        <span className="tabular-nums">{readiness}%</span>
        <PanelRightOpen className="size-4" />
      </button>
    </header>
  )
}
