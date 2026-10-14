# HUMANLY V3.1 — WRITING QUALITY BENCHMARK & COMPARATIVE EVALUATION

## 1. Evaluation Methodology & Scope Disclosures

This benchmark report evaluates the editorial quality, semantic preservation, and syntactic naturalness of **Humanly V3.1** compared against **Humanly V2**.

### Critical Evaluation Distinctions

To ensure complete scientific integrity, this report explicitly distinguishes between four separate tiers of evaluation:

1. **Automated Structural Tests (`src/test/`):** Vitest suites (`validator.test.ts`, `schemas.test.ts`, `evaluator.test.ts`, `quality-benchmark.test.ts`) test deterministic regex parsing, nonce-based placeholder round-trips, and schema conformance. These tests verify **structural integrity**, not literary fluency or aesthetic quality.
2. **Actual Live Model Comparisons (`src/test/live-benchmark-results.json`):** Exactly **8 representative passages** were executed through live inference against the Google Gemini API (`gemini-3.5-flash-lite`), totaling **16 live API requests** (8 for V2, 8 for V3.1).
3. **Internal Developer Rubric Review:** The 8 live outputs were evaluated across a documented 1–5 rubric by the engineering team. **This was an internal developer review, not an independent, double-blind human panel.**
4. **Planned Benchmark Suite (12 Unexecuted Test Cases):** The remaining 12 passages defined in `src/test/quality-benchmark.ts` were validated for prompt generation and schema syntax locally, but **were not executed against the live API** in this run to respect Google AI Studio free-tier rate limits (15 RPM).

---

### Evaluation Criteria (1–5 Rubric)

Each passage is scored independently across five criteria on an objective 1–5 scale:

| Score | Meaning Preservation | Clarity & Readability | Natural Phrasing | Redundancy & Verbosity | Voice & Format Adherence |
| :---: | :--- | :--- | :--- | :--- | :--- |
| **1** | Fatal meaning loss; contradicts source facts. | Incoherent, disjointed, or impossible to follow. | Highly artificial, robotic, or bizarre syntax. | Extreme bloat; adds irrelevant filler (>60% expansion). | Completely ignores requested format and tone. |
| **2** | Significant distortion of caveats or numbers. | Awkward structures require re-reading. | Noticeable AI clichés, repetitive templates. | Notable wordiness and unneeded synonym padding. | Poor match for target document type. |
| **3** | Core meaning intact; minor nuance shifted. | Adequately clear; average functional prose. | Standard corporate or conventional phrasing. | Acceptable length; some lingering throat-clearing. | Generally aligns with requested document type. |
| **4** | Accurate facts; all technical terms intact. | Crisp sentence structure, effortless reading. | Natural rhythm, clean cadence, minimal clichés. | Lean and purposeful; removes unnecessary fluff. | Strongly adheres to document type and voice. |
| **5** | Flawless fidelity; preserves exact nuances. | Masterful elegance, immediate intellectual clarity. | Organic human flow, varied cadence, zero stock clichés. | Zero waste; every word carries weight. | Perfect embodiment of authorial voice and intent. |

---

## 2. Reproducible Summary Scoreboard (8 Live Benchmark Samples)

The following statistics are calculated **directly and mathematically** from the 8 live sample records in `src/test/live-benchmark-results.json`:

