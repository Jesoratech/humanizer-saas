import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { buildHumanizerPrompt, executeHumanize } from '../server/humanizer.ts';
import type { HumanizeRequest } from '../shared/schemas.ts';

describe('Humanizer Engine & Mock Provider Integration', () => {
  describe('Legacy buildHumanizerPrompt (v1)', () => {
    it('builds system prompt with tone, audience, and strength instructions', () => {
      const { systemPrompt, userPrompt } = buildHumanizerPrompt({
        text: 'AI generated draft here.',
        tone: 'conversational',
        audience: 'technical',
        strength: 'strong',
        preserveStructure: true,
      });

      expect(systemPrompt).toContain('Natural, relaxed');
      expect(systemPrompt).toContain('STRONG');
      expect(systemPrompt).toContain('Technical');
      expect(systemPrompt).toContain('delve');
      expect(systemPrompt).toContain('testament');
      expect(userPrompt).toContain('AI generated draft here.');
    });
  });

  describe('executeHumanize (Mock Provider Integration)', () => {
    const originalFetch = globalThis.fetch;

    beforeEach(() => {
      vi.restoreAllMocks();
    });

    afterEach(() => {
      globalThis.fetch = originalFetch;
    });

    it('successfully processes a V3 request with entity protection and diagnostic metadata', async () => {
      globalThis.fetch = vi.fn().mockImplementation(async (_endpoint, init) => {
        const body = JSON.parse(init.body);
        const userPrompt = body.contents[0].parts[0].text;
        const placeholder = userPrompt.match(/__HUMANLY_PROT_[A-Z0-9_]+__/)?.[0] || '';
        return {
          ok: true,
          status: 200,
          json: async () => ({
            candidates: [
              {
                content: {
                  parts: [
                    {
                      text: `Configuring connection pools minimizes latency. Review ${placeholder} for specifications.`,
                    },
                  ],
                },
              },
            ],
          }),
        };
      });

      const request: HumanizeRequest = {
        text: 'Utilizing connection pooling provides immense benefits. Review https://example.com/pool for specifications.',
        tone: 'professional',
        audience: 'technical',
        strength: 'balanced',
        documentType: 'technical_doc',
        voicePreferences: { formality: 'formal', directness: 'direct' },
        userIntent: 'Explain pool configuration directly',
        protectedTerms: ['connection pools'],
        promptVersion: 'v3',
      };

      const result = await executeHumanize(request, {
        apiKey: 'test-api-key',
        model: 'gemini-3.5-flash-lite',
      });

      expect(result.promptVersion).toBe('v3');
      expect(result.provider).toBe('gemini-3.5-flash-lite');
      expect(result.metadata.model).toBe('gemini-3.5-flash-lite');
      expect(result.metadata.documentType).toBe('technical_doc');
      expect(result.metadata.hasAuthorIntent).toBe(true);
      expect(result.metadata.intentIncludedInPrompt).toBe(true);
      expect(result.metadata.hasVoicePreferences).toBe(true);
      expect(result.metadata.extractedEntitiesCount).toBe(1);
      expect(result.metadata.restoredEntitiesCount).toBe(1);
      expect(result.metadata.placeholderIntegrityVerified).toBe(true);
      expect(result.rewrittenText).toContain('https://example.com/pool');
    });

    it('performs bounded auto-retry when model output is empty', async () => {
      let callCount = 0;
      globalThis.fetch = vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: async () => ({ candidates: [{ content: { parts: [{ text: '' }] } }] }),
          });
        }
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({
            candidates: [
              {
                content: {
                  parts: [{ text: 'Here is the successfully recovered rewrite.' }],
                },
              },
            ],
          }),
        });
      });

      const request: HumanizeRequest = {
        text: 'Source text for retry test.',
        tone: 'professional',
        audience: 'general',
        strength: 'balanced',
        promptVersion: 'v3',
      };

      const result = await executeHumanize(request, {
        apiKey: 'test-api-key',
        maxRetries: 1,
      });

      expect(callCount).toBe(2);
      expect(result.rewrittenText).toBe('Here is the successfully recovered rewrite.');
    });

    it('throws controlled error and logs category on upstream 429 rate limit', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 429,
        text: async () => JSON.stringify({ error: { message: 'Quota exceeded for model' } }),
      });

      const request: HumanizeRequest = {
        text: 'Text hitting rate limit.',
        tone: 'professional',
        audience: 'general',
        strength: 'balanced',
      };

      await expect(
        executeHumanize(request, {
          apiKey: 'test-api-key',
        })
      ).rejects.toThrow('Quota exceeded for model');
    });
  });
});
