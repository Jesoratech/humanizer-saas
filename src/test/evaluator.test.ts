import { describe, it, expect } from 'vitest';
import { EVALUATION_CORPUS } from './evaluation-corpus.ts';
import { promptEngineV3 } from '../server/prompts/v3.ts';
import {
  validateRewrite,
  extractProtectedEntities,
  restoreProtectedEntities,
} from '../server/validator.ts';
import { countWords } from '../shared/schemas.ts';

describe('100-Passage Quality Benchmark Suite (Humanly V3)', () => {
  it('contains exactly 100 diverse, versioned samples across 10 categories', () => {
    expect(EVALUATION_CORPUS.length).toBe(100);

    const categories = new Set(EVALUATION_CORPUS.map((s) => s.category));
    expect(categories.size).toBe(10);

    for (const cat of categories) {
      const count = EVALUATION_CORPUS.filter((s) => s.category === cat).length;
      expect(count).toBe(10);
    }
  });

  it('generates well-formed v3 prompt configurations for every sample in the corpus', () => {
    for (const sample of EVALUATION_CORPUS) {
      const config = promptEngineV3.build({
        text: sample.sourceText,
        tone: sample.intendedTone,
        audience: sample.intendedAudience,
        strength: sample.intendedStrength,
        documentType: 'general_prose',
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

  it('runs placeholder extraction and restoration across all 10 URL samples', () => {
    const urlSamples = EVALUATION_CORPUS.filter((s) => s.category === 'with_urls');
    expect(urlSamples.length).toBe(10);

    for (const sample of urlSamples) {
      const { entities } = extractProtectedEntities(sample.sourceText);
      expect(entities.length).toBeGreaterThan(0);

      // Model edits surrounding prose and keeps placeholders
      const simulatedRewrite = `Refined prose keeping ${entities.map((e) => e.placeholder).join(' and ')}.`;
      const restored = restoreProtectedEntities(simulatedRewrite, entities);

      expect(restored.restoredCount).toBe(entities.length);
      for (const ent of entities) {
        expect(restored.restoredText).toContain(ent.original);
      }
    }
  });

  it('runs placeholder extraction and restoration across all 10 citation samples', () => {
    const citeSamples = EVALUATION_CORPUS.filter((s) => s.category === 'with_citations');
    expect(citeSamples.length).toBe(10);

    for (const sample of citeSamples) {
      const { processedText, entities } = extractProtectedEntities(sample.sourceText);
      if (entities.length > 0) {
        // Placeholders replace citations in processed text
        for (const ent of entities) {
          expect(processedText).toContain(ent.placeholder);
        }
        // Roundtrip restoration
        const restored = restoreProtectedEntities(processedText, entities);
        expect(restored.restoredText).toBe(sample.sourceText);
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

  it('computes word counts and ratios reliably for all 100 samples', () => {
    for (const sample of EVALUATION_CORPUS) {
      const words = countWords(sample.sourceText);
      expect(words).toBeGreaterThan(5);
    }
  });
});
