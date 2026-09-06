import { FileText, Scale } from 'lucide-react'
import type { FileUIPart, UIMessage } from 'ai'

import { cn } from '@/lib/utils'
import { AssistantMarkdown } from './assistant-markdown'

function AttachmentChip({ filename, mediaType }: { filename?: string; mediaType: string }) {
  return (
    <div className="mt-2.5 flex items-center gap-2.5 rounded-lg border border-primary-foreground/20 bg-primary-foreground/10 px-2.5 py-2">
      <span className="grid size-8 shrink-0 place-items-center rounded-md bg-primary-foreground/15">
        <FileText className="size-4" aria-hidden="true" />
      </span>
      <div className="min-w-0 leading-tight">
        <p className="truncate text-[0.8rem] font-medium">{filename ?? 'Attached file'}</p>
        <p className="text-[0.72rem] opacity-70">{mediaType}</p>
      </div>
    </div>
  )
}

function ImageAttachment({ part }: { part: FileUIPart }) {
  return (
    <div className="mt-2.5 overflow-hidden rounded-lg border border-primary-foreground/20 bg-primary-foreground/10">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={part.url}
        alt={part.filename ?? 'Uploaded image'}
        className="max-h-56 w-full object-contain"
      />
      <p className="truncate border-t border-primary-foreground/10 px-2.5 py-1.5 text-[0.72rem] text-primary-foreground/80">
        {part.filename ?? 'Uploaded image'}
      </p>
    </div>
  )
}

export function MessageItem({ message }: { message: UIMessage }) {
  const isUser = message.role === 'user'

  const textContent = message.parts
    .filter((part) => part.type === 'text')
    .map((part) => part.text)
    .join('\n')
  const fileParts = message.parts.filter(
    (part): part is FileUIPart => part.type === 'file',
  )

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-primary px-3.5 py-2.5 text-primary-foreground">
          {textContent && (
            <p className="text-[0.9rem] leading-relaxed whitespace-pre-wrap text-pretty">{textContent}</p>
          )}
          {fileParts.map((part, i) =>
            part.mediaType.startsWith('image/') ? (
              <ImageAttachment key={i} part={part} />
            ) : (
              <AttachmentChip key={i} filename={part.filename} mediaType={part.mediaType} />
            ),
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="flex gap-3">
      <span
        className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground shadow-sm"
        aria-hidden="true"
      >
        <Scale className="size-4" />
      </span>
      <div className="min-w-0 flex-1 pt-0.5">
        <div className="mb-1 flex items-center gap-2">
          <span className="text-[0.8rem] font-semibold text-foreground">Copilot</span>
          <span className="rounded-full bg-accent px-1.5 py-0.5 text-[0.62rem] font-medium uppercase tracking-wide text-accent-foreground">
            CJTS
          </span>
        </div>
        <div className="flex flex-col gap-2.5">
          {textContent ? (
            <AssistantMarkdown text={textContent} />
          ) : (
            <p className="text-[0.9rem] italic leading-relaxed text-muted-foreground/70">…</p>
          )}
        </div>
      </div>
    </div>
  )
}

export function TypingIndicator({ seconds = 0 }: { seconds?: number }) {
  return (
    <div className="flex gap-3">
      <span
        className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground shadow-sm"
        aria-hidden="true"
      >
        <Scale className="size-4" />
      </span>
      <div className="flex flex-col gap-1.5 pt-1.5">
        <div className="flex items-center gap-1.5" aria-label="Copilot is typing">
          <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground/50 [animation-delay:-0.3s]" />
          <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground/50 [animation-delay:-0.15s]" />
          <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground/50" />
        </div>
        {seconds > 2 && (
          <span className="text-[0.68rem] text-muted-foreground/70">
            Generating a response… {seconds}s
          </span>
        )}
      </div>
    </div>
  )
}
