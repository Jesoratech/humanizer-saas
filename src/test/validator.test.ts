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
    });

    it('strips accidental wrapper tags and code fences', () => {
      const res = validateRewrite(
        'Original prose without fences.',
        '<draft_to_edit>\n```markdown\nClean rewritten human prose here.\n```\n</draft_to_edit>'
      );
      expect(res.isValid).toBe(true);
      expect(res.sanitizedText).toBe('Clean rewritten human prose here.');
    });

    it('detects dropped URLs and marks for retry', () => {
      const original = 'Visit https://humanly.app/docs for instructions.';
      const rewritten = 'Visit our documentation website for instructions.';
      const res = validateRewrite(original, rewritten);

      expect(res.droppedUrls).toContain('https://humanly.app/docs');
      expect(res.needsRetry).toBe(true);
      expect(res.retryReason).toBe('DROPPED_URLS');
      expect(res.warnings.some((w) => w.includes('https://humanly.app/docs'))).toBe(true);
    });

    it('detects dropped academic citations', () => {
      const original = 'Previous benchmarks disputed these results [1, 2] and (Vaswani et al., 2017).';
      const rewritten = 'Previous benchmarks disputed these results significantly.';
      const res = validateRewrite(original, rewritten);

      expect(res.droppedCitations).toContain('[1, 2]');
      expect(res.droppedCitations).toContain('(Vaswani et al., 2017)');
      expect(res.warnings.some((w) => w.includes('citation'))).toBe(true);
    });

    it('detects missing protected terms', () => {
      const original = 'We migrated our backend from Express to Cloudflare Workers with Supabase.';
      const rewritten = 'We migrated our backend to edge serverless functions.';
      const res = validateRewrite(original, rewritten, {
        protectedTerms: ['Cloudflare Workers', 'Supabase'],
      });

      expect(res.missingProtectedTerms).toContain('Cloudflare Workers');
      expect(res.missingProtectedTerms).toContain('Supabase');
      expect(res.warnings.some((w) => w.includes('Protected term'))).toBe(true);
    });

    it('detects missing protected code snippets', () => {
      const original = 'Call `supabase.auth.getSession()` on component mount.';
      const rewritten = 'Call the session retrieval method on mount.';
      const res = validateRewrite(original, rewritten);

      expect(res.droppedCodeSpans).toContain('`supabase.auth.getSession()`');
      expect(res.warnings.some((w) => w.includes('code snippet'))).toBe(true);
    });

    it('flags unexpected numerical discrepancies', () => {
      const original = 'Revenue expanded by 18.4% to $4.2M across 12,000 customers.';
      const rewritten = 'Revenue expanded nicely to several millions across many customers.';
      const res = validateRewrite(original, rewritten);

      expect(res.numericalDiscrepancies.length).toBeGreaterThan(0);
      expect(res.warnings.some((w) => w.includes('Review numbers') || w.includes('numerical figures'))).toBe(true);
    });

    it('detects degenerate phrase repetition loops', () => {
      const original = 'A brief paragraph about technology.';
      const loopingText =
        'This technology is very fast. This technology is very fast. This technology is very fast.';
      const res = validateRewrite(original, loopingText);

      expect(res.isValid).toBe(false);
      expect(res.retryReason).toBe('REPETITIVE_LOOP');
    });

    it('warns on substantial length collapse (<45% length)', () => {
      const original =
        'This is an extensive analysis detailing thirty-five distinct factors regarding application security, operational reliability, continuous deployment pipelines, automated integration testing, and team coordination protocols across remote workforces.';
      const rewritten = 'Security and reliability matter for remote teams.';
      const res = validateRewrite(original, rewritten);

      expect(res.warnings.some((w) => w.includes('significantly shorter'))).toBe(true);
    });
  });

  describe('Placeholder-Based Protection Pipeline (Phase 8)', () => {
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

      // Placeholders follow strict __HUMANLY_PROT_*__ pattern
      for (const entity of entities) {
        expect(processedText).toContain(entity.placeholder);
        expect(entity.placeholder).toMatch(/^__HUMANLY_PROT_[A-Z_0-9]+__$/);
      }
    });

    it('restores extracted placeholders with 100% exact fidelity', () => {
      const originalText = 'Review the source at https://github.com/org/repo and run `npm test` [12].';
      const { entities } = extractProtectedEntities(originalText);

      const urlEntity = entities.find((e) => e.type === 'url')!;
      const codeEntity = entities.find((e) => e.type === 'inline_code')!;
      const citeEntity = entities.find((e) => e.type === 'citation')!;

      // Model edits around placeholders without altering them
      const simulatedModelRewrite = `You can examine the repository at ${urlEntity.placeholder} before executing ${codeEntity.placeholder} as described in ${citeEntity.placeholder}.`;

      const restored = restoreProtectedEntities(simulatedModelRewrite, entities);

      expect(restored.restoredCount).toBe(3);
      expect(restored.missingEntities.length).toBe(0);
      expect(restored.restoredText).toBe(
        'You can examine the repository at https://github.com/org/repo before executing `npm test` as described in [12].'
      );
    });

    it('detects when model accidentally omits an extracted placeholder and flags appropriate warnings', () => {
      const originalText = 'Contact support at https://support.example.com for help.';
      const { entities } = extractProtectedEntities(originalText);

      // Model omitted the URL placeholder entirely
      const droppedRewrite = 'Feel free to reach out to our dedicated support team for help.';
      const restored = restoreProtectedEntities(droppedRewrite, entities);

      expect(restored.missingEntities.length).toBe(1);
      expect(restored.warnings.some((w) => w.includes('https://support.example.com'))).toBe(true);
    });

    it('detects duplicate placeholder insertions', () => {
      const originalText = 'Check `main.py` here.';
      const { entities } = extractProtectedEntities(originalText);

      // Model repeated placeholder twice
      const duplicateRewrite = `Inspect ${entities[0].placeholder} and duplicate ${entities[0].placeholder}.`;
      const restored = restoreProtectedEntities(duplicateRewrite, entities);

      expect(restored.duplicatedEntities.length).toBe(1);
    });

    it('protects LaTeX display math ($$...$$) and inline math', () => {
      const mathText = 'The loss function is $$\\mathcal{L}_{\\theta} = \\sum_{i=1}^n (y_i - \\hat{y}_i)^2$$ with complexity $O(n^2)$.';
      const { processedText, entities } = extractProtectedEntities(mathText);

      expect(entities.some((e) => e.type === 'math')).toBe(true);
      expect(processedText).not.toContain('\\mathcal{L}_{\\theta}');

      const simulatedRewrite = `We optimize the objective ${entities[0].placeholder} yielding an asymptotic bound of ${entities[1].placeholder}.`;
      const restored = restoreProtectedEntities(simulatedRewrite, entities);

      expect(restored.restoredText).toContain('$$\\mathcal{L}_{\\theta} = \\sum_{i=1}^n (y_i - \\hat{y}_i)^2$$');
      expect(restored.restoredText).toContain('$O(n^2)$');
    });
  });
});
