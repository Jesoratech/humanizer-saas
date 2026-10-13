# HUMANLY V3 — TESTING & EVALUATION GUIDE

## 1. Test Architecture Overview

The Humanly test suite employs a multi-tiered testing strategy designed to verify functionality without incurring unnecessary API spend or relying on brittle external AI detector endpoints.

| Test Tier | File Path | Focus | Execution Cost |
| :--- | :--- | :--- | :--- |
| **Schema Validation** | `src/test/schemas.test.ts` | Validates Zod schemas, defaults, and utility functions | Zero (Local Vitest) |
| **Output Validator & Pipeline** | `src/test/validator.test.ts` | Tests placeholder extraction, restoration, math preservation, and edge cases | Zero (Local Vitest) |
| **Prompt Architecture Comparison** | `src/test/baseline-comparison.test.ts` | Compares v1, v2, and v3 prompt configurations and directives | Zero (Local Vitest) |
| **100-Passage Quality Benchmark** | `src/test/evaluator.test.ts` | Evaluates prompt generation and entity preservation across 10 writing domains | Zero (Local Vitest) |
| **Mock Provider End-to-End** | `src/test/humanizer.test.ts` | Tests end-to-end execution with deterministic mock responses | Zero (Local Vitest) |
| **Rate Limiter & Quotas** | `src/test/rate-limiter.test.ts` | Tests sliding-window rate limiting, IP hashing, and daily caps | Zero (Local Vitest) |
| **Live Upstream Inference** | Live curl / Dev middleware | Tests real Google Gemini API calls with actual tokens and latency | Within configured quota |

---

## 2. Running the Test Suites

### Running All Unit & Integration Tests
```bash
npm run test
```
All 41 tests execute in ~300ms using Vitest in worker threads.

### Running Linting (Oxlint)
```bash
npm run lint
```
Checks for unused variables, bad regex escapes, and code style. Must return 0 errors.

### Running TypeScript & Production Build
```bash
npm run build
```
Executes `tsc -b` and Vite production bundling to `dist/`.

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
| **v2 (Syntax Polish)** | *"In today's digital era, artificial intelligence serves as a cornerstone for modern enterprises, streamlining workflows and driving innovation. Our platform leverages cutting-edge algorithms to unlock the power of data. Visit https://humanly.app/docs to learn more."* | 34 | 1,738ms | 0 (post-hoc) | Varied cadence; broke participial clauses. |
| **v3 (Editorial Engine)** | *"In today's digital era, artificial intelligence serves as a cornerstone for modern enterprises, streamlining operational workflows and fostering seamless innovation. Our platform leverages advanced algorithms to unlock the power of data. Visit https://humanly.app/docs to learn more."* | 36 | 1,136ms | 1 (deterministic placeholder) | Protected placeholder extracted and restored verbatim; respected author intent and document context. |

---

## 5. Distinction Between Mock Tests and Live Evaluations

- **Mock Tests:** `src/test/humanizer.test.ts` and `src/test/validator.test.ts` test deterministic code paths, regex parsers, error branching, and boundary handlers. They do **not** call external servers and do not consume quota.
- **Live Evaluations:** Used exclusively for quality validation during controlled development runs using `.env.local` credentials.
