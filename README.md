# ForgeMind — The PM De-Tutorializer

> *"You learned it. Now prove you can use it."*

ForgeMind strips away your reference notes, cheat sheets, and passive tutorials, dropping you into realistic, unreferenced Product Management workplace edge cases to diagnose, test, and prove your actual PM execution capabilities.

---

## The Core Philosophy: Escaping the "Tutorial Trap"

Traditional online courses, YouTube walkthroughs, and tutorial threads create an **"illusion of competence"**: learners read an ideal solution, nod along, and assume they can execute it under pressure. When dropped into a messy workplace dilemma, they freeze.

**ForgeMind enforces Zero-Reference Execution:**
1. **Study First:** Bring what you just studied (notes, articles, PDFs, PRDs, or YouTube videos).
2. **Notes Wiped:** Once the latent capability model and reasoning milestones are extracted, your reference notes are wiped.
3. **Crucible Challenge:** You must formulate an unassisted executive decision memo against an unfamiliar, high-stakes scenario.
4. **Diagnostic Evidence Audit:** Evaluated against 4 structural milestones with grounded evidence quotes, blindspot detection, and a gated 5-tier progressive hint ladder.

---

## Key Features

### 1. Dual Evaluation Grounds
- **Bring Your Material:** Feed messy notes, technical whitepapers, PRDs, or paste any YouTube URL. The system automatically normalizes transcripts, extracts the core mental model, and generates a novel workplace scenario.
- **Curated Library:** Access battle-tested PM mental models across Product Strategy, Product Discovery, Growth & Analytics, and Execution (e.g. *The Mom Test*, *North Star Metric Architecture*, *RICE Prioritization*).

### 2. Multi-Tier YouTube Ingestion
- High-speed caption extraction via YouTube's timedtext API (`youtube-transcript`) — processes 2,000+ words in under 0.5 seconds without downloading heavy media files.
- Official metadata resolution via YouTube's public oEmbed endpoint.
- Automated multimodal audio fallback via Gemini Speech-to-Text.

### 3. Novel Challenge Synthesis Engine
- Breaks challenges into 4 targeted micro-questions, each directly mapping to an observable capability milestone.
- Employs realistic constraints, stakeholder friction, and edge cases to test defensibility rather than trivia recall.

### 4. Semantic Evaluation & Defense Guardrails
- **Multi-Provider Fallback:** Google Gemini Flash &rarr; OpenRouter &rarr; NVIDIA NIM &rarr; Deterministic Heuristic Safeguard.
- **Canary Token Defense:** Nonce injection detection prevents prompt leak attempts and adversarial jailbreaks.
- **Strict Quarantine Rule:** Genuine attempts (> 35 characters) are evaluated as `PARTIALLY_CORRECT` or `WRONG_APPROACH`, never frozen in `NEEDS_CLARIFICATION`.
- **Character Ceiling Safeguard:** 10,000-character capacity with live count indicator and one-click auto-trim.

### 5. Progressive Hint Ladder & Tier-4 Override Gate
- **5-Tier Ladder:** Nudge &rarr; Direction &rarr; Concept &rarr; Structure &rarr; Master Solution.
- **Anti-Spoonfeeding Gating:** Hints unlock progressively with each substantive attempt.
- **Tier-4 Override Gate:** The canonical reference solution remains strictly locked until Tier 4 is reached.

### 6. Observability & Telemetry
- Native **Langfuse** distributed tracing for prompt tracking, model latency, token usage, and fallback event inspection.
- Supabase persistence for attempt history, defensibility scoring, and 21-day retention decay probe scheduling.

---

## Tech Stack

- **Framework:** Next.js 16 (App Router with Turbopack)
- **UI & Styling:** React 19, Tailwind CSS v4 (`@theme` tokens), Lucide Icons, Motion
- **AI & Models:** `@google/genai` (Gemini 3.5 Flash), OpenRouter, NVIDIA NIM
- **Content Parsers:** `youtube-transcript`, `pdf-parse`, `mammoth` (DOCX), `play-dl`
- **Observability:** Langfuse Tracing SDK (`langfuse`)
- **Database:** Supabase (`@supabase/supabase-js`)
- **Testing:** Node Native Test Runner, Promptfoo LLM Evals, Playwright E2E

---

## Getting Started

### Prerequisites
- Node.js 20+ installed
- npm or pnpm

### Installation
```bash
git clone https://github.com/mohanccse/forgemind.git
cd forgemind
npm install
```

### Environment Configuration
Create a `.env.local` file in the root directory:

```env
# Gemini API Key (Required for challenge generation & AI evaluation)
GEMINI_API_KEY=your_gemini_api_key

# Secondary Fallback Providers (Optional)
OPENROUTER_API_KEY=your_openrouter_key
NVIDIA_NIM_API_KEY=your_nvidia_nim_key

# Observability & Tracing (Optional - cloud.langfuse.com)
LANGFUSE_PUBLIC_KEY=pk-lf-...
LANGFUSE_SECRET_KEY=sk-lf-...
LANGFUSE_HOST=https://cloud.langfuse.com

# Persistence (Optional - Supabase)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

### Running Locally
```bash
# Start Next.js development server
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Available Scripts

| Command | Description |
| :--- | :--- |
| `npm run dev` | Starts local Next.js development server with Turbopack |
| `npm run build` | Compiles optimized production build |
| `npm start` | Runs the compiled production server |
| `npm test` | Runs the full unit & evaluation guardrail test suite |
| `npm run lint` | Runs TypeScript type checking (`tsc --noEmit`) |
| `npm run eval` | Runs Promptfoo automated LLM benchmark suite |
| `npm run test:e2e`| Runs Playwright end-to-end integration tests |

---

## Project Structure

```
forgemind/
├── public/                     # Static assets, branding & icons
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── evaluate-attempt/          # Core evaluation endpoint & guardrails
│   │   │   ├── generate-challenge/        # Novel scenario synthesis
│   │   │   └── study-material/            # Ingestion (normalize, YouTube, PDF)
│   │   ├── globals.css                    # Tailwind CSS v4 design tokens
│   │   └── layout.tsx                     # Root application layout
│   ├── components/
│   │   ├── assessment/                    # Crucible memo, hint ladder, results
│   │   ├── ChallengePage.tsx              # Active scenario controller
│   │   ├── Header.tsx                     # Top navigation & brand wordmark
│   │   ├── HomePage.tsx                   # Diagnostic studio & ingestion
│   │   └── StudyMaterialPage.tsx          # Bring Your Material workflow
│   ├── data/
│   │   └── concepts.ts                    # Curated PM capability library
│   ├── hooks/
│   │   └── useAssessmentEngine.ts         # Crucible state machine & draft auto-save
│   ├── lib/
│   │   ├── gemini.ts                      # GenAI client with retry/backoff
│   │   ├── llm-client.ts                  # Multi-provider LLM client with Langfuse
│   │   └── supabase-store.ts              # Attempt logging & persistence
│   └── utils/
│       ├── evaluationValidator.ts         # Schema assertion & repair
│       └── sanitizer.ts                   # Input boundaries & filler filtering
└── tests/
    ├── evaluation-guardrails.test.ts      # Core unit & security test suite
    └── promptfoo/                         # LLM eval cases & benchmark rubrics
```

---

## License

Private Prototype & Evaluation Sandbox. All rights reserved.
