import { describe, it, expect } from 'vitest';
import { validateRewrite } from '../server/validator.ts';

describe('Deterministic Output Validator', () => {
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
    expect(res.warnings.some((w) => w.includes('Academic citation'))).toBe(true);
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
