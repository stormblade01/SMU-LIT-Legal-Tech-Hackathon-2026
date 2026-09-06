'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport, type FileUIPart, type UIMessage } from 'ai'

import { AppHeader } from '@/components/copilot/app-header'
import { ChatPanel } from '@/components/copilot/chat-panel'
import { CJTSFormCard, type CJTSFormData } from '@/components/copilot/cjts-form'
import { FactsSidebar } from '@/components/copilot/facts-sidebar'
import { prepareFileForUpload } from '@/lib/attachments'
import { computeReadiness } from '@/lib/copilot'
import { computeFacts } from '@/lib/facts'

const CASE_REF = 'SCT/2026/00847'
const API_ENDPOINT = '/api/chat'

// Legacy localStorage key (no longer used for persistence). Kept only so we
// can wipe any conversation previously saved by older versions of the app.
const LEGACY_STORAGE_KEY = 'sct-copilot-messages'

const WELCOME_TEXT = `Welcome to the CJTS Pre-Filing Assistant for the Small Claims Tribunals (SCT). I will guide you through a few structured questions, one at a time, and build your draft submission automatically as we go — you can watch it update in the panel on the right.

Please note: I provide procedural guidance only — I cannot give legal advice or predict outcomes.

Let's begin with **Step 1: Eligibility**. Did the dispute arise within the last **2 years**? If you know the exact date or month and year, please share it.`

const STARTER_SUGGESTIONS = [
  'Yes, it happened within the last 2 years.',
  'No, it happened more than 2 years ago.',
  "I'm not sure — I need to check the exact date.",
  'What dispute types can the SCT handle?',
]

