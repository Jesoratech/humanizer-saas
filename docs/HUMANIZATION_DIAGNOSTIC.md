# Humanly — Humanization Engine Diagnostic & Architectural Audit

**Document Version:** 1.0.0  
**Audit Date:** October 2026  
**Status:** Complete Audit & Root Cause Analysis

---

## 1. Executive Summary

This diagnostic investigates why text rewritten by Humanly can still be flagged as "AI-generated" by external detection systems (e.g. GPTZero, ZeroGPT, CopyLeaks, Turnitin). 

Our audit establishes that:
1. **The application genuinely calls Google's Gemini Developer API.** There are no mock providers, hardcoded demo responses, or fake rewrite generators in production.
2. The core issue is **linguistic and structural, stemming from the prompt and editing architecture**:
   - The baseline prompt (`humanize.v1`) instructed the model to *avoid specific buzzwords* ("delve", "testament", "tapestry"), but left the underlying **syntactic cadence, clause structure, and burstiness patterns** typical of Large Language Models completely intact.
   - The editing strength settings (`light`, `balanced`, `strong`) relied almost entirely on temperature adjustments (`0.4` to `0.85`) rather than fundamentally distinct structural transformations.
   - The editor lacked any **user intent or authorial context** input. In the absence of an author's distinct purpose or perspective, the model performs generic semantic paraphrasing—and generic LLM paraphrasing matches the exact statistical token distributions that AI detectors look for.
   - The user's input text was concatenated directly without structural isolation, leaving it vulnerable to stylistic inertia and instruction bleed.

---

## 2. Request Lifecycle Trace (Single Request End-to-End)

```
[1. User Action]
User types text in EditorPage.tsx -> Clicks "Humanize"
  │
  ▼
[2. Frontend Handler]
handleSubmit() (EditorPage.tsx:69)
- Validates text length (1 to 800 words)
- Sets loading state, instantiates AbortController
- Packages payload: { text, tone, audience, strength, preserveStructure }
  │
  ▼
[3. Client API Layer]
humanizeText() (src/client/api.ts:56)
- Fetches session token from Supabase Auth (if logged in)
- Attaches Authorization: Bearer <token> (optional)
- Dispatches HTTP POST to /api/v1/humanize
  │
  ▼
[4. Backend Dispatcher]
Local Dev: dev-middleware.ts (Vite Dev Server plugin)
Production: functions/api/v1/humanize.ts (Cloudflare Pages Function)
- Verifies kill switch: MODEL_REQUESTS_ENABLED !== 'false'
- Reads server-side GEMINI_API_KEY and GEMINI_MODEL
- Validates payload against humanizeRequestSchema (Zod)
- Computes SHA-256 IP hash for GDPR-compliant rate limiting
- Checks daily quota (3 requests/day) and word limits
  │
  ▼
[5. AI Humanizer Engine]
executeHumanize() (src/server/humanizer.ts:94)
- Calls buildHumanizerPrompt(request)
- Constructs System Instruction with Tone, Strength, and Audience rules
- Dispatches HTTPS POST to Google Gemini API:
  https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}
  │
  ▼
[6. Response Parsing & Validation]
- Parses Gemini candidate parts text
- Strips any accidental markdown code fence wrappers
- Calculates original vs rewritten word counts
- Appends length disparity warnings if text collapsed or expanded (>50%)
- Returns HumanizeResponse JSON
  │
  ▼
[7. Frontend State Display]
handleSubmit() receives JSON
- setResult(response)
- setEditedResult(response.rewrittenText) (enabling direct user edits)
- Toasts any warnings; renders word count and character count
```

---

## 3. Implementation Inventory