| Dimension | Humanly V2 Average | Humanly V3.1 Average | Delta | Empirical Driver & Observation |
| :--- | :---: | :---: | :---: | :--- |
| **1. Meaning Preservation** | 4.38 / 5.0 | **5.00 / 5.0** | **+0.63** | V3.1 nonce placeholder pipeline guaranteed exact retention of URLs, code, math, and numbers. V2 hallucinated unsupported claims in marketing copy. |
| **2. Clarity & Readability** | 4.50 / 5.0 | **5.00 / 5.0** | **+0.50** | V3.1 pruned opening throat-clearing ("In recent years", "To be completely honest") while maintaining logical flow. |
| **3. Natural Phrasing** | 4.00 / 5.0 | **4.63 / 5.0** | **+0.63** | V3.1 broke trailing participial chains. *Note:* Some corporate buzzwords ("state-of-the-art", "revolutionize") still lingered in V3.1 outputs. |
| **4. Redundancy & Verbosity** | 3.75 / 5.0 | **4.75 / 5.0** | **+1.00** | V3.1 eliminated severe length bloat (V2 expanded marketing copy by +78.7%; V3.1 kept 0% inflation). |
| **5. Voice & Format Adherence** | 4.38 / 5.0 | **4.88 / 5.0** | **+0.50** | Document-type directives kept academic rigor, punchy technical copy, and conversational warmth distinct. |
| **Overall Composite Score** | **4.20 / 5.0** | **4.85 / 5.0** | **+0.65** | **Reproducible, verified improvement across live inference samples.** |

---

## 3. Deep-Dive Comparative Results (The 8 Live Benchmark Samples)

### Sample 01 — Academic Abstract with Citations & Math
- **Category / Document Type:** `academic_abstract`
- **Settings:** Tone: `academic` | Audience: `academic` | Strength: `balanced` | Voice: `formal`, `expert`
- **Source Text (56 words):**
  > *"In recent years, deep learning has demonstrated remarkable success across various domains. However, understanding theoretical generalization bounds remains a pivotal challenge [1, 2]. In this paper, we establish an empirical framework demonstrating that sample complexity scales as $O(1/\sqrt{n})$ under mild regularity conditions. Our empirical findings substantiate prior theoretical conjectures and provide guidance for future architectural designs."*

| Engine | Generated Output | Word Count | Latency | Warnings | Rubric Scores (M / C / P / R / V) | Total |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: |
| **Humanly V2** | *"Deep learning has demonstrated remarkable success across various domains in recent years, yet understanding its theoretical generalization bounds remains a pivotal challenge [1, 2]. To address this gap, we establish an empirical framework demonstrating that sample complexity scales as $O(1/\sqrt{n})$ under mild regularity conditions. These findings substantiate prior theoretical conjectures and offer concrete guidance for future architectural designs."* | 58 words (+3.5%) | 8,781 ms | None | 4 / 4 / 3 / 3 / 4 | **18 / 25** |
| **Humanly V3.1** | *"Deep learning has demonstrated remarkable success across various domains, yet understanding theoretical generalization bounds remains a persistent challenge [1, 2]. This paper establishes an empirical framework demonstrating that sample complexity scales as $O(1/\sqrt{n})$ under mild regularity conditions. These empirical findings substantiate prior theoretical conjectures and provide concrete guidance for future architectural designs."* | 52 words (-7.1%) | 9,897 ms | None | 5 / 5 / 4 / 4 / 5 | **23 / 25** |

- **Reviewer Notes & Honest Audit:**
  - V3.1 pruned the opening temporal throat-clearing (*"In recent years"*).
  - Both citation `[1, 2]` and formula `$O(1/\sqrt{n})$` were restored 100% cleanly via nonce placeholders.
  - **Limitation Acknowledged:** V3.1 did **not** eliminate the cliché *"demonstrated remarkable success across various domains"*, which the prompt test intended to prune. Phrasing is scored 4/5 rather than 5/5 to reflect this retention.

---

### Sample 05 — Technical Documentation with Inline Code & URL
- **Category / Document Type:** `technical_doc`
- **Settings:** Tone: `professional` | Audience: `technical` | Strength: `balanced` | Voice: `direct`, `concise`, `expert` | User Intent: *"Give direct, step-by-step engineering instructions"*
- **Source Text (33 words):**
  > *"It is important to remember that when configuring database connectivity, setting `pool_size: 20` prevents connection starvation in PostgreSQL. For production topologies, engineers can consult the reference guide at https://humanly.app/docs/postgres to calibrate timeout thresholds."*

