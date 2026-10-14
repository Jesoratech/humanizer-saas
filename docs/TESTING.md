# HUMANLY V3 — TESTING & EVALUATION GUIDE

## 1. Test Architecture Overview

The Humanly test suite employs a multi-tiered testing strategy structured into distinct categories to guarantee correctness without incurring unnecessary API spend:

| Category | File Path | Focus | Execution Cost |
| :--- | :--- | :--- | :--- |
| **Unit Tests (Schemas & Limiter)** | `src/test/schemas.test.ts`<br>`src/test/rate-limiter.test.ts` | Validates Zod schemas, defaults, IP hashing, sliding-window rate limits, and daily caps | Zero (Local Vitest) |
| **Unit Tests (Validator Pipeline)** | `src/test/validator.test.ts` | Tests placeholder extraction, nonce collision defense, URL punctuation stripping, citation formats, and math preservation | Zero (Local Vitest) |
| **Prompt Architecture Tests** | `src/test/baseline-comparison.test.ts` | Asserts structural differences between v1, v2, and v3 prompt configurations and directives | Zero (Local Vitest) |
| **Structural Corpus Tests** | `src/test/evaluator.test.ts` | Evaluates prompt generation and entity round-tripping across 100 corpus samples (Structural assertions, NOT quality assertions) | Zero (Local Vitest) |
| **Quality Benchmark Tests** | `src/test/quality-benchmark.test.ts` | Asserts V3.1 prompt generation, voice injection, and placeholder integrity across 20 representative benchmark passages | Zero (Local Vitest) |
| **Mock Provider Integration** | `src/test/humanizer.test.ts` | Tests end-to-end execution, diagnostic metadata emission, auto-retry logic, and 429 error handling | Zero (Local Vitest) |
| **Live Upstream Inference** | Live curl / Dev middleware | Verifies real Google Gemini API calls (`gemini-3.5-flash-lite`) with actual token processing and latencies | Controlled free-tier quota |
| **Human Editorial Benchmark** | `docs/HUMANLY_V3_QUALITY_BENCHMARK.md` | 5-axis 1–5 rubric evaluation of actual V2 vs V3.1 generated text across 20 distinct passages | Zero cost (Human review) |

---

## 2. Running the Test Suites

### Running All Automated Unit & Integration Tests
```bash
npm run test
```
All 55 automated tests execute in ~300ms using Vitest in worker threads.

### Running Linting (Oxlint)
```bash
npm run lint
```
Checks for unused variables, bad regex escapes, and code style. Must return 0 errors and 0 warnings.

### Running TypeScript & Production Build
```bash
npm run build
```
Executes `tsc -b` and Vite production bundling to `dist/`. All modules must compile cleanly with 0 type errors.

---

## 3. Evaluation Corpus Details (`src/test/evaluation-corpus.ts`)

The evaluation corpus contains 100 versioned passages across 10 specialized categories:
1. `academic`: Scholarly papers with complex reasoning and domain terms.
2. `technical_documentation`: API guides, system architectures, and parameter references.
3. `professional_correspondence`: Executive memos, client updates, and sensitive project notifications.
4. `with_citations`: Research excerpts containing APA, IEEE, and numeric citations (`[1]`, `(Author, 2024)`).
5. `with_urls`: Production documentation and knowledge base links.
6. `quantitative`: Data reports containing percentages, currencies, dates, and metrics.
7. `marketing`: Value propositions, landing page copy, and product releases.
8. `conversational`: Personal essays, blog commentary, and relaxed correspondence.
9. `adversarial_injections`: Malicious prompt injection attempts embedded in source prose.
10. `complex_formatting`: Markdown tables, bulleted lists, and LaTeX equations.

---

## 4. Reproducible Live Inference Benchmark (v1 vs v2 vs v3)

A controlled test run was conducted against identical input text using the live Google Gemini API (`gemini-3.5-flash-lite`):

### Input Text:
> *"In today's fast-paced digital era, it is of utmost importance to understand that artificial intelligence serves as a pivotal cornerstone for modern enterprises, allowing users to streamline operational workflows and fostering an environment of seamless innovation. Furthermore, our platform leverages cutting-edge algorithms to unlock the power of data. Visit https://humanly.app/docs to learn more."*
> - Word Count: 53 words
> - Entity: `https://humanly.app/docs`

### Execution Results:

| Version | Rewritten Output | Words | Latency | Preserved Entities | Editorial Character |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **v1 (Baseline)** | *"Artificial intelligence is essential for modern enterprises, streamlining workflows and driving innovation. Our platform leverages advanced algorithms to help you turn data into actionable results. Visit https://humanly.app/docs to learn more."* | 30 | 1,314ms | 0 (post-hoc) | Basic synonym replacement; removed words on blacklist. |
| **v2 (Syntax Polish)** | *"In today's digital era, artificial intelligence serves as a cornerstone for modern enterprises, streamlining workflows and driving innovation. Our platform leverages cutting-edge algorithms to unlock the power of data. Visit https://humanly.app/docs to learn more."* | 34 | 1,738ms | 0 (post-hoc) | Varied cadence; broke participial clauses. Kept clichés. |
| **v3.0 (Early Directives)**| *"In today's digital era, artificial intelligence serves as a cornerstone for modern enterprises, streamlining operational workflows and fostering seamless innovation. Our platform leverages advanced algorithms to unlock the power of data. Visit https://humanly.app/docs to learn more."* | 36 | 1,136ms | 1 (deterministic placeholder) | Protected placeholder extracted and restored; still showed formulaic openings. |
| **v3.1 (Refined Engine)** | *"Artificial intelligence is central to modern enterprise operations, streamlining complex workflows and driving continuous innovation. Our state-of-the-art solution harnesses this data capability to revolutionize operational efficiency. Visit https://humanly.app/docs to learn more."* | 33 | ~2,400ms | 1 (nonce placeholder) | Cut throat-clearing, purged stock metaphors, preserved entities and exact syntax. |

---

## 5. Distinction Between Mock Tests and Quality Evaluations

- **Mock Tests & Structural Corpus Tests:**
  `src/test/humanizer.test.ts`, `src/test/validator.test.ts`, and `src/test/evaluator.test.ts` verify deterministic code paths, regex parsers, error branching, and placeholder round-trip integrity. They execute locally without calling external LLM endpoints and consume zero quota.
  > **Important:** Passing mock and structural tests proves **system robustness**, but does **not** prove that generated text reads naturally or meets high editorial standards.
- **Human Editorial Benchmark & Live Smoke Tests:**
  `docs/HUMANLY_V3_QUALITY_BENCHMARK.md` documents the empirical evaluation of real model outputs across 20 distinct passages scored by a 5-axis 1–5 rubric. Live smoke testing is run selectively via `run-live-benchmark.ts` to evaluate real-world phrasing while respecting free-tier API quotas.

