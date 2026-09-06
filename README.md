# ⚖️ CJTS Pre-Filing Copilot

An AI-assisted intake copilot that guides **Self-Represented Persons (SRPs)** in Singapore
through preparing a **Small Claims Tribunals (SCT)** claim for submission via the
**Community Justice and Tribunals System (CJTS)** — with a live, evidence-traceable
draft form that fills itself in as you chat.

> ⚠️ **Disclaimer** — This tool provides procedural guidance only. It is not legal
> advice and cannot predict case outcomes. The draft form is a **mock preview**;
> final submission must be made via the official CJTS portal with Singpass.

![Next.js](https://img.shields.io/badge/Next.js-16-000000?logo=nextdotjs)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?logo=typescript&logoColor=white)
![Vercel AI SDK](https://img.shields.io/badge/Vercel_AI_SDK-7-000000)
![Google Gemini](https://img.shields.io/badge/Google_Gemini-API-4285F4?logo=googlegemini&logoColor=white)
![Zod](https://img.shields.io/badge/Zod-4-3068B7?logo=zod&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-38BDF8?logo=tailwindcss&logoColor=white)

---

## ✨ Features

- **💬 Guided 6-step intake** — eligibility → parties → agreement → breach →
  damages → pre-filing summary, one question at a time, with reflective listening.
- **📝 Live Draft CJTS Form** — auto-populates in real time as facts are confirmed,
  via AI tool calling (`update_claim_form`) with a strict Zod schema.
- **🔎 Evidence Traceability** — every extracted fact carries a `[Source: …]` tag
  (a named attached document or a dated user statement). Aligned with the
  Singapore Courts' *Guide on the Use of Generative AI Tools by Court Users* —
  no fabricated evidence, and the human user stays responsible for verification.
- **📎 Document upload** — images are downscaled & re-encoded client-side
  (max 1600px JPEG) so replies stay fast; 15 MB guard; PDFs & other documents
  pass through for Gemini's multimodal reading.
- **📊 Filing-readiness checklist** — deterministic client-side fact extraction
  drives a live checklist + circular progress meter.
- **🟡→🟢 Working Draft → Verified** — explicit verify step; "Copy Form Text for
  CJTS" exports the verified draft with per-fact source citations.
- **🧹 Fresh session per load** — no chat persistence; nothing you type is stored
  on a server. The Gemini free tier (~20 requests/day/model) is respected with a
  switchable `GEMINI_MODEL` and a 120 s watchdog + Stop button.

## 🧭 How the intake works

| Step | What is captured |
|:---:|---|
| 1 | **Eligibility** — 2-year limitation, ≤ $20,000 principal, SCT dispute category (with ineligible-category referral, e.g. ECT for employment wages) |
| 2 | **Parties** — claimant & respondent identity, addresses, UEN |
| 3 | **Agreement** — date, form (written/verbal/WhatsApp/email), repayment terms |
| 4 | **Breach** — what went wrong, exact dates, category reconfirmation |
| 5 | **Damages** — exact amount + itemised breakdown |
| 6 | **Pre-Filing Summary** — timeline, evidence checklist, verification disclaimer |

## 🔎 Evidence traceability

Every field the AI writes into the form is a `{ value, source }` object enforced by
the tool's Zod schema — e.g.

```json
"claimAmount": { "value": 10000, "source": "User statement (15 Jun 2026)" }
```

The form renders it as: **Claim Amount (SGD): $10,000** `[Source: User statement (15 Jun 2026)]`.
Sources cite the named attachment (e.g. `Invoice_IMG_123.jpg`) or a dated user
statement, and `claimSummary` is rendered as a sterile, chronological, numbered
list with colloquialisms translated into neutral phrasing.

## 🛠️ Tech stack

| Layer | Technology |
|---|---|
| Framework | [Next.js 16](https://nextjs.org) (App Router, Turbopack) |
| UI | [React 19](https://react.dev), [Tailwind CSS v4](https://tailwindcss.com), [shadcn/ui](https://ui.shadcn.com) (base-nova) + [Base UI](https://base-ui.com), [Lucide icons](https://lucide.dev) |
| AI | [Vercel AI SDK v7](https://sdk.vercel.ai) — `useChat`, `streamText`, `tool()` |
| LLM | [Google Gemini API](https://ai.google.dev) — `gemini-3.5-flash-lite` (configurable) |
| Validation | [Zod 4](https://zod.dev) |
| Language | [TypeScript 5.7](https://www.typescriptlang.org) |
## 🚀 Getting started

### Prerequisites
- **Node.js 22+** (tested on v24) and **npm**
- A **Google AI Studio API key** — [create one free](https://aistudio.google.com/apikey)

### Install & run

```bash
git clone <your-repo-url>
cd pre-filing-copilot-v2
npm install
```

Create **`.env.local`** in the project root:

```env
GOOGLE_GENERATIVE_AI_API_KEY=AIzaYourKeyHere
# Optional — switch models for a fresh free-tier quota (~20 req/day per model):
# GEMINI_MODEL=gemini-3.7-flash
```

```bash
npm run dev        # → http://localhost:3000
```

Production build:

```bash
npm run build
npm start
```

## ⚙️ Environment variables

| Variable | Required | Description |
|---|:---:|---|
| `GOOGLE_GENERATIVE_AI_API_KEY` | ✅ | Google AI Studio key (must start with `AIza`). Free tier: ~20 requests/day per model. |
| `GEMINI_MODEL` | — | Override the model (default `gemini-3.5-flash-lite`). Each model has its own daily free quota. |

## 📁 Project structure

```
app/
├── api/chat/route.ts      # POST /api/chat — Gemini streaming + update_claim_form tool
├── layout.tsx             # Root layout, fonts, metadata
├── globals.css            # Tailwind v4 theme + design tokens
└── page.tsx               # Chat ↔ live form ↔ checklist wiring, state, pruning
components/
├── copilot/
│   ├── app-header.tsx     # Top bar (case ref, readiness %, checklist toggle)
│   ├── chat-panel.tsx     # Message list, error banner, stop/watchdog UI
│   ├── composer.tsx       # Textarea, file attach, suggestion chips
│   ├── cjts-form.tsx      # Live Draft CJTS form (source tags, verify, copy)
│   ├── facts-sidebar.tsx  # "Filing readiness" checklist drawer
│   ├── fact-row.tsx / readiness-meter.tsx
│   ├── message-item.tsx   # Message bubbles, image attachments, typing dots
│   ├── assistant-markdown.tsx / rich-text.tsx
└── ui/button.tsx
lib/
├── attachments.ts         # FileReader → data URLs + client-side image compression
├── facts.ts               # Deterministic readiness extraction from the chat
├── copilot.ts             # Fact checklist model (groups + readiness %)
└── utils.ts
```

## 🔧 How the AI layer works

1. `useChat` (AI SDK v7) posts the conversation to **`/api/chat`**.
2. `route.ts` converts UI messages with `convertToModelMessages` and calls
   **`streamText`** on Gemini with the `update_claim_form` **tool** (Zod schema).
3. When the model confirms a fact, it calls the tool with `{ value, source }`
   per data-point; the server executes it and streams the result back.
4. The client renders the reply and the form panel updates. If a turn ends
   `tool-calls` without text, the client auto-resubmits once to fetch the reply.
5. Attachments are compressed client-side first; old image payloads are pruned
   from subsequent requests so latency stays low as the chat grows.

## ⚠️ Limitations

- **Free-tier quota** — ~20 requests/day per Gemini model; switch `GEMINI_MODEL`
  for a fresh quota or use a paid key.
- **No server persistence** — refreshing starts a new chat (by design, privacy).
- **Mock form** — the form is a preview; filing happens on the official CJTS portal.
- The AI follows its instructions closely but is **not guaranteed** to never
  deviate — all extracted facts are shown with sources so you can verify them.

## 📄 License

_[Add your chosen license here — e.g. MIT.]_

## 🙏 Acknowledgements

- Scaffolded with [v0](https://v0.dev); further development with
  [Cline](https://cline.bot) (AI coding agent) in VS Code.
- Guide reference: [Singapore Courts — Guide on the Use of Generative AI Tools by Court Users](https://www.judiciary.gov.sg).