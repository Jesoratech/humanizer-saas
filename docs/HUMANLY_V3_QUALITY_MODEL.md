# HUMANLY V3 — EDITORIAL QUALITY MODEL & MEASUREMENT FRAMEWORK

## 1. Principles of Natural Writing Quality

A naive approach to "AI text humanization" treats the problem as an adversarial cat-and-mouse game against statistical classifiers: inserting artificial typos, forcing extreme sentence-length variance, swapping out common words for bizarre synonyms, or indiscriminately stripping useful conjunctions. This degrades writing quality and frustrates authors.

**Humanly V3** adopts an editorial-first quality definition based on cognitive clarity, communicative efficacy, and professional editorial standards.

### The 10 Core Tenets of Humanly V3

1. **Semantic & Meaning Preservation:** The rewrite must preserve 100% of the author's core thesis, arguments, qualifications, epistemic certainty, and nuances. It must never invent facts, change conclusions, or distort claims.
2. **Selective Intervention (Anti-Overediting):** Do not rewrite sentences that are already clear, direct, and well-phrased. Edit distance is not a proxy for quality; surgical refinement of awkward passages is superior to wanton paraphrasing.
3. **Document-Type Grounding:** Tone and cadence must strictly honor the document type. An academic methodology demands rigorous qualifications and technical density; marketing copy requires crisp value propositions; an engineering document requires verbatim code symbols and API identifiers.
4. **Preservation of Critical Entities:** Academic citations (e.g., `[1, 2]`, `(Author, 2024)`), URLs, mathematical expressions (LaTeX, formulas), code snippets, dates, percentages, and user-specified protected terms must remain intact.
5. **Cadence & Natural Flow without Artificial Gimmicks:** Natural human prose possesses dynamic rhythm: varied clause structures, balanced transitions, and purposeful punctuation (colons, em-dashes, parentheticals). It does not need arbitrary sentence-length formulas or universal word bans.
6. **Elimination of Artificial Padding:** Remove bloated throat-clearing, redundant restatements, and vacuous corporate buzzwords that dilute meaning—not because a word is on an arbitrary blacklist, but because it adds no communicative value.
7. **Authorial Intent Alignment:** When the writer specifies an authorial goal (e.g., *"Make this explanation accessible to non-technical stakeholders"*), editorial choices must prioritize that specific reader outcome.
8. **Proportionality & Strength Adherence:**
   - *Light Mode:* Correct awkwardness and glaring flaws while preserving >85% of original structure.
   - *Balanced Mode:* Enhance flow, polish transitions, and eliminate redundancies while keeping logical flow.
   - *Strong Mode:* Allow substantive structural reorganization for maximum impact while keeping factual bounds rigid.
9. **No Unsupported Additions:** Never generate fictitious personal anecdotes, fabricated case studies, or unsourced statistics to simulate "human flavor."
10. **Writer Utility & Immediate Usability:** The resulting text should be ready for the writer to use with zero or minimal manual correction.

---

## 2. Anti-Patterns Rejected in V3

| Rejected Anti-Pattern | Reason for Rejection | V3 Editorial Replacement |
| :--- | :--- | :--- |
| **Universal Word Blacklists** | Banning words like *"moreover"*, *"delve"*, or *"crucial"* breaks legitimate academic and technical prose where those terms are appropriate. | Contextual evaluation: prune filler words only when they are redundant or weaken clarity. |
| **Maximizing Edit Distance** | Unnecessarily rewriting clear prose introduces subtle hallucinations and shifts nuance. | Conservative editing: if a sentence is concise and accurate, leave it alone or apply minor touch-ups. |
| **Forced Punctuation / Quirk Injection** | Injecting random parentheticals or strange idioms feels contrived and unprofessional. | Natural syntactic rhythm: use varied sentence lengths and clean transitions suited to the document type. |
| **AI Detector Optimization Loops** | Detector classifiers are opaque, brittle, frequently update, and produce false positives on human classics. Chasing scores ruins prose. | Focus on authentic clarity, logical progression, and human editorial quality. |

---

## 3. How the Quality Model is Measured in Tests

The Humanly test suite measures quality across five distinct layers:

### Layer A: Deterministic Entity & Constraint Validation (`src/server/validator.ts`)
- **Placeholder Integrity:** Verifies that 100% of extracted URLs, citations, code blocks, and LaTeX expressions survive through the editorial pipeline and are restored to their exact source positions.
- **Protected Term Fidelity:** Verifies that user-specified key terms appear with exact casing and spelling in the output.
- **Numerical Consistency:** Detects if figures, percentages, currencies, or dates are altered or omitted.
- **Structural Integrity:** Verifies that paragraph boundaries are respected when `preserveStructure: true`.
- **Length Ratio Bounds:** Flags drastic expansions (>165%) or severe collapses (<45%).

### Layer B: Prompt Construction & Engine Differentiation (`src/test/baseline-comparison.test.ts`)
- Tests that `v3` dynamically generates tailored editorial directives across all 9 document types.
- Verifies that `light`, `balanced`, and `strong` configurations produce distinctly graduated instruction sets and temperature settings.
- Verifies prompt injection boundaries (`<draft_to_edit>` isolation and defensive system rules).

### Layer C: 100-Passage Quality Benchmark Suite (`src/test/evaluator.test.ts` & `src/test/evaluation-corpus.ts`)
- A diverse corpus across 10 distinct writing domains (Academic, Technical Documentation, Professional Correspondence, Marketing, Quantitative Reports, etc.).
- Measures semantic preservation, placeholder round-tripping, numerical fidelity, and edge-case resilience (prompt injections, zero-punctuation text, Markdown tables, etc.).

### Layer D: Mock-Provider Regression Tests (`src/test/humanizer.test.ts`)
- Verifies deterministic end-to-end execution without external network latency, ensuring predictable validation, retry branching, and structured metadata output.

### Layer E: Real Model Quality Assessment (Inference Benchmarks)
- Validated with live Google Gemini API (`gemini-3.5-flash-lite`) runs recording duration, token counts, entity preservation rate, and editorial quality notes.
