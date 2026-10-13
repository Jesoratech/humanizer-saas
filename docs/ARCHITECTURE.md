# HUMANLY V3 — ARCHITECTURE & EDITORIAL PIPELINE

## 1. System Architecture Overview

Humanly V3 is an AI writing refinement SaaS engineered for natural writing quality, semantic fidelity, authorial intent, and content preservation. It operates under a strict **zero-additional-spend** constraint, deploying on Cloudflare Pages Functions and Supabase while communicating with the Google Gemini Developer API.

```
┌─────────────────────────────────────────────────────────────────┐
│                      FRONTEND (React + Vite)                   │
│   EditorPage.tsx  ──  AuthPage.tsx  ──  DashboardPage.tsx      │
│   (Document Type, Tone, Strength, Voice Prefs, Intent, Diff)    │
└─────────────────────────────────┬───────────────────────────────┘
                                  │ HTTPS JSON (POST /api/v1/humanize)
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                     GATEWAY / API LAYER                        │
│   Cloudflare Pages Function (functions/api/v1/humanize.ts)      │
│   [Dev: Vite Dev Middleware (src/server/dev-middleware.ts)]    │
│   ├── Kill Switch Validation (MODEL_REQUESTS_ENABLED)           │
│   ├── Client Identification (Bearer JWT or SHA-256 IP Hash)    │
│   ├── Quota & Sliding-Window Rate Limiting (rate-limiter.ts)   │
│   └── Input Schema Enforcement (src/shared/schemas.ts)         │
└─────────────────────────────────┬───────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│               STAGE-BASED EDITORIAL PIPELINE                    │
│                                                                 │
│  Stage A: Input Validation & Sanitization                       │
│  Stage B: Author Intent & Style Directives                      │
│  Stage C: Document-Type Contextual Grounding                    │
│  Stage D: Protected Content Extraction (validator.ts)          │
│           (URLs, code blocks, citations, LaTeX math → tokens)   │
│  Stage E: Prompt Construction (src/server/prompts/v3.ts)        │
│           (Isolated in <draft_to_edit>...</draft_to_edit>)      │
│  Stage F: Upstream Model Call (Google Gemini Developer API)    │
│           (gemini-3.5-flash-lite, stable bounded temperatures)  │
│  Stage G: Deterministic Content Restoration (validator.ts)     │
│           (Single-use placeholder verification & token restore) │
│  Stage H: Structural & Semantic Validation (validator.ts)       │
│           (Numerical discrepancy checks, repetition loops)      │
│  Stage I: Structured Diagnostic Logging (logger.ts)             │
│           (Latency, token ratios; prose & secrets excluded)     │
└─────────────────────────────────┬───────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                 USER REVIEW & EDITORIAL WORKFLOW                │
│   Editable Text View  ──  Side-by-Side Comparison Diff View     │
│   Discrepancy Notices  ──  Diagnostic Feedback Categorization   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. Nine-Stage Editorial Processing Pipeline

### Stage A: Input Validation
Validates request payload with `humanizeRequestSchema`:
- Text length bounded (1 to 20,000 characters).
- Verified enum membership for `tone`, `audience`, `strength`, and `documentType`.
- Validated voice preferences (formality, directness, conciseness, technical depth).
- Bounded author intent string (<= 500 characters).
- Maximum 30 user-defined protected terms (each <= 100 characters).

### Stage B: Author Intent Context
Translates the user's communicative objective into explicit editorial priorities:
- Identifies which thesis deserves emphasis.
- Establishes reader expectations and perspective.
- Enforces strict factual fidelity: if the intent conflicts with facts in the draft, factual truth is prioritized and conflicts are not hallucinated away.

### Stage C: Document-Type Grounding
Selects from 9 domain-specific editorial profiles:
1. `general_prose`: Balanced exposition and natural narrative pacing.
2. `academic_abstract`: High density; clear division of objective, method, results, and implications.
3. `literature_review`: Critical comparative synthesis; scholarly attribution and comparative nuance.
4. `methodology`: Replicable procedural precision; exact instruments and parameters.
5. `discussion_conclusion`: Epistemic modesty; interpretations, limitations, and future work.
6. `professional_email`: Concise, polite, actionable; unambiguous next steps.
7. `technical_doc`: Unambiguous precision; exact commands, API identifiers, and specifications.
8. `marketing_copy`: Value proposition framing without unsubstantiated superlatives or fake stats.
9. `conversational`: Relatable idioms, natural cadence, and relaxed syntax.

### Stage D: Protected Content Extraction
Before passing text to the LLM, regex extractors identify tokens that must not be altered:
- URLs: `https?://[^\s)\]]+` -> `__HUMANLY_PROT_URL_{i}__`
- Code blocks: ```` ```[\s\S]*?``` ```` -> `__HUMANLY_PROT_CODE_BLOCK_{i}__`
- Inline code: `` `[^`]+` `` -> `__HUMANLY_PROT_INLINE_CODE_{i}__`
- LaTeX / Math expressions: `$$...$$`, `$...$` -> `__HUMANLY_PROT_MATH_{i}__`
- Academic citations: `[1, 2]`, `(Author et al., 2024)` -> `__HUMANLY_PROT_CITE_{i}__`

### Stage E: Prompt Construction & Injection Defense
Constructs typed prompt configurations with clear security boundaries:
- User draft is wrapped in `<draft_to_edit>...</draft_to_edit>`.
- System instructions explicitly forbid executing user prose as commands.
- Banned anti-AI templates and universal blacklists are replaced by purposeful developmental editing instructions.

### Stage F: Model Inference
- Upstream Provider: Google Gemini Developer API (`gemini-3.5-flash-lite`).
- Generates rewrite under stable bounded temperature settings (Light: 0.35, Balanced: 0.60, Strong: 0.75).
- Single model call architecture; zero external paid classifiers or multi-model cascades.

### Stage G: Deterministic Content Restoration
- Replaces every placeholder with the exact source entity using literal replacers (`() => entity.original`).
- Verifies single-use integrity (detects missing or duplicated placeholders).
- If an entity is omitted by the model, records an itemized warning.

### Stage H: Structural Validation
- Sanitizes wrapper envelopes.
- Detects degenerate repetitive loops.
- Compares numbers, dates, currencies, and percentages to warn about altered figures.
- Evaluates word count ratios (warns if output collapses below 45% or expands past 165%).

### Stage I: User Review & Feedback
- Output is rendered in an editable textarea or side-by-side comparison diff view.
- Diagnostic feedback categorizes quality issues (`meaning_changed`, `too_formal`, `too_casual`, `too_verbose`, `unclear_wording`, `awkward_result`, `good_result`, `other`).
