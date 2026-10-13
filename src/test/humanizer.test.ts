import { describe, it, expect } from 'vitest';
import { buildHumanizerPrompt } from '../server/humanizer.ts';

describe('Humanizer Engine Prompt Construction', () => {
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