| Component | File Path | Current Role | Defect / Limitation Identified |
| :--- | :--- | :--- | :--- |
| **Frontend Editor** | `src/app/EditorPage.tsx` | UI input, controls, dual pane | Lacks input for author intent, key terms to protect, and visual diff |
| **Client API** | `src/client/api.ts` | Fetch wrapper, token injection | Clean; does not leak secrets |
| **Local Dev Server** | `src/server/dev-middleware.ts` | Connect middleware for Vite | Clean; mirrors Cloudflare Functions exactly |
| **Edge Function** | `functions/api/v1/humanize.ts` | Cloudflare Pages handler | Does not perform deterministic entity validation |
| **AI Humanizer** | `src/server/humanizer.ts` | Prompt builder and API caller | Prompt v1 relies on negative buzzword list; lacks syntactic de-robotification |
| **Rate Limiter** | `src/server/rate-limiter.ts` | In-memory + Supabase tracker | Working properly; hashes IPs securely |
| **Data Schemas** | `src/shared/schemas.ts` | Zod validation & TypeScript types | Missing `userIntent`, `protectedTerms`, and `promptVersion` fields |

---

## 4. Root Causes Established by Evidence

### Root Cause 1: Negative Keyword Filtering vs. Syntactic Cadence
In `humanizer.ts` (v1), the system prompt instructed:
`Avoid cliches like: delve, testament, tapestry, beacon, moreover, furthermore, in conclusion...`
While eliminating those specific words is helpful, **AI detectors do not rely primarily on keyword blacklists**. Modern detectors analyze:
1. **Perplexity** (measure of how likely each subsequent token is according to a standard LLM).
2. **Burstiness** (variation in sentence lengths and structural complexity across a text).

Standard LLM rewrites exhibit:
- Monotonous sentence lengths (clustering tightly around 16–22 words).
- Overuse of trailing participial clauses (`..., ensuring seamless alignment across teams`).
- Symmetrical compound sentences connected with coordinate conjunctions.
- Predictable topic-sentence-first paragraph structures.

Because prompt v1 merely told the model to "vary sentence lengths dramatically" without concrete syntactic rules, the model fell back to its default training distribution.

### Root Cause 2: Superficial Editing Strength Differences
In prompt v1, the difference between `light`, `balanced`, and `strong` was controlled by:
- A one-sentence string difference in the prompt.
- Temperature changes (`0.4` for light, `0.65` for balanced, `0.85` for strong).

Temperature alone does **not** command an LLM to restructure clauses. In `light` mode, the model made cosmetic synonym replacements on already-AI text, leaving 90% of the AI syntactic skeleton intact. In `strong` mode, higher temperature introduced randomness rather than purposeful structural revision.

### Root Cause 3: The Paraphrasing Vacuum (Lack of Authorial Intent)
Human writing is shaped by a human mind with a specific intention, stance, and communicative goal. When an AI is asked to "humanize" text in a vacuum without knowing *what the author wants to emphasize* or *who they are*, it can only produce an abstract paraphrase. Abstract paraphrases are the signature output of AI tools.

### Root Cause 4: Lack of Protected Entity Preservation
The existing engine had no deterministic mechanism to verify that:
- URLs and Markdown links were preserved intact.
- Code snippets and formulas were untouched.
- Key dates, numerical metrics, and proper names were not corrupted.
- Citations (e.g. `[1]`, `(Smith, 2024)`) were maintained.

---

## 5. Upgrade Strategy

To elevate Humanly into a genuine natural-writing editor:
1. **Implement Centralized Prompt Versioning**: Retain `humanize.v1` as the benchmark, and create `humanize.v2` with deep syntactic de-robotification and structural burstiness rules.
2. **Make Editing Strength Concrete**: Distinct transformation mandates for Light (surgical grammar/clarity, >85% structure preserved), Balanced (rhythm and transition overhaul), and Strong (narrative restructuring while preserving factual integrity).
3. **User-Owned Voice & Intent**: Introduce optional `userIntent` ("What do you want this passage to communicate?") and `protectedTerms` (words/phrases to keep unaltered).
4. **Deterministic Post-Generation Validation**: Check URLs, code blocks, citations, numbers, dates, and length anomalies before presenting output. Bounded auto-retry (max 1) for objective errors.
5. **Privacy-Safe Diagnostic Logging**: Structured telemetry recording request IDs, model identifiers, durations, word counts, and error categories without ever logging user text or secrets.
6. **100-Passage Quality Evaluation Suite**: Reproducible baseline vs. revised comparison across 10 distinct text domains.
