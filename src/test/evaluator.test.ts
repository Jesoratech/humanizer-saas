import { describe, it, expect } from 'vitest';
import { EVALUATION_CORPUS } from './evaluation-corpus.ts';
import { promptEngineV2 } from '../server/prompts/v2.ts';
import { validateRewrite } from '../server/validator.ts';
import { countWords } from '../shared/schemas.ts';

describe('100-Passage Quality Benchmark Suite', () => {
  it('contains exactly 100 diverse, versioned samples across 10 categories', () => {
    expect(EVALUATION_CORPUS.length).toBe(100);

    const categories = new Set(EVALUATION_CORPUS.map((s) => s.category));
    expect(categories.size).toBe(10);

    for (const cat of categories) {
      const count = EVALUATION_CORPUS.filter((s) => s.category === cat).length;
      expect(count).toBe(10);
    }
  });

  it('generates well-formed prompt configurations for every sample in the corpus', () => {
    for (const sample of EVALUATION_CORPUS) {
      const config = promptEngineV2.build({
        text: sample.sourceText,
        tone: sample.intendedTone,
        audience: sample.intendedAudience,
        strength: sample.intendedStrength,
        preserveStructure: true,
        userIntent: sample.userIntent,
        protectedTerms: sample.protectedTerms,
      });

      expect(config.systemPrompt).toBeTruthy();
      expect(config.userPrompt).toContain(sample.sourceText);
      expect(config.temperature).toBeGreaterThan(0);
      expect(config.topP).toBeGreaterThan(0);
    }
  });

  it('validates meaning and entity preservation across all 10 URL samples', () => {
    const urlSamples = EVALUATION_CORPUS.filter((s) => s.category === 'with_urls');
    expect(urlSamples.length).toBe(10);

    for (const sample of urlSamples) {
      // Mock rewrite preserving URL
      const mockRewrite = `Here is the revised draft. ${sample.sourceText}`;
      const res = validateRewrite(sample.sourceText, mockRewrite);
      expect(res.isValid).toBe(true);
      expect(res.droppedUrls.length).toBe(0);

      // Verify that dropping the URL would be detected
      const strippedRewrite = sample.sourceText.replace(/https?:\/\/[^\s]+/g, '[link]');
      const dropRes = validateRewrite(sample.sourceText, strippedRewrite);
      expect(dropRes.droppedUrls.length).toBeGreaterThan(0);
    }
  });

  it('validates citation preservation across all 10 citation samples', () => {
    const citeSamples = EVALUATION_CORPUS.filter((s) => s.category === 'with_citations');
    expect(citeSamples.length).toBe(10);

    for (const sample of citeSamples) {
      if (sample.expectedPreservedEntities) {
        // Test that dropping citation triggers detection
        const brokenRewrite = 'A rewritten sentence without the scholarly citations.';
        const res = validateRewrite(sample.sourceText, brokenRewrite);
        expect(res.warnings.length).toBeGreaterThan(0);
      }
    }
  });

  it('validates protected terms in all quantitative and technical samples', () => {
    const quantSamples = EVALUATION_CORPUS.filter((s) => s.category === 'quantitative');
    for (const sample of quantSamples) {
      if (sample.protectedTerms) {
        const fullRewrite = `${sample.sourceText} Revised for clarity.`;
        const res = validateRewrite(sample.sourceText, fullRewrite, {
          protectedTerms: sample.protectedTerms,
        });
        expect(res.missingProtectedTerms.length).toBe(0);
      }
    }
  });

  it('computes word counts and ratios reliably for all samples', () => {
    for (const sample of EVALUATION_CORPUS) {
      const words = countWords(sample.sourceText);
      expect(words).toBeGreaterThan(5);
    }
  });
});
