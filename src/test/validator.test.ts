import { describe, it, expect } from 'vitest';
import {
  validateRewrite,
  extractProtectedEntities,
  restoreProtectedEntities,
} from '../server/validator.ts';

describe('Deterministic Output Validator & Entity Preservation Pipeline', () => {
  describe('validateRewrite Basic Rules', () => {
    it('rejects completely empty or whitespace responses', () => {
      const res = validateRewrite('Some original text', '');
      expect(res.isValid).toBe(false);
      expect(res.needsRetry).toBe(true);
      expect(res.retryReason).toBe('EMPTY_OUTPUT');
      expect(res.warningCategories).toContain('EMPTY_OUTPUT');
    });

    it('strips accidental wrapper tags and code fences', () => {
      const res = validateRewrite(
        'Original prose without fences.',
        '<draft_to_edit>\n```markdown\nClean rewritten human prose here.\n```\n</draft_to_edit>'
      );
      expect(res.isValid).toBe(true);
      expect(res.sanitizedText).toBe('Clean rewritten human prose here.');
    });

    it('detects dropped URLs and marks for retry with category', () => {
      const original = 'Visit https://humanly.app/docs for instructions.';
      const rewritten = 'Visit our documentation website for instructions.';
      const res = validateRewrite(original, rewritten);

      expect(res.droppedUrls).toContain('https://humanly.app/docs');
      expect(res.needsRetry).toBe(true);
      expect(res.retryReason).toBe('DROPPED_URLS');
      expect(res.warningCategories).toContain('DROPPED_URLS');
      expect(res.warnings.some((w) => w.includes('https://humanly.app/docs'))).toBe(true);
    });

    it('detects dropped academic citations', () => {
      const original = 'Previous benchmarks disputed these results [1, 2] and (Vaswani et al., 2017).';
      const rewritten = 'Previous benchmarks disputed these results significantly.';
      const res = validateRewrite(original, rewritten);

      expect(res.droppedCitations).toContain('[1, 2]');
      expect(res.droppedCitations).toContain('(Vaswani et al., 2017)');
      expect(res.warningCategories).toContain('DROPPED_CITATIONS');
    });

    it('detects missing protected terms', () => {
      const original = 'We migrated our backend from Express to Cloudflare Workers with Supabase.';
      const rewritten = 'We migrated our backend to edge serverless functions.';
      const res = validateRewrite(original, rewritten, {
        protectedTerms: ['Cloudflare Workers', 'Supabase'],
      });

      expect(res.missingProtectedTerms).toContain('Cloudflare Workers');
      expect(res.missingProtectedTerms).toContain('Supabase');
      expect(res.warningCategories).toContain('MISSING_PROTECTED_TERMS');
    });

    it('detects missing protected code snippets', () => {
      const original = 'Call `supabase.auth.getSession()` on component mount.';
      const rewritten = 'Call the session retrieval method on mount.';
      const res = validateRewrite(original, rewritten);

      expect(res.droppedCodeSpans).toContain('`supabase.auth.getSession()`');
      expect(res.warningCategories).toContain('DROPPED_CODE');
    });

    it('flags unexpected numerical discrepancies', () => {
      const original = 'Revenue expanded by 18.4% to $4.2M across 12,000 customers.';
      const rewritten = 'Revenue expanded nicely to several millions across many customers.';
      const res = validateRewrite(original, rewritten);

      expect(res.numericalDiscrepancies.length).toBeGreaterThan(0);
      expect(res.warningCategories).toContain('NUMERICAL_DISCREPANCY');
    });

    it('detects degenerate phrase repetition loops', () => {
      const original = 'A brief paragraph about technology.';
      const loopingText =
        'This technology is very fast. This technology is very fast. This technology is very fast.';
      const res = validateRewrite(original, loopingText);

      expect(res.isValid).toBe(false);
      expect(res.retryReason).toBe('REPETITIVE_LOOP');
      expect(res.warningCategories).toContain('REPETITIVE_LOOP');
    });

    it('warns on substantial length collapse (<45% length)', () => {
      const original =
        'This is an extensive analysis detailing thirty-five distinct factors regarding application security, operational reliability, continuous deployment pipelines, automated integration testing, and team coordination protocols across remote workforces.';
      const rewritten = 'Security and reliability matter for remote teams.';
      const res = validateRewrite(original, rewritten);

      expect(res.warningCategories).toContain('LENGTH_COLLAPSE');
    });
  });

  describe('Placeholder-Based Protection Pipeline (Phase 5 & 8 Audit)', () => {
    it('extracts code blocks, inline code, URLs, and citations into unique collision-proof placeholders', () => {
      const complexText = `
Here is a function:
\`\`\`typescript
export function add(a: number, b: number) { return a + b; }
\`\`\`
Check the documentation at https://example.com/api/v1 for \`add()\` details [4].
Also refer to (Vaswani et al., 2017) and $\\mathcal{O}(n \\log n)$ time complexity.
`;

      const { processedText, entities } = extractProtectedEntities(complexText);

      expect(entities.length).toBe(6);
      expect(processedText).not.toContain('https://example.com/api/v1');
      expect(processedText).not.toContain('```typescript');
      expect(processedText).not.toContain('`add()`');
      expect(processedText).not.toContain('[4]');
      expect(processedText).not.toContain('(Vaswani et al., 2017)');
      expect(processedText).not.toContain('$\\mathcal{O}(n \\log n)$');

      for (const entity of entities) {
        expect(processedText).toContain(entity.placeholder);
        expect(entity.placeholder).toMatch(/^__HUMANLY_PROT_[A-Z0-9_]+__$/);
      }
    });

    it('preserves sentence punctuation adjacent to URLs without capturing it into the token', () => {
      const text =
        'Review the guide at https://humanly.app/docs, check status at https://status.humanly.app; or visit https://example.com.';
      const { processedText, entities } = extractProtectedEntities(text);

      const urlEntities = entities.filter((e) => e.type === 'url');
      expect(urlEntities.length).toBe(3);

      // Verify trailing punctuation was NOT captured in original URL
      expect(urlEntities[0].original).toBe('https://humanly.app/docs');
      expect(urlEntities[1].original).toBe('https://status.humanly.app');
      expect(urlEntities[2].original).toBe('https://example.com');

      // Verify punctuation remained in processedText
      expect(processedText).toContain(`${urlEntities[0].placeholder},`);
      expect(processedText).toContain(`${urlEntities[1].placeholder};`);
      expect(processedText).toContain(`${urlEntities[2].placeholder}.`);

      // Verify clean restoration without double punctuation
      const restored = restoreProtectedEntities(processedText, entities);
      expect(restored.restoredText).toBe(text);
    });

    it('handles author-date citations in both parenthetical and bracketed formats', () => {
      const text =
        'Prior research established baseline models (Smith, 2020), subsequent refinements (Johnson & Lee, 2021), and multi-author reviews [Williams et al., 2022].';
      const { processedText, entities } = extractProtectedEntities(text);

      const citeEntities = entities.filter((e) => e.type === 'citation');
      expect(citeEntities.length).toBe(3);
      expect(citeEntities[0].original).toBe('(Smith, 2020)');
      expect(citeEntities[1].original).toBe('(Johnson & Lee, 2021)');
      expect(citeEntities[2].original).toBe('[Williams et al., 2022]');

      const restored = restoreProtectedEntities(processedText, entities);
      expect(restored.restoredText).toBe(text);
    });

    it('avoids false-positive LaTeX math on standard currency ranges', () => {
      const text = 'The product costs $10 to $20 on retail shelves, with $4.2M in annual profit.';
      const { entities } = extractProtectedEntities(text);

      const mathEntities = entities.filter((e) => e.type === 'math');
      // Currency ranges should NOT be extracted as LaTeX math formulas
      expect(mathEntities.length).toBe(0);
    });

    it('safely extracts genuine LaTeX formulas containing math operators and commands', () => {
      const text = 'The empirical bound satisfies $\\hat{\\mu} \\le \\alpha + \\beta$ for all $x = y$.';
      const { processedText, entities } = extractProtectedEntities(text);

      const mathEntities = entities.filter((e) => e.type === 'math');
      expect(mathEntities.length).toBe(2);

      const restored = restoreProtectedEntities(processedText, entities);
      expect(restored.restoredText).toBe(text);
    });

    it('prevents collision even when source text contains strings resembling Humanly placeholders', () => {
      const textWithFakes =
        'The developer typed __HUMANLY_PROT_URL_0__ into the prompt. Visit https://example.com.';
      const { processedText, entities } = extractProtectedEntities(textWithFakes);

      expect(entities.length).toBe(1);
      expect(entities[0].original).toBe('https://example.com');
      // The session nonce ensures the real placeholder is distinct from the user fake
      expect(entities[0].placeholder).not.toBe('__HUMANLY_PROT_URL_0__');

      const restored = restoreProtectedEntities(processedText, entities);
      expect(restored.restoredText).toContain('__HUMANLY_PROT_URL_0__');
      expect(restored.restoredText).toContain('https://example.com');
    });

    it('restores extracted placeholders with 100% exact fidelity and verifies single-use', () => {
      const originalText = 'Review the source at https://github.com/org/repo and run `npm test` [12].';
      const { entities } = extractProtectedEntities(originalText);

      const urlEntity = entities.find((e) => e.type === 'url')!;
      const codeEntity = entities.find((e) => e.type === 'inline_code')!;
      const citeEntity = entities.find((e) => e.type === 'citation')!;

      const simulatedModelRewrite = `You can examine the repository at ${urlEntity.placeholder} before executing ${codeEntity.placeholder} as described in ${citeEntity.placeholder}.`;

      const restored = restoreProtectedEntities(simulatedModelRewrite, entities);

      expect(restored.restoredCount).toBe(3);
      expect(restored.missingEntities.length).toBe(0);
      expect(restored.placeholderIntegrityVerified).toBe(true);
      expect(restored.restoredText).toBe(
        'You can examine the repository at https://github.com/org/repo before executing `npm test` as described in [12].'
      );
    });

    it('detects when model accidentally omits an extracted placeholder and flags appropriate warnings', () => {
      const originalText = 'Contact support at https://support.example.com for help.';
      const { entities } = extractProtectedEntities(originalText);

      const droppedRewrite = 'Feel free to reach out to our dedicated support team for help.';
      const restored = restoreProtectedEntities(droppedRewrite, entities);

      expect(restored.missingEntities.length).toBe(1);
      expect(restored.placeholderIntegrityVerified).toBe(false);
      expect(restored.warnings.some((w) => w.includes('https://support.example.com'))).toBe(true);
    });

    it('detects duplicate placeholder insertions', () => {
      const originalText = 'Check `main.py` here.';
      const { entities } = extractProtectedEntities(originalText);

      const duplicateRewrite = `Inspect ${entities[0].placeholder} and duplicate ${entities[0].placeholder}.`;
      const restored = restoreProtectedEntities(duplicateRewrite, entities);

      expect(restored.duplicatedEntities.length).toBe(1);
      expect(restored.placeholderIntegrityVerified).toBe(false);
    });

    it('protects LaTeX display math ($$...$$) and inline math with literal $$ preservation', () => {
      const mathText =
        'The loss function is $$\\mathcal{L}_{\\theta} = \\sum_{i=1}^n (y_i - \\hat{y}_i)^2$$ with complexity $O(n^2)$.';
      const { processedText, entities } = extractProtectedEntities(mathText);

      expect(entities.some((e) => e.type === 'math')).toBe(true);
      expect(processedText).not.toContain('\\mathcal{L}_{\\theta}');

      const simulatedRewrite = `We optimize the objective ${entities[0].placeholder} yielding an asymptotic bound of ${entities[1].placeholder}.`;
      const restored = restoreProtectedEntities(simulatedRewrite, entities);

      expect(restored.restoredText).toContain('$$\\mathcal{L}_{\\theta} = \\sum_{i=1}^n (y_i - \\hat{y}_i)^2$$');
      expect(restored.restoredText).toContain('$O(n^2)$');
      expect(restored.placeholderIntegrityVerified).toBe(true);
    });
  });
});