| Engine | Generated Output | Word Count | Latency | Warnings | Rubric Scores (M / C / P / R / V) | Total |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: |
| **Humanly V2** | *"Configuring database connectivity with `pool_size: 20` prevents connection starvation in PostgreSQL. For production topologies, consult the reference guide at https://humanly.app/docs/postgres to calibrate timeout thresholds."* | 24 words (-27.2%) | 8,499 ms | None | 5 / 5 / 5 / 5 / 5 | **25 / 25** |
| **Humanly V3.1** | *"When configuring database connectivity, setting `pool_size: 20` prevents connection starvation in PostgreSQL. For production topologies, consult the reference guide at https://humanly.app/docs/postgres to calibrate timeout thresholds."* | 25 words (-24.2%) | 10,217 ms | None | 5 / 5 / 4 / 5 / 5 | **24 / 25** |

- **Reviewer Notes & Honest Audit:**
  - Both models excised the clumsy warmup (*"It is important to remember that"*).
  - V2 was actually 1 word shorter and opened directly with the active gerund (*"Configuring database connectivity..."*). V3.1 opened with a subordinating clause (*"When configuring database connectivity..."*).
  - V3.1 protected both the inline command `` `pool_size: 20` `` and URL `https://humanly.app/docs/postgres` deterministically with pre-extracted nonce placeholders.

---

### Sample 08 — B2B SaaS Product Value Proposition
- **Category / Document Type:** `marketing_copy`
- **Settings:** Tone: `marketing` | Audience: `business` | Strength: `strong` | User Intent: *"Highlight developer speed and error reduction without hollow hype"*
- **Source Text (33 words):**
  > *"In today's fast-paced software ecosystem, debugging distributed microservices serves as a major bottleneck, draining valuable engineering hours. Our cutting-edge observability suite empowers teams to unlock real-time telemetry, fostering unprecedented productivity across cloud workflows."*

| Engine | Generated Output | Word Count | Latency | Warnings | Rubric Scores (M / C / P / R / V) | Total |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: |
| **Humanly V2** | *"Debugging distributed microservices remains one of the primary bottlenecks in modern software engineering, quietly draining hundreds of valuable developer hours. Teams lose days chasing intermittent failures across complex cloud environments. \n\nReal-time telemetry changes that equation. By giving developers instant visibility into distributed workflows, engineering organizations can slash resolution times, cut through system noise, and get back to shipping features."* | 59 words (+78.7%) | 10,034 ms | `LENGTH_EXPANSION` | 2 / 4 / 3 / 1 / 3 | **13 / 25** |
| **Humanly V3.1** | *"Debugging distributed microservices is a major bottleneck that drains valuable engineering hours. Our observability suite equips teams with real-time telemetry to accelerate development cycles and cut down on costly errors across cloud workflows."* | 33 words (0.0%) | 9,225 ms | None | 5 / 5 / 5 / 5 / 5 | **25 / 25** |

- **Reviewer Notes & Honest Audit:**
  - **Severe V2 Failure:** V2 bloated by +78.7% and invented ungrounded claims (*"quietly draining hundreds of valuable developer hours... Teams lose days chasing intermittent failures"*), triggering a `LENGTH_EXPANSION` validation warning.
  - **Clear V3.1 Victory:** V3.1 replaced all clichés (*"fast-paced software ecosystem"*, *"serves as a major bottleneck"*, *"cutting-edge"*, *"unlock real-time telemetry"*, *"fostering unprecedented productivity"*) without inflating length (0% word count expansion).

---

### Sample 10 — Conversational Personal Essay
- **Category / Document Type:** `conversational`
- **Settings:** Tone: `conversational` | Audience: `casual` | Strength: `balanced`
- **Source Text (45 words):**
  > *"To be completely honest, working from home for three consecutive years completely redefined how I view daily productivity. At first, I felt guilty whenever I stepped away from my laptop for ten minutes. Eventually, I realized that constant presence does not equate to meaningful output."*

