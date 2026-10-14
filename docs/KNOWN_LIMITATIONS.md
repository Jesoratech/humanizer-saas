# HUMANLY V3 — KNOWN LIMITATIONS & SYSTEM BOUNDARIES

## 1. External AI Detection Classifiers

- **No Universal Bypass Guarantee:** Humanly does **not** promise or guarantee that rewritten text will receive a "0% AI" or "100% Human" score on third-party AI detectors (e.g., Turnitin, GPTZero, ZeroGPT, CopyLeaks).
- **Inherent Detector Unreliability:** Commercial AI detectors are non-stationary, heuristic statistical classifiers that measure perplexity and burstiness. Published academic research demonstrates that these classifiers suffer from significant false-positive rates on non-native English writing, technical prose, and historical literature (e.g., the US Constitution).
- **Architectural Policy:** Humanly deliberately avoids "adversarial detector optimization" (such as deliberately introducing typos, inserting bizarre synonyms, or breaking grammatical structures). Our objective is genuine writing clarity, flow, and authorial voice.

---

## 2. Semantic Preservation vs. Deterministic Checks

- **Deterministic Entity Guarantees:** The placeholder pipeline guarantees 100% exact retention of URLs, inline code, code blocks, academic citations, LaTeX formulas, and user-specified protected terms.
- **Semantic Limits:** While deterministic checks flag numerical discrepancies and length collapses, mechanical checks cannot mathematically prove that every philosophical nuance or subtle metaphorical implication is preserved.
- **Recommendation:** Writers should always review the revised draft—especially for high-stakes academic submissions, legal documents, or medical communications.

---

## 3. Infrastructure & Budget Constraints

- **Single-Call Pipeline:** To adhere strictly to the **zero-additional-spend** constraint, Humanly uses a single upstream inference call followed by deterministic validation and restoration, rather than a multi-agent critique loop or expensive secondary embedding model.
- **Bounded Auto-Retry:** Auto-retries are strictly limited to at most one attempt, and triggered only by objective structural failures (empty response or omitted required URLs).
- **Free-Tier API Quotas:** When operating on Google AI Studio's free tier, requests are constrained by upstream RPM/TPD limits. Production systems should enforce user daily caps to prevent quota exhaustion.

---

## 4. Privacy & Data Handling Boundaries

- **Provider Data Policy:** When configured with the unpaid tier of the Google Gemini Developer API, Google's standard developer terms apply. While Humanly does not persist user text in logs or databases, users must be advised not to submit highly confidential secrets, passwords, or regulated PII.
- **Diagnostic Logging Safeguards:** `src/server/logger.ts` logs request latency, word counts, and error categories, but **strictly excludes** raw draft prose and model outputs from log streams.
- **Feedback Submissions:** The user feedback widget collects ratings, diagnostic categories, and optional user notes, but never transmits or stores the underlying source draft.

---

### 5. Formatting & Token Extraction Edge Cases

- **Non-Standard Citations:** The citation extractor supports APA, IEEE, Harvard, and bracketed numeric citations (e.g., `[1]`, `[1, 2]`, `(Author et al., 2024)`). Unconventional citation formats (e.g., footnotes without brackets, obscure custom styles) may be treated as ordinary prose.
- **Ambiguous Math Expressions:** The LaTeX extractor protects display math (`$$...$$`) and standard inline math (`$...$`) containing mathematical symbols or relations. Plain numbers or currency amounts with dollar signs are preserved via numeric checks rather than math tokens.
- **Complex Markdown Tables:** Tables are preserved when `preserveStructure: true` is set, but deeply nested multi-level ASCII formatting may occasionally undergo minor whitespace normalization.
- **Surrounding Clause Restructuring:** While placeholders guarantee 100% token preservation, strong editing mode may reorganize the sentence clauses surrounding the token. Users requiring word-for-word preservation should select `light` mode (>90% word retention).

---

## 6. Structural Automated Testing vs. Editorial Quality

- **Automated Test Scope:** Automated Vitest suites (`validator.test.ts`, `schemas.test.ts`, `evaluator.test.ts`) verify that parsing, token extraction, restoration, and prompt formatting work without crashing or dropping tokens.
- **Editorial Quality Verification:** Automated tests cannot autonomously assess natural human voice, nuance, or cadence. Editorial quality must be verified through structured human benchmarks (see `docs/HUMANLY_V3_QUALITY_BENCHMARK.md`) using the 5-point rubric across meaning, clarity, naturalness, non-redundancy, and voice.