export default function Page() {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const [input, setInput] = useState('')
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [formData, setFormData] = useState<CJTSFormData>({})
  const [isConfirmed, setIsConfirmed] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)
  const [thinkingSince, setThinkingSince] = useState<number | null>(null)
  const [now, setNow] = useState(0)

  // Guard against an infinite auto-continue loop if the model keeps calling
  // tools without producing text. Keyed by the last assistant message id.
  const autoContinueRef = useRef<{ lastId: string; count: number }>({
    lastId: '',
    count: 0,
  })

  const welcomeMessage = useMemo<UIMessage>(
    () => ({
      id: 'welcome',
      role: 'assistant',
      parts: [{ type: 'text', text: WELCOME_TEXT }],
    }),
    [],
  )

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: API_ENDPOINT,
        // Stop the chat from re-uploading old attachments on every turn.
        // The full conversation history is sent with each request, which means
        // a once-attached image would otherwise be re-sent as a multi-MB
        // Base64 payload on every subsequent message — the main cause of the
        // chat "hanging" getting slower as the conversation grows.
        //
        // We keep ALL text history (so the AI never forgets earlier facts).
        // For attachments, we keep the file parts of the newest user message
        // AND the most recent file-bearing message, so evidence remains
        // readable across turns while older payloads are dropped.
        prepareSendMessagesRequest: ({ messages: msgs }) => {
          const keepFileIdx = new Set<number>()
          let lastUserIdx = -1
          for (let i = msgs.length - 1; i >= 0; i--) {
            if (msgs[i].role === 'user' && lastUserIdx === -1) lastUserIdx = i
            if (msgs[i].parts.some((p) => p.type === 'file')) {
              keepFileIdx.add(i)
              break
            }
          }
          if (lastUserIdx !== -1) keepFileIdx.add(lastUserIdx)

          const pruned = msgs.map((message, idx) => {
            if (keepFileIdx.has(idx)) return message
            const hasFileParts = message.parts.some((p) => p.type === 'file')
            if (!hasFileParts) return message
            return {
              ...message,
              parts: message.parts.filter((p) => p.type !== 'file'),
            }
          })

          return { body: { messages: pruned } }
        },
      }),
    [],
  )

  // Start every page load as a brand-new chat: the greeting is the only
  // message in history, so the AI re-runs the intake from scratch each time.
  const { messages, status, error, sendMessage, stop } = useChat<UIMessage>({
    transport,
    messages: [welcomeMessage],
    // If the model ends a turn having called a tool but produced no visible
    // text (a known Gemini behaviour — finishReason "tool-calls"), the client
    // automatically re-submits so the user actually gets a text reply instead
    // of an infinite "hang". Guarded to avoid infinite loops.
    sendAutomaticallyWhen: ({ messages: msgs }) => {
      const last = msgs[msgs.length - 1]
      if (!last || last.role !== 'assistant') return false

      const hasText = last.parts.some((p) => p.type === 'text')
      const hasTool = last.parts.some(
        (p) =>
          p.type === 'dynamic-tool' ||
          (typeof p.type === 'string' && p.type.startsWith('tool-')),
      )
      if (hasText || !hasTool) return false

      if (autoContinueRef.current.lastId !== last.id) {
        autoContinueRef.current = { lastId: last.id, count: 0 }
      }
      autoContinueRef.current.count += 1
      return autoContinueRef.current.count <= 3
    },
  })

  // Ensure no memory of past conversations survives a reload: wipe anything
  // older versions of the app persisted to localStorage. Nothing is ever
  // written to localStorage anymore, so each fresh load starts clean.
  useEffect(() => {
    try {
      window.localStorage.removeItem(LEGACY_STORAGE_KEY)
    } catch {
      // storage unavailable — nothing to clear
    }
  }, [])

  // Live auto-fill: watch for `update_claim_form` tool invocations in the
  // messages and merge their argument payloads into the CJTS form state as
  // the AI confirms each new piece of information.
  useEffect(() => {
    for (const message of messages) {
      for (const part of message.parts as Array<Record<string, unknown>>) {
        const partType = part.type as string
        const toolName = partType.startsWith('tool-')
          ? partType.slice('tool-'.length)
          : partType === 'dynamic-tool'
            ? (part.toolName as string | undefined)
            : undefined
        if (toolName === 'update_claim_form' && part.input && typeof part.input === 'object') {
          setFormData((prev) => ({
            ...prev,
            ...(part.input as Partial<CJTSFormData>),
          }))
        }
      }
    }
  }, [messages])

  // Allow the user to finalize from the chat by typing "confirm"/"verify".
  useEffect(() => {
    const last = messages[messages.length - 1]
    if (last?.role === 'user') {
      const text = (last.parts as Array<{ type: string; text?: string }>)
        .filter((p) => p.type === 'text')
        .map((p) => p.text ?? '')
        .join(' ')
      if (/\b(confirm|verify|finali[sz]e)\b/i.test(text)) {
        const keys = Object.keys(formData)
        if (keys.length > 0) setIsConfirmed(true)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages])

  const isThinking = status === 'submitted' || status === 'streaming'
  const showWelcome =
    messages.length === 1 &&
    messages[0].id === 'welcome' &&
    status === 'ready'

  // Live elapsed-seconds counter so a slow model response is clearly shown as
  // "Copilot is thinking… 12s" rather than appearing hung.
  useEffect(() => {
    if (isThinking) {
      setThinkingSince((prev) => prev ?? Date.now())
      const timer = window.setInterval(() => setNow(Date.now()), 250)
      return () => window.clearInterval(timer)
    }
    setThinkingSince(null)
    setNow(0)
  }, [isThinking])

  const thinkingSeconds = thinkingSince
    ? Math.max(0, Math.floor((now - thinkingSince) / 1000))
    : 0

  // Live fact tracking: derive the readiness checklist + progress from the
  // conversation so the sidebar updates as the user answers the questions.
  const facts = useMemo(() => computeFacts(messages), [messages])
  const readiness = computeReadiness(facts)

  // In AI SDK v7 the classic input helpers moved off `useChat`, so we wrap the
  // `messages`/`sendMessage` primitives with the familiar `input`,
  // `handleInputChange` and `handleSubmit` names that the composer expects.
  function handleInputChange(event: React.ChangeEvent<HTMLTextAreaElement>) {
    setInput(event.target.value)
  }

  async function handleSubmit() {
    const text = input.trim()
    if ((!text && selectedFiles.length === 0) || isThinking) return

    setLocalError(null)

    // Prepare attachments: images are downscaled/compressed on the client so a
    // phone photo no longer becomes a multi-MB Base64 payload that makes
    // Gemini (and the whole chat) appear to hang for 30s+.
    let attachments
    try {
      attachments = await Promise.all(selectedFiles.map((file) => prepareFileForUpload(file)))
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Could not prepare the attached file.')
      return
    }

    const fileParts: FileUIPart[] = attachments.map((attachment) => ({
      type: 'file',
      mediaType: attachment.contentType,
      filename: attachment.name,
      url: attachment.url,
    }))

    // Clear the composer before/while the message is dispatched.
    setInput('')
    setSelectedFiles([])

    // `sendMessage` has separate overloads for "text + files" and "files only".
    const send = text
      ? sendMessage({ text, files: fileParts })
      : sendMessage({ files: fileParts })

    // Watchdog: never let the UI hang forever if the response stalls.
    // After 120s we abort the request and show a clear message.
    let timer: ReturnType<typeof setTimeout> | undefined
    const watchdog = new Promise<void>((_, reject) => {
      timer = setTimeout(
        () =>
          reject(
            new Error(
              'The request took too long (120s) and was stopped. Please try again, or upload a smaller / clearer file.',
            ),
          ),
        120_000,
      )
    })

    try {
      await Promise.race([send, watchdog])
    } catch (err) {
      stop()
      setLocalError(
        err instanceof Error ? err.message : 'Something went wrong while sending your message.',
      )
    } finally {
      if (timer) clearTimeout(timer)
    }
  }

  function handleSend(text: string) {
    if (isThinking) return
    sendMessage({ text })
  }

  function handleFilesSelected(files: File[]) {
    setSelectedFiles((prev) => [...prev, ...files])
  }

  function handleRemoveFile(index: number) {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const displayError =
    error instanceof Error
      ? error
      : localError
        ? new Error(localError)
        : undefined

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background">
      <AppHeader
        caseRef={CASE_REF}
        readiness={readiness}
        onToggleSidebar={() => setMobileSidebarOpen(true)}
      />

      <div className="flex min-h-0 flex-1">
        {/* Left column — chat interface (~60%) */}
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <ChatPanel
            messages={messages}
            input={input}
            isThinking={isThinking}
            thinkingSeconds={thinkingSeconds}
            suggestions={showWelcome ? STARTER_SUGGESTIONS : []}
            selectedFiles={selectedFiles}
            error={displayError}
            onInputChange={handleInputChange}
            onSubmit={() => handleSubmit()}
            onSend={handleSend}
            onFilesSelected={handleFilesSelected}
            onRemoveFile={handleRemoveFile}
            onStop={() => stop()}
          />
        </div>

        {/* Right column — mock CJTS claim form (~40%) */}
        <aside className="hidden w-[40%] min-w-[320px] max-w-[560px] shrink-0 flex-col border-l border-border bg-muted/20 md:flex">
          <CJTSFormCard
            formData={formData}
            isConfirmed={isConfirmed}
            onVerify={() => setIsConfirmed(true)}
          />
        </aside>
      </div>

      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-50">
          <button
            type="button"
            aria-label="Close checklist"
            className="absolute inset-0 bg-foreground/40 backdrop-blur-sm"
            onClick={() => setMobileSidebarOpen(false)}
          />
          <div className="absolute inset-y-0 right-0 flex w-[85%] max-w-sm flex-col border-l border-sidebar-border bg-sidebar shadow-xl">
            <div className="flex items-center justify-between border-b border-sidebar-border px-4 py-3">
              <span className="font-display text-sm font-semibold text-foreground">
                Case Checklist
              </span>
              <button
                type="button"
                aria-label="Close checklist"
                onClick={() => setMobileSidebarOpen(false)}
                className="grid size-8 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            </div>
            <div className="min-h-0 flex-1">
              <FactsSidebar facts={facts} />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
