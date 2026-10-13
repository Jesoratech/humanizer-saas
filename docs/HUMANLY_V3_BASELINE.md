# HUMANLY V3 — BASELINE AUDIT & VERIFICATION REPORT

## 1. System Request Flow Inspection

The request flow of the existing Humanly SaaS application was traced end-to-end across both the local Vite development server and the Cloudflare Pages Functions production target:

1. **Editor State (`src/app/EditorPage.tsx`):**
   - React state holds `sourceText`, `tone`, `strength`, `audience`, `preserveStructure`, `userIntent`, `protectedTermsInput`, and `promptVersion`.
   - Client validates non-empty input and word count (`maxWordsDefault: 800`).
2. **Humanize Button Handler (`handleSubmit`):**
   - Cleans protected terms into an array of trimmed strings.
   - Instantiates an `AbortController` to allow client-side request cancellation.
   - Dispatches the payload to the API client.
3. **API Client (`src/client/api.ts` -> `humanizeText`):**
   - Retrieves active Supabase auth session token (if logged in) and attaches `Authorization: Bearer <jwt>`.
   - Calls `POST /api/v1/humanize`.
4. **Backend Gateway:**
   - **Local Dev:** `src/server/dev-middleware.ts` intercepts `/api/v1/humanize`.
   - **Cloudflare Pages Production:** `functions/api/v1/humanize.ts` handles `onRequestPost`.
5. **Authentication, Kill Switch & Quotas:**
   - Evaluates `MODEL_REQUESTS_ENABLED` (kill switch). If false, responds with HTTP 503.
   - Extracts user ID from JWT if present; falls back to SHA-256 hashed client IP (`CF-Connecting-IP` or `x-forwarded-for`).
   - Validates sliding window rate limit and daily quota (`checkAndIncrementUsage` in `src/server/rate-limiter.ts`). Rejects over-quota requests with HTTP 429.
6. **Input Schema Validation (`src/shared/schemas.ts`):**
   - Validates payload against `humanizeRequestSchema` (text length 1–20,000 chars, validated tone, audience, strength enums).
7. **Prompt Engine Dispatcher (`src/server/prompts/index.ts`):**
   - Dispatches to engine based on `promptVersion` (`v1` or `v2`).
   - Constructs `systemPrompt`, `userPrompt`, `temperature`, and `topP`.
8. **Upstream Model Adapter (`src/server/humanizer.ts`):**
   - Calls Google Gemini API (`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`).
   - Extracts candidates: `data.candidates?.[0]?.content?.parts?.[0]?.text`.
9. **Deterministic Output Validator (`src/server/validator.ts`):**
   - Strips accidental envelope wrappers (`<draft_to_edit>`, accidental markdown code fences).
   - Validates existence, checks for degenerate repetitive loops, flags missing URLs, citations, code spans, protected terms, and numerical discrepancies.
   - Performs a bounded single retry if critical URLs are omitted or response is empty.
10. **Structured Diagnostic Logging & Response:**
    - Emits structured latency and word count metrics (`src/server/logger.ts`) without recording raw draft content or secrets.
    - Returns `HumanizeResponse` with sanitized rewrite, warnings, and metadata.
11. **Frontend State Update:**
    - Renders editable rewrite in output panel, displays warning badges if entity discrepancies are detected, allows rating/feedback.

---

## 2. Environment & Model Verification

- **Configured Model Identifier:** `gemini-3.5-flash-lite` (verified working in Google Gemini API v1beta).
- **Deprecated Model Identified:** `gemini-2.0-flash` returns HTTP 404 in current Google AI Studio tier; codebase was properly migrated to `gemini-3.5-flash-lite`.
- **Live Endpoint Test:** Verified via live curl against `http://localhost:5173/api/v1/humanize` (Status: 200 OK, latency: ~1088ms).
- **Test Suite Status:** 32 of 32 Vitest unit and integration tests passing.

---

## 3. Verified Gaps and Defects in Baseline (v1 / v2)

