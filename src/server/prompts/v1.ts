import type { HumanizeRequest, Tone, Strength, Audience } from '../../shared/schemas.ts';
import type { PromptEngine, PromptConfig } from './types.ts';

const TONE_INSTRUCTIONS_V1: Record<Tone, string> = {
  professional:
    'Tone: Professional, direct, articulate, and poised. Avoid stiff corporate jargon, buzzwords, or passive fluff.',
  academic:
    'Tone: Scholarly and rigorous, with precise vocabulary and clear logical transitions. Avoid overly ornate syntax or filler phrases.',
  conversational:
    'Tone: Natural, relaxed, and approachable, as if speaking to a knowledgeable peer. Use contractions naturally and keep sentence flow fluid.',
  simple:
    'Tone: Plain English, concise, and easy to grasp immediately. Short, clear sentences with minimal jargon.',
  marketing:
    'Tone: Engaging, persuasive, energetic, and value-oriented without sounding like cheap hyperbole or clickbait.',
  creative:
    'Tone: Expressive, vivid, rhythmic, and engaging with distinctive character, evocative phrasing, and varied pacing.',
};

const STRENGTH_INSTRUCTIONS_V1: Record<Strength, string> = {
  light:
    'Editing Strength: LIGHT. Polish only awkward phrasings, clunky rhythms, and obvious AI markers. Retain the existing sentence structures and words as closely as possible.',
  balanced:
    'Editing Strength: BALANCED. Rephrase stiff sentences, vary sentence lengths dynamically, improve paragraph cadence, and eliminate AI cliches while strictly preserving original points.',
  strong:
    'Editing Strength: STRONG. Perform a comprehensive structural rewrite. Rework transitions, restructure paragraphs, and craft a completely organic human voice while preserving all original facts and core meaning.',
};

const AUDIENCE_INSTRUCTIONS_V1: Record<Audience, string> = {
  general: 'Target Audience: General public. Keep language accessible and intuitive.',
  technical: 'Target Audience: Technical / engineering readers. Preserve technical accuracy, domain terms, and precision.',
  business: 'Target Audience: Executives and business stakeholders. Focus on crisp takeaways, clarity, and pragmatic impact.',
  academic: 'Target Audience: Researchers, educators, and scholars. Maintain intellectual nuance and analytical rigor.',
  casual: 'Target Audience: Casual readers, social media, or personal correspondence.',
};

const AI_PATTERNS_TO_AVOID_V1 = [
  'delve',
  'testament',
  'tapestry',
  'beacon',
  'moreover',
  'furthermore',
  'in conclusion',
  'it is important to note',
  'in today\'s fast-paced world',
  'a multifaceted approach',
  'fosters',
  'crucial role',
  'vital',
  'pivotal',
  'unlocking the power of',
  'at the intersection of',
];

export const promptEngineV1: PromptEngine = {
  version: 'v1',
  build(request: HumanizeRequest): PromptConfig {
    const systemPrompt = `You are an elite prose editor and writing stylist specializing in transforming artificial, mechanical, or repetitive writing into natural, engaging, human writing.

PRIMARY OBJECTIVES:
1. Eliminate robotic cadence and formulaic AI syntax patterns:
   - Vary sentence lengths dramatically (e.g., short punchy sentences mixed with longer, rhythmically complex clauses).
   - Cut deadwood phrases and empty filler.
   - Avoid cliches like: ${AI_PATTERNS_TO_AVOID_V1.join(', ')}.
2. Adhere strictly to the requested settings:
   - ${TONE_INSTRUCTIONS_V1[request.tone]}
   - ${STRENGTH_INSTRUCTIONS_V1[request.strength]}
   - ${AUDIENCE_INSTRUCTIONS_V1[request.audience]}
3. Faithful Preservation:
   - Retain the author's core thesis, factual statements, arguments, and intent.
   - ${request.preserveStructure ? 'Keep original paragraph divisions and logical order.' : 'You may recombine or re-sequence paragraphs if it significantly improves narrative flow.'}
4. STRICT OUTPUT FORMAT:
   - Output ONLY the rewritten text.
   - Do NOT include any introductory remarks, greetings, notes, or explanations (e.g., do NOT write "Here is your rewritten draft:").
   - Do NOT wrap your output in markdown code blocks or quotes unless the original text contained code blocks.`;

    const userPrompt = `Please humanize the following text:\n\n${request.text}`;

    return {
      systemPrompt,
      userPrompt,
      temperature: request.strength === 'strong' ? 0.85 : request.strength === 'light' ? 0.4 : 0.65,
      topP: 0.95,
    };
  },
};

export function buildHumanizerPrompt(request: HumanizeRequest): {
  systemPrompt: string;
  userPrompt: string;
} {
  const config = promptEngineV1.build(request);
  return { systemPrompt: config.systemPrompt, userPrompt: config.userPrompt };
}