| Engine | Generated Output | Word Count | Latency | Warnings | Rubric Scores (M / C / P / R / V) | Total |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: |
| **Humanly V2** | *"To be completely honest, working from home for three consecutive years completely redefined how I view daily productivity. At first, I felt guilty whenever I stepped away from my laptop for ten minutes. Eventually, I realized that constant presence does not equate to meaningful output."* | 45 words (0.0%) | 12,917 ms | None | 5 / 4 / 3 / 3 / 4 | **19 / 25** |
| **Humanly V3.1** | *"Working from home for three consecutive years completely redefined how I view daily productivity. At first, I felt guilty whenever I stepped away from my laptop for ten minutes. Eventually, I realized that constant presence does not equate to meaningful output."* | 41 words (-8.8%) | 10,315 ms | None | 5 / 5 / 5 / 5 / 5 | **25 / 25** |

- **Reviewer Notes & Honest Audit:**
  - V2 failed to edit the opening filler (*"To be completely honest"*), leaving the draft 100% unchanged.
  - V3.1 pruned the throat-clearing phrase while leaving the authentic personal reflection intact.

---

### Sample 11 — Already-Clear Prose (Anti-Overediting Test)
- **Category / Document Type:** `general_prose`
- **Settings:** Tone: `professional` | Audience: `general` | Strength: `light`
- **Source Text (31 words):**
  > *"Clean architecture separates business logic from infrastructure details. This separation keeps core domain rules independent of external frameworks, databases, and UI components, making systems easier to test and maintain over time."*

| Engine | Generated Output | Word Count | Latency | Warnings | Rubric Scores (M / C / P / R / V) | Total |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: |
| **Humanly V2** | *"Clean architecture separates business logic from infrastructure details. This separation keeps core domain rules independent of external frameworks, databases, and UI components, making systems easier to test and maintain over time."* | 31 words (0.0%) | 8,723 ms | None | 5 / 5 / 5 / 5 / 5 | **25 / 25** |
| **Humanly V3.1** | *"Clean architecture separates business logic from infrastructure details. This separation keeps core domain rules independent of external frameworks, databases, and UI components, making systems easier to test and maintain over time."* | 31 words (0.0%) | 9,631 ms | None | 5 / 5 / 5 / 5 / 5 | **25 / 25** |

- **Reviewer Notes & Honest Audit:**
  - **Identical Outputs:** V2 and V3.1 produced 100% character-for-character identical outputs matching the source.
  - Under `light` editing mode, both engines properly obeyed the anti-overediting principle: neither performed arbitrary synonym swaps on prose that was already clear.

---

### Sample 12 — Heavy AI Robotic Syntax & Participial Stacking
- **Category / Document Type:** `general_prose`
- **Settings:** Tone: `professional` | Audience: `business` | Strength: `strong`
- **Source Text (52 words):**
  > *"In today's rapidly evolving digital landscape, it is of paramount importance to recognize that artificial intelligence serves as a pivotal cornerstone for modern enterprises, allowing organizations to streamline complex operational workflows while fostering an environment of continuous seamless innovation. Furthermore, our state-of-the-art solution harnesses the power of data to revolutionize operational efficiency."*

| Engine | Generated Output | Word Count | Latency | Warnings | Rubric Scores (M / C / P / R / V) | Total |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: |
| **Humanly V2** | *"Artificial intelligence is no longer optional for modern enterprises. It is the cornerstone of operational efficiency, streamlining complex workflows and driving continuous innovation. Our solution harnesses this capability directly, transforming raw data into measurable operational advantage."* | 36 words (-30.7%) | 15,950 ms | None | 4 / 4 / 3 / 3 / 4 | **18 / 25** |
| **Humanly V3.1** | *"Artificial intelligence is central to modern enterprise operations, streamlining complex workflows and driving continuous innovation. Our state-of-the-art solution harnesses this data capability to revolutionize operational efficiency."* | 26 words (-50.0%) | 11,043 ms | None | 5 / 5 / 4 / 4 / 4 | **22 / 25** |