The baseline audit identified several structural and editorial deficiencies:

| Component | Baseline Finding (v1 / v2) | V3 Requirement |
| :--- | :--- | :--- |
| **Document Type Context** | Completely missing. All inputs are treated as generic prose regardless of whether they are academic papers, technical documentation, or emails. | Add explicit `documentType` selector (`general_prose`, `academic_abstract`, `literature_review`, `methodology`, `discussion_conclusion`, `professional_email`, `technical_doc`, `marketing_copy`, `conversational`). |
| **Voice Preferences** | Only coarse `tone` and `audience` selectors. No fine-grained formality, directness, conciseness, or technical depth controls. | Add structured `voicePreferences` object in schema and prompt. |
| **Protected Content Pipeline** | Post-hoc validation only: `validator.ts` checks whether URLs or citations were dropped after the model has already processed the text. If the model modifies a URL or citation, it can only warn or retry. | Implement **pre-processing placeholder extraction** (`__HUMANLY_URL_0__`, `__HUMANLY_CITE_0__`, `__HUMANLY_CODE_0__`) followed by post-processing restoration with strict single-use verification. |
| **Editing Modes Differentiation** | v2 differentiates editing strengths primarily via temperature jumps (0.35 to 0.85) and high-level descriptions. | Provide distinct editorial instructions per mode (Light: repair awkwardness only; Balanced: improve clarity/transitions; Strong: structural reorganization) while keeping temperature bounded for stability. |
| **Anti-AI Prompting Strategy** | v2 uses an anti-cliche blacklist ("trailing participial clauses", "mechanical transitions") which can distort valid natural writing and technical prose. | Transition to an **editorial-objective quality engine**: focus on communicative intent, clarity, authentic cadence, and semantic fidelity without universal blacklists or artificial quirks. |
| **Feedback Categories** | Feedback widget only supports 1–5 star rating with hardcoded `category: 'quality'`. | Add user-selectable diagnostic feedback categories (`meaning_changed`, `too_formal`, `too_casual`, `too_verbose`, `unclear_wording`, `awkward_result`, `good_result`, `other`). |
| **Prompt Versioning** | Only `v1` and `v2` are registered. | Preserve `v1` and `v2` intact for regression testing and register `v3` as the default editorial engine. |

---

## 4. Initial Test Baseline Record

```text
Test Files: 6 passed (6)
Tests: 32 passed (32)
Duration: ~234ms
```
All baseline tests pass. V3 implementation retained backward compatibility for v1 and v2 while expanding test coverage.

---

## 5. Post-Upgrade Verification & Comparative Results

Following the implementation of Humanly V3, the test suite was expanded to 41 comprehensive tests:

```text
Test Files: 6 passed (6)
Tests: 41 passed (41)
Duration: ~280ms
```

### Live Controlled Comparison (v1 vs v2 vs v3 on Identical Input):

- **Sample Input (53 words):**
  > *"In today's fast-paced digital era, it is of utmost importance to understand that artificial intelligence serves as a pivotal cornerstone for modern enterprises, allowing users to streamline operational workflows and fostering an environment of seamless innovation. Furthermore, our platform leverages cutting-edge algorithms to unlock the power of data. Visit https://humanly.app/docs to learn more."*

| Metric | humanize.v1 | humanize.v2 | humanize.v3 |
| :--- | :--- | :--- | :--- |
| **Output Word Count** | 30 words | 34 words | 36 words |
| **Latency** | 1,314 ms | 1,738 ms | 1,136 ms |
| **Protected Entities** | 0 extracted | 0 extracted | 1 extracted & restored |
| **URL Preservation** | Post-hoc check | Post-hoc check | Deterministic placeholder round-trip |
| **Prompt Style** | Keyword blacklist | Anti-cliche rules | Research-informed editorial directives |
| **Voice / Doc Context** | None | Tone & Audience | Document type + 4-axis voice preferences |
| **Prompt Injection Defense**| None | Input tags | Isolated boundary & anti-override directives |

