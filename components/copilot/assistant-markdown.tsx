import { CheckSquare, CircleDot, Square } from 'lucide-react'

import { cn } from '@/lib/utils'
import { RichText } from './rich-text'

/**
 * Renders the assistant's structured Markdown reply (the 3-part turn format:
 * "### 📋 Intake Progress Status", "---" dividers, "- [x]" checkboxes and
 * "- **Field**: value" lines) as clean UI blocks instead of raw text.
 */
export function AssistantMarkdown({ text }: { text: string }) {
  const lines = text.split('\n')
  const blocks: React.ReactNode[] = []
  let paragraph: string[] = []

  const flushParagraph = () => {
    if (paragraph.length === 0) return
    const content = paragraph.join(' ').trim()
    paragraph = []
    if (!content) return
    blocks.push(
      <p
        key={`p-${blocks.length}`}
        className="text-[0.9rem] leading-relaxed text-foreground/90 text-pretty"
      >
        <RichText text={content} />
      </p>,
    )
  }

  for (const raw of lines) {
    const line = raw.trimEnd()

    // Horizontal rule
    if (/^\s*---+\s*$/.test(line)) {
      flushParagraph()
      blocks.push(<hr key={`hr-${blocks.length}`} className="border-border/70" />)
      continue
    }

    // Headings (###, ##, #)
    const heading = line.match(/^\s*(#{1,4})\s+(.*)$/)
    if (heading) {
      flushParagraph()
      blocks.push(
        <h3
          key={`h-${blocks.length}`}
          className="font-display text-[0.9rem] font-semibold text-foreground"
        >
          <RichText text={heading[2]} />
        </h3>,
      )
      continue
    }

    // Task list items: - [x] / - [/] / - [ ]
    const task = line.match(/^\s*[-*]\s*\[([ xX/])\]\s*(.*)$/)
    if (task) {
      flushParagraph()
      const mark = task[1].toLowerCase()
      const done = mark === 'x'
      const active = mark === '/'
      const Icon = done ? CheckSquare : active ? CircleDot : Square
      blocks.push(
        <div key={`t-${blocks.length}`} className="flex items-start gap-2">
          <Icon
            className={cn(
              'mt-0.5 size-3.5 shrink-0',
              done ? 'text-success' : active ? 'text-primary' : 'text-muted-foreground/50',
            )}
            aria-hidden="true"
          />
          <span
            className={cn(
              'text-[0.84rem] leading-snug',
              done
                ? 'text-foreground/70'
                : active
                  ? 'font-medium text-foreground'
                  : 'text-muted-foreground',
            )}
          >
            <RichText text={task[2]} />
          </span>
        </div>,
      )
      continue
    }

    // Bullet list items
    const bullet = line.match(/^\s*[-*]\s+(.*)$/)
    if (bullet) {
      flushParagraph()
      blocks.push(
        <div key={`b-${blocks.length}`} className="flex items-start gap-2">
          <span
            className="mt-[0.45rem] size-1.5 shrink-0 rounded-full bg-muted-foreground/40"
            aria-hidden="true"
          />
          <span className="text-[0.84rem] leading-snug text-foreground/90 text-pretty">
            <RichText text={bullet[1]} />
          </span>
        </div>,
      )
      continue
    }

    // Numbered list items
    const numbered = line.match(/^\s*(\d+)\.\s+(.*)$/)
    if (numbered) {
      flushParagraph()
      blocks.push(
        <div key={`n-${blocks.length}`} className="flex items-start gap-2">
          <span className="mt-0.5 shrink-0 text-[0.8rem] font-medium tabular-nums text-muted-foreground">
            {numbered[1]}.
          </span>
          <span className="text-[0.84rem] leading-snug text-foreground/90 text-pretty">
            <RichText text={numbered[2]} />
          </span>
        </div>,
      )
      continue
    }

    // Blank line ends the current paragraph
    if (line.trim() === '') {
      flushParagraph()
      continue
    }

    paragraph.push(line)
  }
  flushParagraph()

  return <div className="flex flex-col gap-2">{blocks}</div>
}