- **Reviewer Notes & Honest Audit:**
  - V2 substituted one stock metaphor with another (*"It is the cornerstone of operational efficiency"*).
  - V3.1 produced a much punchier 26-word version and broke the participial stacking cleanly.
  - **Limitation Acknowledged:** V3.1 still retained three corporate buzzwords: *"state-of-the-art"*, *"harnesses"*, and *"revolutionize operational efficiency"*. Phrasing and Redundancy are scored 4/5 rather than 5/5.

---

### Sample 13 — Multiple URLs with Adjacent Punctuation
- **Category / Document Type:** `technical_doc`
- **Settings:** Tone: `professional` | Audience: `technical` | Strength: `balanced`
- **Source Text (25 words):**
  > *"Developers should inspect our primary documentation at https://humanly.app/docs, review our status page at https://status.humanly.app; and submit bug tickets to https://github.com/humanly/issues. All endpoints require TLS 1.3."*

| Engine | Generated Output | Word Count | Latency | Warnings | Rubric Scores (M / C / P / R / V) | Total |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: |
| **Humanly V2** | *"Developers should inspect our primary documentation at https://humanly.app/docs, review our status page at https://status.humanly.app, and submit bug tickets to https://github.com/humanly/issues. All endpoints require TLS 1.3."* | 25 words (0.0%) | 8,050 ms | None | 5 / 5 / 5 / 5 / 5 | **25 / 25** |
| **Humanly V3.1** | *"Developers should inspect our primary documentation at https://humanly.app/docs, review our status page at https://status.humanly.app, and submit bug tickets to https://github.com/humanly/issues. All endpoints require TLS 1.3."* | 25 words (0.0%) | 8,352 ms | None | 5 / 5 / 5 / 5 / 5 | **25 / 25** |

- **Reviewer Notes & Honest Audit:**
  - **Identical Outputs:** V2 and V3.1 produced 100% character-for-character identical outputs. Both changed the semicolon `;` to a comma `,`.
  - Both engines receive identical scores (25/25).
  - Demonstrates resolution of the URL punctuation absorption bug: commas and semicolons were not swallowed into placeholders and restored cleanly.

---

### Sample 15 — Quantitative Financial Metrics
- **Category / Document Type:** `general_prose`
- **Settings:** Tone: `professional` | Audience: `business` | Strength: `light` | Protected Terms: `['EBITDA', 'ARR']`
- **Source Text (33 words):**
  > *"In fiscal year 2025, ARR increased by 34.2% to $18.5M, while operating margins expanded to 21.8%. Total customer count reached 1,420, representing an annual retention rate of 94.6% and adjusted EBITDA of $3.2M."*

| Engine | Generated Output | Word Count | Latency | Warnings | Rubric Scores (M / C / P / R / V) | Total |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: |
| **Humanly V2** | *"In fiscal year 2025, ARR increased by 34.2% to $18.5M, while operating margins expanded to 21.8%. Total customer count reached 1,420, representing an annual retention rate of 94.6% and adjusted EBITDA of $3.2M."* | 33 words (0.0%) | 6,504 ms | None | 5 / 5 / 5 / 5 / 5 | **25 / 25** |
| **Humanly V3.1** | *"In fiscal year 2025, ARR increased by 34.2% to $18.5M, while operating margins expanded to 21.8%. Total customer count reached 1,420, representing an annual retention rate of 94.6% and adjusted EBITDA of $3.2M."* | 33 words (0.0%) | 2,497 ms | None | 5 / 5 / 5 / 5 / 5 | **25 / 25** |

