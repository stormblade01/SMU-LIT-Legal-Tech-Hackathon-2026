'use client'

import { type KeyboardEvent, useRef } from 'react'
import { ArrowUp, FileText, Paperclip, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const ACCEPTED_TYPES =
  'image/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain'

type ComposerProps = {
  suggestions: string[]
  disabled?: boolean
  value: string
  selectedFiles: File[]
  onChange: (event: React.ChangeEvent<HTMLTextAreaElement>) => void
  onSubmit: () => void
  onSend: (text: string) => void
  onFilesSelected: (files: File[]) => void
  onRemoveFile: (index: number) => void
}

export function Composer({
  suggestions,
  disabled,
  value,
  selectedFiles,
  onChange,
  onSubmit,
  onSend,
  onFilesSelected,
  onRemoveFile,
}: ComposerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const canSubmit = !disabled && (value.trim() !== '' || selectedFiles.length > 0)

  function submit() {
    if (!canSubmit) return
    onSubmit()
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    const composing = e.nativeEvent.isComposing || e.keyCode === 229
    if (e.key === 'Enter' && !e.shiftKey && !composing) {
      e.preventDefault()
      submit()
    }
  }

  // Capture the chosen Files into the parent's `selectedFiles` state.
  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files
    if (files && files.length > 0) {
      onFilesSelected(Array.from(files))
    }
    // Reset so selecting the same file again re-triggers onChange.
    e.target.value = ''
  }

  return (
    <div className="border-t border-border bg-card/60 px-4 py-3 backdrop-blur-sm">
      {suggestions.length > 0 && (
        <div className="mb-2.5 flex flex-wrap gap-2">
          {suggestions.map((s) => (
            <button
              key={s}
              type="button"
              disabled={disabled}
              onClick={() => !disabled && onSend(s)}
              className="rounded-full border border-border bg-background px-3 py-1.5 text-[0.8rem] text-foreground/80 transition-colors hover:border-primary/40 hover:bg-accent hover:text-accent-foreground disabled:opacity-50"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {selectedFiles.length > 0 && (
        <div className="mb-2.5 flex flex-wrap gap-2">
          {selectedFiles.map((file, index) => (
            <div
              key={`${file.name}-${index}`}
              className="flex items-center gap-2 rounded-lg border border-border bg-background py-1 pl-2 pr-1 text-[0.8rem]"
            >
              <FileText className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
              <span className="max-w-40 truncate text-foreground/80">
                {file.name}
                <span className="ml-1 text-[0.7rem] text-muted-foreground">
                  {Math.round(file.size / 1024)} KB
                </span>
              </span>
              <button
                type="button"
                aria-label={`Remove ${file.name}`}
                disabled={disabled}
                onClick={() => onRemoveFile(index)}
                className="grid size-5 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
              >
                <X className="size-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-end gap-2 rounded-xl border border-border bg-background p-2 transition-colors focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/20">
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={ACCEPTED_TYPES}
          className="sr-only"
          aria-hidden="true"
          tabIndex={-1}
          onChange={handleFileChange}
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Attach evidence"
          disabled={disabled}
          onClick={() => fileInputRef.current?.click()}
          className="text-muted-foreground hover:text-foreground"
        >
          <Paperclip className="size-4" />
        </Button>

        <textarea
          rows={1}
          value={value}
          disabled={disabled}
          onChange={onChange}
          onKeyDown={handleKeyDown}
          placeholder={
            selectedFiles.length > 0 ? 'Describe the attached evidence, or send it as-is…' : 'Reply to the copilot…'
          }
          className={cn(
            'max-h-32 min-h-8 flex-1 resize-none bg-transparent py-1.5 text-[0.9rem] leading-relaxed text-foreground outline-none placeholder:text-muted-foreground/70 disabled:opacity-50',
          )}
        />

        <Button
          type="button"
          size="icon"
          aria-label="Send message"
          disabled={!canSubmit}
          onClick={submit}
        >
          <ArrowUp className="size-4" />
        </Button>
      </div>
      <p className="mt-2 px-1 text-[0.68rem] leading-snug text-muted-foreground/70 text-pretty">
        Guidance only — this copilot does not provide legal advice or file on your behalf.
      </p>
    </div>
  )
}
