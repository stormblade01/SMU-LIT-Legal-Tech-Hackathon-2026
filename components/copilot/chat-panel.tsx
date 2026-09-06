'use client'

import { useEffect, useRef } from 'react'
import { Square } from 'lucide-react'
import type { UIMessage } from 'ai'

import { Composer } from './composer'
import { MessageItem, TypingIndicator } from './message-item'

type ChatPanelProps = {
  messages: UIMessage[]
  input: string
  isThinking: boolean
  thinkingSeconds?: number
  suggestions: string[]
  selectedFiles: File[]
  error?: Error
  onInputChange: (event: React.ChangeEvent<HTMLTextAreaElement>) => void
  onSubmit: () => void
  onSend: (text: string) => void
  onFilesSelected: (files: File[]) => void
  onRemoveFile: (index: number) => void
  onStop?: () => void
}

export function ChatPanel({
  messages,
  input,
  isThinking,
  thinkingSeconds = 0,
  suggestions,
  selectedFiles,
  error,
  onInputChange,
  onSubmit,
  onSend,
  onFilesSelected,
  onRemoveFile,
  onStop,
}: ChatPanelProps) {
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages, isThinking])

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-background">
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-6">
          {error && (
            <div
              role="alert"
              className="rounded-lg border border-destructive/30 bg-destructive/5 px-3.5 py-2.5 text-[0.8rem] leading-relaxed text-destructive"
            >
              <span className="font-semibold">Error:</span> {error.message}
            </div>
          )}
          {messages.map((message) => (
            <MessageItem key={message.id} message={message} />
          ))}
          {isThinking && <TypingIndicator seconds={thinkingSeconds} />}
          <div ref={endRef} />
        </div>
      </div>
      {isThinking && onStop && (
        <div className="mx-auto flex w-full max-w-2xl items-center justify-between gap-3 px-4 pb-2">
          <span className="text-[0.72rem] font-medium text-muted-foreground">
            Copilot is thinking… {thinkingSeconds}s
          </span>
          <button
            type="button"
            onClick={onStop}
            className="flex items-center gap-1.5 rounded-full border border-border bg-background px-2.5 py-1 text-[0.72rem] font-medium text-foreground transition-colors hover:border-destructive/40 hover:text-destructive"
          >
            <Square className="size-3" aria-hidden="true" />
            Stop
          </button>
        </div>
      )}
      <div className="mx-auto w-full max-w-2xl">
        <Composer
          suggestions={isThinking ? [] : suggestions}
          disabled={isThinking}
          value={input}
          selectedFiles={selectedFiles}
          onChange={onInputChange}
          onSubmit={onSubmit}
          onSend={onSend}
          onFilesSelected={onFilesSelected}
          onRemoveFile={onRemoveFile}
        />
      </div>
    </div>
  )
}