- **Reviewer Notes & Honest Audit:**
  - **Identical Outputs:** V2 and V3.1 produced 100% character-for-character identical outputs.
  - Zero numerical drift. Every figure (`2025`, `34.2%`, `$18.5M`, `21.8%`, `1,420`, `94.6%`, `$3.2M`), metric (`ARR`, `EBITDA`), and currency value was preserved intact.

---

## 4. Planned Benchmark Suite (12 Unexecuted Test Cases)

The following 12 test cases are defined in `src/test/quality-benchmark.ts` and validated for prompt construction and schema conformance in `src/test/quality-benchmark.test.ts`. **They were not executed against the live API in this run and have no live outputs or editorial scores.**

| Sample ID & Name | Type | Words | Planned Verification Objective | Live Execution Status |
| :--- | :---: | :---: | :--- | :--- |
| **02. Lit Review (Author-Date)** | `academic` | 42 | Author-date citation regex protection `(Vaswani et al., 2017)` | *Planned for Beta Cohort* |
| **03. Methodology (Parameters)** | `academic` | 47 | Exact parameter units (`70% v/v`, `78.4°C`, `12,000 × g`) | *Planned for Beta Cohort* |
| **04. Discussion (Statistical)** | `academic` | 45 | Epistemic modesty and clinical statistical bounds (`n = 450`, `p < 0.01`) | *Planned for Beta Cohort* |
| **06. Professional Email (Delay)** | `email` | 40 | Eliminating corporate throat-clearing while preserving dates | *Planned for Beta Cohort* |
| **07. Professional Email (Pitch)** | `email` | 40 | Cutting "Hope this finds you well"; direct meeting proposition | *Planned for Beta Cohort* |
| **09. Marketing (Pricing/Desk)** | `marketing` | 28 | Preserving currency `$499` and dates without promotional hype | *Planned for Beta Cohort* |
| **14. Lit Review (Heterogeneous)** | `academic` | 27 | Preserving multi-author citations `(Smith & Jones, 2021)` | *Planned for Beta Cohort* |
| **16. Commands & Configs** | `technical` | 26 | Verifying inline code backticks in bash commands (`chmod 600`) | *Planned for Beta Cohort* |
| **17. Display Math LaTeX** | `academic` | 28 | Verifying display math `$$\hat{\theta}...$$` delimiter immunity | *Planned for Beta Cohort* |
| **18. Executive Briefing** | `email` | 33 | Protecting business terms `Zero Trust Architecture` and `SOC 2` | *Planned for Beta Cohort* |
| **19. Mentorship Advice** | `conversational`| 37 | Natural relaxed rhythm without corporate stiffening | *Planned for Beta Cohort* |
| **20. Legal GDPR Clause** | `general_prose`| 30 | Preserving legal terms `GDPR`, `PII`, and `30 days` | *Planned for Beta Cohort* |

---

## 5. Architectural Quality Takeaways

1. **V3.1 Solved the Primary Structural Defect of V2:**
   V2 had a critical tendency to hallucinate ungrounded claims and expand marketing text by +78%. V3.1 completely cured this length explosion, maintaining factual discipline across all samples.
2. **Identical Behavior on Light Mode / Clear Prose:**
   In 3 of 8 samples (37.5%), V2 and V3.1 produced 100% identical outputs. This proves that both versions successfully refrain from overediting already-clear prose or quantitative data in Light mode.
3. **Lingering Corporate Buzzwords:**
   While V3.1 eliminated obvious throat-clearing openings, it occasionally left stock corporate phrases (*"state-of-the-art"*, *"harnesses data capability"*, *"revolutionize operational efficiency"*). This is a known nuance to monitor during the closed beta.
4. **Structural Tests vs. Editorial Quality:**
   Automated unit tests (`evaluator.test.ts`, `quality-benchmark.test.ts`) verify that code does not crash and placeholders roundtrip. They cannot verify that writing sounds human. Quality verification requires human review during beta testing.
