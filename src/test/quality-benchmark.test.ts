import { describe, it, expect } from 'vitest';
import { QUALITY_BENCHMARK_SUITE } from './quality-benchmark.ts';
import { promptEngineV3 } from '../server/prompts/v3.ts';
import {
  extractProtectedEntities,
  restoreProtectedEntities,
  validateRewrite,
} from '../server/validator.ts';
import { countWords } from '../shared/schemas.ts';

describe('V3.1 Quality Benchmark Suite (20 Representative Passages)', () => {
  it('contains exactly 20 diverse, structured samples', () => {
    expect(QUALITY_BENCHMARK_SUITE.length).toBe(20);

    const docTypes = new Set(QUALITY_BENCHMARK_SUITE.map((s) => s.documentType));
    // Covers multiple distinct document types
    expect(docTypes.size).toBeGreaterThanOrEqual(6);
  });

  it('generates fully populated V3 prompt configs for every sample', () => {
    for (const sample of QUALITY_BENCHMARK_SUITE) {
      const config = promptEngineV3.build({
        text: sample.sourceText,
        tone: sample.tone,
        audience: sample.audience,
        strength: sample.strength,
        documentType: sample.documentType,
        voicePreferences: sample.voicePreferences,
        userIntent: sample.userIntent,
        protectedTerms: sample.protectedTerms,
        preserveStructure: true,
      });

      expect(config.systemPrompt).toBeTruthy();
      expect(config.userPrompt).toContain(sample.sourceText);
      expect(config.temperature).toBeGreaterThan(0);
      expect(config.topP).toBeGreaterThan(0);

      // Verify documentType guidelines are injected into system prompt
      if (sample.documentType === 'academic_abstract') {
        expect(config.systemPrompt).toContain('Academic Abstract');
      } else if (sample.documentType === 'technical_doc') {
        expect(config.systemPrompt).toContain('Technical Documentation');
      } else if (sample.documentType === 'professional_email') {
        expect(config.systemPrompt).toContain('Professional Email');
      } else if (sample.documentType === 'marketing_copy') {
        expect(config.systemPrompt).toContain('Marketing Copy');
      }

      // Verify author intent is injected if present
      if (sample.userIntent) {
        expect(config.systemPrompt).toContain(`AUTHOR'S INTENDED GOAL:\n"${sample.userIntent}"`);
      }
    }
  });

  it('performs lossless placeholder extraction and restoration on samples with protected content', () => {
    const samplesWithProtectedEntities = QUALITY_BENCHMARK_SUITE.filter(
      (s) =>
        s.id.includes('math') ||
        s.id.includes('url') ||
        s.id.includes('citation') ||
        s.id.includes('code')
    );

    for (const sample of samplesWithProtectedEntities) {
      const { processedText, entities } = extractProtectedEntities(sample.sourceText);
      if (entities.length > 0) {
        // Placeholders in processed text
        for (const entity of entities) {
          expect(processedText).toContain(entity.placeholder);
        }

        // Complete roundtrip restoration
        const restored = restoreProtectedEntities(processedText, entities);
        expect(restored.restoredCount).toBe(entities.length);
        expect(restored.restoredText).toBe(sample.sourceText);
      }
    }
  });

  it('preserves adjacent punctuation without double-punctuation on URL samples', () => {
    const urlSample = QUALITY_BENCHMARK_SUITE.find((s) => s.id === 'sample_13_urls_adjacent_punctuation');
    expect(urlSample).toBeDefined();
    if (!urlSample) return;

    const { processedText, entities } = extractProtectedEntities(urlSample.sourceText);
    expect(entities.length).toBe(3);

    // None of the extracted URLs should end with punctuation
    for (const ent of entities) {
      expect(ent.original.endsWith(',')).toBe(false);
      expect(ent.original.endsWith(';')).toBe(false);
      expect(ent.original.endsWith('.')).toBe(false);
    }

    // Processed text preserves punctuation
    expect(processedText).toContain(',');
    expect(processedText).toContain(';');
  });

  it('validates protected terms in quantitative samples without false-negative warnings', () => {
    const quantSample = QUALITY_BENCHMARK_SUITE.find((s) => s.id === 'sample_15_quantitative_metrics');
    expect(quantSample).toBeDefined();
    if (!quantSample || !quantSample.protectedTerms) return;

    const validation = validateRewrite(quantSample.sourceText, quantSample.sourceText, {
      protectedTerms: quantSample.protectedTerms,
    });

    expect(validation.isValid).toBe(true);
    expect(validation.missingProtectedTerms.length).toBe(0);
  });

  it('verifies word count calculations across all 20 samples', () => {
    for (const sample of QUALITY_BENCHMARK_SUITE) {
      const words = countWords(sample.sourceText);
      expect(words).toBeGreaterThan(10);
    }
  });
});
