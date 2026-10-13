import type {
  Tone,
  Strength,
  Audience,
  HumanizeRequest,
  HumanizeResponse,
} from '../shared/schemas.ts';
import { countWords } from '../shared/schemas.ts';

interface HumanizerOptions {
  apiKey: string;
  model?: string;
}

const TONE_INSTRUCTIONS: Record<Tone, string> = {
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

const STRENGTH_INSTRUCTIONS: Record<Strength, string> = {
  light:
    'Editing Strength: LIGHT. Polish only awkward phrasings, clunky rhythms, and obvious AI markers. Retain the existing sentence structures and words as closely as possible.',
  balanced:
    'Editing Strength: BALANCED. Rephrase stiff sentences, vary sentence lengths dynamically, improve paragraph cadence, and eliminate AI cliches while strictly preserving original points.',
  strong:
    'Editing Strength: STRONG. Perform a comprehensive structural rewrite. Rework transitions, restructure paragraphs, and craft a completely organic human voice while preserving all original facts and core meaning.',
};

const AUDIENCE_INSTRUCTIONS: Record<Audience, string> = {
  general: 'Target Audience: General public. Keep language accessible and intuitive.',
  technical: 'Target Audience: Technical / engineering readers. Preserve technical accuracy, domain terms, and precision.',
  business: 'Target Audience: Executives and business stakeholders. Focus on crisp takeaways, clarity, and pragmatic impact.',
  academic: 'Target Audience: Researchers, educators, and scholars. Maintain intellectual nuance and analytical rigor.',
  casual: 'Target Audience: Casual readers, social media, or personal correspondence.',
};

const AI_PATTERNS_TO_AVOID = [
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

export function buildHumanizerPrompt(request: HumanizeRequest): {
  systemPrompt: string;
  userPrompt: string;
} {
  const systemPrompt = `You are an elite prose editor and writing stylist specializing in transforming artificial, mechanical, or repetitive writing into natural, engaging, human writing.

PRIMARY OBJECTIVES:
1. Eliminate robotic cadence and formulaic AI syntax patterns:
   - Vary sentence lengths dramatically (e.g., short punchy sentences mixed with longer, rhythmically complex clauses).
   - Cut deadwood phrases and empty filler.
   - Avoid cliches like: ${AI_PATTERNS_TO_AVOID.join(', ')}.
2. Adhere strictly to the requested settings:
   - ${TONE_INSTRUCTIONS[request.tone]}
   - ${STRENGTH_INSTRUCTIONS[request.strength]}
   - ${AUDIENCE_INSTRUCTIONS[request.audience]}
3. Faithful Preservation:
   - Retain the author's core thesis, factual statements, arguments, and intent.
   - ${request.preserveStructure ? 'Keep original paragraph divisions and logical order.' : 'You may recombine or re-sequence paragraphs if it significantly improves narrative flow.'}
4. STRICT OUTPUT FORMAT:
   - Output ONLY the rewritten text.
   - Do NOT include any introductory remarks, greetings, notes, or explanations (e.g., do NOT write "Here is your rewritten draft:").
   - Do NOT wrap your output in markdown code blocks or quotes unless the original text contained code blocks.`;

  const userPrompt = `Please humanize the following text:\n\n${request.text}`;

  return { systemPrompt, userPrompt };
}

export async function executeHumanize(
  request: HumanizeRequest,
  options: HumanizerOptions
): Promise<HumanizeResponse> {
  const model = options.model || 'gemini-3.5-flash-lite';
  const { systemPrompt, userPrompt } = buildHumanizerPrompt(request);

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${options.apiKey}`;

  const payload = {
    contents: [
      {
        role: 'user',
        parts: [{ text: userPrompt }],
      },
    ],
    systemInstruction: {
      parts: [{ text: systemPrompt }],
    },
    generationConfig: {
      temperature: request.strength === 'strong' ? 0.85 : request.strength === 'light' ? 0.4 : 0.65,
      topP: 0.95,
      maxOutputTokens: 4000,
    },
  };

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    let errorMessage = `AI model error (${response.status})`;
    try {
      const parsed = JSON.parse(errorText);
      if (parsed.error?.message) {
        errorMessage = parsed.error.message;
      }
    } catch {
      // Use fallback
    }
    throw new Error(errorMessage);
  }

  interface GeminiResponse {
    candidates?: Array<{
      content?: {
        parts?: Array<{
          text?: string;
        }>;
      };
    }>;
  }

  const data = (await response.json()) as GeminiResponse;
  const rawCandidateText =
    data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';

  if (!rawCandidateText) {
    throw new Error('AI provider returned an empty response. Please try again.');
  }

  // Clean any accidental preamble or markdown fences
  let cleanedText = rawCandidateText;
  if (cleanedText.startsWith('```') && cleanedText.endsWith('```')) {
    cleanedText = cleanedText.replace(/^```[a-z]*\n?/, '').replace(/\n?```$/, '').trim();
  }

  const originalWordCount = countWords(request.text);
  const rewrittenWordCount = countWords(cleanedText);
  const requestId = 'req_' + Math.random().toString(36).substring(2, 11);

  const warnings: string[] = [];
  if (rewrittenWordCount < originalWordCount * 0.5) {
    warnings.push('The rewrite is significantly shorter than your original text.');
  } else if (rewrittenWordCount > originalWordCount * 1.5) {
    warnings.push('The rewrite expanded the text by more than 50%.');
  }

  return {
    rewrittenText: cleanedText,
    provider: model,
    requestId,
    warnings,
    metadata: {
      originalWordCount,
      rewrittenWordCount,
      tone: request.tone,
      strength: request.strength,
      audience: request.audience,
    },
  };
}
