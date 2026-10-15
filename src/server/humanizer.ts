import type {
  HumanizeRequest,
  HumanizeResponse,
} from '../shared/schemas.ts';
import { countWords } from '../shared/schemas.ts';
import { getPromptEngine } from './prompts/index.ts';
import { validateRewrite, extractProtectedEntities } from './validator.ts';
import { logDiagnostic } from './logger.ts';

interface HumanizerOptions {
  apiKey: string;
  model?: string;
  maxRetries?: number;
}

export { buildHumanizerPrompt } from './prompts/v1.ts';

interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
}

async function callGeminiApi(
  endpoint: string,
  systemPrompt: string,
  userPrompt: string,
  temperature: number,
  topP: number
): Promise<string> {
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
      temperature,
      topP,
      maxOutputTokens: 4000,
    },
  };

  // Extract model and API key from endpoint for fallback capability
  const urlMatch = endpoint.match(/models\/([^:]+):generateContent\?key=([^&]+)/);
  const currentModel = urlMatch?.[1] || 'gemini-2.5-flash';
  const apiKey = urlMatch?.[2] || '';

  // Candidate models to try in case of 429 (quota exceeded), 503 (high demand), 500, or timeout
  // gemini-2.5-flash is the best for instruction-following; fall back to lighter models on quota issues
  const candidateModels = [
    currentModel,
    'gemini-2.5-flash',
    'gemini-flash-lite-latest',
    'gemini-3.5-flash-lite',
  ].filter((m, i, arr) => Boolean(m) && arr.indexOf(m) === i);

  let lastError: (Error & { status?: number }) | null = null;

  for (let idx = 0; idx < candidateModels.length; idx++) {
    const candidate = candidateModels[idx];
    const candidateEndpoint = apiKey
      ? `https://generativelanguage.googleapis.com/v1beta/models/${candidate}:generateContent?key=${apiKey}`
      : endpoint;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      const response = await fetch(candidateEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

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
        const err = new Error(errorMessage) as Error & { status?: number };
        err.status = response.status;

        // If upstream 503/500/502/429/404 and another candidate exists, try fallback
        if ((response.status >= 500 || response.status === 503 || response.status === 429 || response.status === 404) && idx < candidateModels.length - 1) {
          lastError = err;
          continue;
        }

        throw err;
      }

      const data = (await response.json()) as GeminiResponse;
      const parts = data.candidates?.[0]?.content?.parts || [];
      const text = parts
        .map((p) => p.text || '')
        .filter(Boolean)
        .join('')
        .trim();

      return text;
    } catch (err: unknown) {
      const errorObj = err as Error & { status?: number; name?: string };
      // If timeout or network error or quota/upstream error and we have more candidates, retry next
      if ((errorObj.name === 'AbortError' || errorObj.status === 429 || errorObj.status === 503 || (errorObj.status && errorObj.status >= 500)) && idx < candidateModels.length - 1) {
        lastError = errorObj;
        continue;
      }
      throw err;
    }
  }

  throw lastError || new Error('All AI model attempts failed.');
}

/**
 * Second-pass naturalizer prompt.
 * Takes already-rewritten text and calibrates human tone, rhythm,
 * and high-perplexity phrasing that defeats AI detectors like ZeroGPT.
 */
function buildNaturalizerPrompt(
  firstPassText: string,
  tone: string = 'professional'
): {
  systemPrompt: string;
  userPrompt: string;
} {
  const toneDirectives: Record<string, string> = {
    professional: `Tone: Executive Editor / Senior Columnist (like The Atlantic or Economist).
- Direct, authoritative, sharp, and authentic.
- Vary cadence radically: slam a 4-word sentence next to a 32-word sprawling thought.
- Use em-dashes, colons, and parentheticals to interrupt yourself mid-sentence.`,
    conversational: `Tone: Natural human conversation.
- Genuine, warm, slightly rambling at times.
- Natural contractions, half-finished ideas, colloquial pivots.
- Mix 3-word fragments with long run-on thoughts separated by em-dashes.`,
    academic: `Tone: Scholarly voice with genuine human friction.
- Precision without robotic smoothness. Real scholars hedge differently: "The data suggest, though not conclusively..."
- Occasional direct assertion breaking from hedged norm: "This interpretation is wrong."
- Start some sentences with the finding, not the method: "Outcomes improved. Why? The control group had..."
- Use elliptical references and semi-colons; vary between passive and active construction unpredictably.
- BANNED: 'Furthermore', 'Moreover', 'Additionally', 'In conclusion', 'It is worth noting', 'robust', 'comprehensive', 'multifaceted', 'leverage', 'underscore', 'highlight'.`,
    simple: `Tone: Plain, clear English.
- Short sentences, everyday words.
- Occasional one-word paragraph for emphasis.
- Zero jargon or complexity.`,
    marketing: `Tone: Sharp copywriting.
- High impact, benefit-driven, punchy.
- Short lines. Then one long vivid line. Then short again.
- Zero buzzwords or hollow superlatives.`,
    creative: `Tone: Evocative, rhythmic prose.
- Sensory depth and textured cadence.
- Unexpected metaphors that actually earn their place.`,
  };

  const selectedTone = toneDirectives[tone] || toneDirectives.professional;

  const systemPrompt = `You are a master developmental editor. Your ONLY mission: make this text read 100% human-authored.

${selectedTone}

THE FIVE THINGS AI DETECTORS ACTUALLY MEASURE:
1. PERPLEXITY — AI picks the most probable next word every time. Humans don't. Use the 2nd or 3rd best word, not the obvious one.
2. BURSTINESS — AI sentences are 15-22 words each, like a metronome. Humans write "Short. Then long and sprawling with a twist—sometimes self-correcting mid-thought. Then short again."
3. SERIAL LISTS — Strings of 3+ abstract nouns ("leadership, governance, education") trigger instant AI flags. Break every list into separate concrete sentences.
4. FORMULAIC TRANSITIONS — "Furthermore," "Moreover," "In conclusion," "It is important to note" = immediate AI flag. Use: "But," "And," "Then again," "Here's the catch," or no transition.
5. UNIFORM PARAGRAPH STRUCTURE — AI writes topic sentence + 3 even supporting sentences + transition. Humans don't. Some paragraphs are one line. Some are eight.

DO NOT USE THESE WORDS (auto-AI-flagged): vital, pivotal, testament, tapestry, beacon, delve, foster, advancements, landscape, sustainable, poised, seamlessly, robust, comprehensive, multifaceted, myriad, streamline, leverage, utilize, underscore, highlight, demonstrate, facilitate.

FACT PRESERVATION: Every fact, name, date, statistic, citation, and __HUMANLY_PROT_*__ token must be preserved exactly.
OUTPUT: Return ONLY the final text. No preamble, no commentary.`;

  const userPrompt = `Rewrite this to sound 100% authentically human (0% AI score):\n\n${firstPassText}`;

  return { systemPrompt, userPrompt };
}

/**
 * Third-pass surgical anti-detection rewrite.
 * Identifies the most AI-sounding sentences and rewrites ONLY those.
 * Preserves sentences that are already human-sounding.
 */
function buildAntiDetectionPass(text: string): {
  systemPrompt: string;
  userPrompt: string;
} {
  const systemPrompt = `You are a forensic AI-detection analyst and surgical rewriter.

Your task: Scan the text and find every sentence that would score HIGH on ZeroGPT, GPTZero, or Turnitin AI detection. Then rewrite ONLY those sentences in place.

SENTENCES THAT TRIGGER AI DETECTORS (target these for rewriting):
- Sentences with nominalized abstractions as subjects: "The implementation of X...", "The development of Y...", "The analysis demonstrates..."
- Consecutive medium-length sentences (all between 15-25 words)
- Hedging formulas: "It is important to note", "Research suggests", "Studies have shown", "Evidence indicates"
- Smooth logical transitions leading every sentence (real humans leave conceptual gaps)
- Summary/conclusion sentences that restate what was just said
- Any sentence using: comprehensive, crucial, multifaceted, myriad, robust, streamline, leverage, utilize, underscore, demonstrate, facilitate, innovative, holistic, synergy

HOW TO REWRITE FLAGGED SENTENCES:
- Fragment some into 3-6 word punchy lines
- Make others sprawling (30+ words) with em-dashes or parentheticals
- Use unusual but correct word choices (not the most probable synonym)
- Add a micro-opinion, hedged qualifier, or tangential aside
- Start some with conjunctions: And, But, Yet, Though, Still
- Introduce light sentence-to-sentence tension or slight redundancy (human writers do this)

DO NOT TOUCH:
- Sentences already short, punchy, or conversational
- Any facts, numbers, citations, named entities, or __HUMANLY_PROT_*__ tokens
- The overall meaning and structure

OUTPUT: Return the COMPLETE text with surgical rewrites applied. Return only the final text—no commentary, no labels, no markdown.`;

  const userPrompt = `Scan and surgically rewrite the AI-sounding sentences:\n\n${text}`;

  return { systemPrompt, userPrompt };
}

/**
 * Post-processing: deterministic text transformations to break
 * remaining AI patterns that survive model generation.
 */
function postProcessText(text: string): string {
  let result = text;

  // 1. Remove markdown fences or meta-preambles if model generated any
  result = result.replace(/^```[a-z]*\n/gi, '').replace(/\n```$/gi, '');
  result = result.replace(/^(?:Here (?:is|are) (?:the |your |several )?(?:rewrite|revision|options|revised text)[^:\n]*:?\s*)+/gi, '');
  result = result.replace(/^\*\*(?:Option|Version) \d+[^:]*\*\*:\s*/gim, '');
  result = result.replace(/^>(?:\s*)/gm, '');

  // 2. Remove remaining AI crutch phrases that slipped through
  const aiCrutches: Array<[RegExp, string | ((substring: string, ...args: unknown[]) => string)]> = [
    [/\bIn today's (?:rapidly |fast-)?(?:evolving|changing) (?:world|landscape|environment)\b[.,]?\s*/gi, ''],
    [/\bIt is (?:important|worth|crucial|essential) to (?:note|remember|understand|recognize) that\b\s*/gi, ''],
    [/\bplays a (?:crucial|pivotal|vital|key|important) role (?:in|for)\b/gi, 'shapes'],
    [/\bplays a (?:crucial|pivotal|vital|key|important) role\b/gi, 'matters'],
    [/\bserves as a (?:testament|beacon|reminder) to\b/gi, 'shows'],
    [/\bserves as a (?:testament|beacon|reminder)\b/gi, 'shows this'],
    [/\brich (?:tapestry|cultural heritage)\b/gi, 'centuries of heritage'],
    [/\bharmonious (?:coexistence|blend|balance)\b/gi, 'genuine coexistence'],
    [/\bnot only\s+(.+?)\s+but also\b/gi, '$1 and'],
    [/\bis equally vital\b/gi, 'matters just as much'],
    [/\bis of paramount importance\b/gi, 'matters enormously'],
    [/\ba brighter (?:future|tomorrow)\b/gi, 'a better future'],
    [/\bpoised to (?:lead|drive|spearhead)\b/gi, 'ready to lead'],
    [/\bunderscor(?:e|es|ed|ing)\b/gi, 'shows'],
    [/\bhighlight(?:s|ed|ing)?\b/gi, 'show'],
    [/\bdemonstrat(?:e|es|ed|ing)\b/gi, 'show'],
    [/\bfacilitat(?:e|es|ed|ing)\b/gi, 'enable'],
    [/\butiliz(?:e|es|ed|ing)\b/gi, 'use'],
    [/\bleverag(?:e|es|ed|ing)\b/gi, 'use'],
    [/\bfurthermore,?\s*/gi, ''],
    [/\bmoreover,?\s*/gi, ''],
    [/\badditionally,?\s*/gi, ''],
    [/\bin addition,?\s*/gi, ''],
    [/\bconsequently,?\s*/gi, ''],
    [/\bsubsequently,?\s*/gi, ''],
    [/\bultimately,?\s*/gi, 'In the end, '],
    [/\bin conclusion,?\s*/gi, ''],
    [/\bto summarize,?\s*/gi, ''],
    [/\bit is worth noting (?:that\s*)?/gi, ''],
    [/\bit should be noted (?:that\s*)?/gi, ''],
    [/\bit is important to note (?:that\s*)?/gi, ''],
  ];

  for (const [regex, replacement] of aiCrutches) {
    if (typeof replacement === 'string') {
      result = result.replace(regex, replacement);
    } else {
      result = result.replace(regex, replacement as (m: string) => string);
    }
  }

  // 3. Fix sentence starts that were left lowercase after removals
  result = result.replace(/(?<=\.\s{1,2}|^)([a-z])/gm, (c) => c.toUpperCase());

  // 4. Clean up double spaces from removals
  result = result.replace(/[ \t]{2,}/g, ' ');
  result = result.replace(/\n /g, '\n');
  result = result.replace(/^\s+/gm, (match) => {
    return match.length > 4 ? match : '';
  });

  // Remove empty lines caused by removals (keep intentional paragraph breaks)
  result = result.replace(/\n{3,}/g, '\n\n');

  return result.trim();
}

/**
 * Stealth Unicode encoding: injects invisible zero-width spaces (U+200B) into
 * ~18% of eligible words (5+ chars) to break AI-detector tokenization without
 * affecting rendered text. This is the industry-standard technique used by
 * commercial AI humanizers (Undetectable.ai, Humanizer Pro, etc.).
 *
 * Zero-width spaces are:
 * - Completely invisible in every major browser, Word, Google Docs, PDF
 * - Ignored by spell-checkers
 * - Safe to copy-paste; they carry through but remain invisible
 * - NOT detectable by ZeroGPT, GPTZero, or Turnitin visual inspection
 */
function applyStealthEncoding(text: string): string {
  const ZWSP = '\u200B'; // Zero-Width Space — invisible break

  return text.replace(/\b([a-zA-Z]{5,})\b/g, (word, _match, offset: number) => {
    // Deterministic pseudo-random: ~18% of eligible words get a ZWSP
    const hash = ((offset * 2654435761) >>> 0) ^ (word.length * 40503);
    if (hash % 6 !== 0) return word; // only ~1-in-6 words

    // Insert ZWSP at a position away from the start/end to avoid visual oddities
    const insertAt = 2 + (hash % Math.max(1, word.length - 4));
    return word.slice(0, insertAt) + ZWSP + word.slice(insertAt);
  });
}

export async function executeHumanize(
  request: HumanizeRequest,
  options: HumanizerOptions
): Promise<HumanizeResponse> {
  const startTime = performance.now();
  const model = options.model || 'gemini-3.5-flash-lite';
  const promptVersion = request.promptVersion || 'v3';
  const engine = getPromptEngine(promptVersion);

  // Stage D: Placeholder Extraction (active in v3)
  const shouldExtractPlaceholders = promptVersion === 'v3';
  const { processedText, entities } = shouldExtractPlaceholders
    ? extractProtectedEntities(request.text)
    : { processedText: request.text, entities: [] };

  const promptRequest: HumanizeRequest = {
    ...request,
    text: processedText,
  };

  const promptConfig = engine.build(promptRequest);
  const requestId = 'req_' + Math.random().toString(36).substring(2, 11);
  const inputWords = countWords(request.text);

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${options.apiKey}`;

  let retryCount = 0;
  let rawText = '';
  let finalValidation = validateRewrite(
    request.text,
    '',
    {
      protectedTerms: request.protectedTerms,
      preserveStructure: request.preserveStructure,
    },
    entities
  );

  try {
    // ============================================================
    // CYCLES: Run AI passes 1-3 in a loop.
    //   strong   → 2 cycles (equivalent to user clicking Humanize twice)
    //   balanced → 1 cycle (naturalizer + anti-detection)
    //   light    → 0 extra cycles (pass 1 only, no naturalizer)
    // Each cycle compounds entropy, burstiness, and vocabulary unpredictability.
    // ============================================================
    const totalCycles = request.strength === 'strong' ? 2 : 1;

    for (let cycle = 0; cycle < totalCycles; cycle++) {
      // PASS 1 (cycle 0): Initial structural rewrite from source prompt
      // PASS 1 (cycle 1+): Re-humanize the already-rewritten text at high temp
      if (cycle === 0) {
        rawText = await callGeminiApi(
          endpoint,
          promptConfig.systemPrompt,
          promptConfig.userPrompt,
          promptConfig.temperature,
          promptConfig.topP
        );
      } else if (rawText.trim()) {
        // Second cycle: feed output back through naturalizer-level rewrite
        const rehuman = buildNaturalizerPrompt(rawText, request.tone);
        const recycled = await callGeminiApi(
          endpoint,
          rehuman.systemPrompt,
          rehuman.userPrompt,
          1.1, // Slightly higher than cycle 1 for fresh unpredictability
          0.99
        );
        if (recycled.trim()) rawText = recycled;
      }

      // PASS 2: Naturalizer (all cycles, balanced/strong only)
      if (request.strength !== 'light' && rawText.trim()) {
        const naturalizer = buildNaturalizerPrompt(rawText, request.tone);
        const pass2Result = await callGeminiApi(
          endpoint,
          naturalizer.systemPrompt,
          naturalizer.userPrompt,
          0.95,
          0.97
        );
        if (pass2Result.trim()) rawText = pass2Result;
      }

      // PASS 3: Surgical anti-detection rewrite (all cycles, balanced/strong only)
      if (request.strength !== 'light' && rawText.trim()) {
        const antiDetect = buildAntiDetectionPass(rawText);
        const pass3Result = await callGeminiApi(
          endpoint,
          antiDetect.systemPrompt,
          antiDetect.userPrompt,
          1.0,
          0.98
        );
        if (pass3Result.trim()) rawText = pass3Result;
      }
    }

    // ============================================================
    // PASS 4: Deterministic post-processing (once, after all cycles)
    // Strip any surviving AI crutch phrases
    // ============================================================
    if (promptVersion === 'v3') {
      rawText = postProcessText(rawText);
    }

    // ============================================================
    // PASS 5: Stealth Unicode encoding (once, after all cycles)
    // Inject invisible zero-width spaces to defeat detector tokenization
    // ============================================================
    if (promptVersion === 'v3' && request.strength !== 'light') {
      rawText = applyStealthEncoding(rawText);
    }

    finalValidation = validateRewrite(
      request.text,
      rawText,
      {
        protectedTerms: request.protectedTerms,
        preserveStructure: request.preserveStructure,
      },
      entities
    );

    // Bounded auto-retry (strictly max 1 attempt for objective dropped URLs or empty response)
    if (finalValidation.needsRetry && (options.maxRetries ?? 1) > 0) {
      retryCount = 1;
      let reinforcedUserPrompt = promptConfig.userPrompt;
      if (finalValidation.retryReason === 'DROPPED_URLS' && finalValidation.droppedUrls.length > 0) {
        reinforcedUserPrompt += `\n\nREMINDER: You omitted the following required URL(s): ${finalValidation.droppedUrls.join(', ')}. They must be preserved.`;
      }

      const retryRaw = await callGeminiApi(
        endpoint,
        promptConfig.systemPrompt,
        reinforcedUserPrompt,
        promptConfig.temperature,
        promptConfig.topP
      );

      const retryValidation = validateRewrite(
        request.text,
        retryRaw,
        {
          protectedTerms: request.protectedTerms,
          preserveStructure: request.preserveStructure,
        },
        entities
      );

      // Keep retry result if valid
      if (retryValidation.isValid) {
        rawText = retryRaw;
        finalValidation = retryValidation;
      }
    }

    if (!finalValidation.isValid) {
      throw new Error(finalValidation.warnings[0] || 'Rewritten text failed structural validation.');
    }

    const durationMs = performance.now() - startTime;
    const outputWords = countWords(finalValidation.sanitizedText);

    // Structured diagnostic logging (never logs source or output text)
    logDiagnostic({
      requestId,
      provider: 'google-gemini',
      model,
      durationMs,
      inputWordCount: inputWords,
      outputWordCount: outputWords,
      status: finalValidation.warnings.length > 0 ? 'validation_warning' : 'success',
      statusCode: 200,
      errorCategory: 'NONE',
      retryCount,
      warningsCount: finalValidation.warnings.length,
    });

    const hasAuthorIntent = Boolean(request.userIntent && request.userIntent.trim().length > 0);
    const hasVoicePreferences = Boolean(
      request.voicePreferences && Object.keys(request.voicePreferences).length > 0
    );

    return {
      rewrittenText: finalValidation.sanitizedText,
      provider: model,
      requestId,
      promptVersion,
      warnings: finalValidation.warnings,
      metadata: {
        originalWordCount: inputWords,
        rewrittenWordCount: outputWords,
        tone: request.tone,
        strength: request.strength,
        audience: request.audience,
        documentType: request.documentType || 'general_prose',
        voicePreferences: request.voicePreferences,
        durationMs: Math.round(durationMs),
        model,
        hasAuthorIntent,
        intentIncludedInPrompt: hasAuthorIntent && (promptVersion === 'v3' || promptVersion === 'v2'),
        hasVoicePreferences,
        extractedEntitiesCount: entities.length,
        restoredEntitiesCount: finalValidation.restoredEntitiesCount,
        placeholderIntegrityVerified: finalValidation.placeholderIntegrityVerified,
        warningCategories: finalValidation.warningCategories,
        preservedEntitiesCount:
          (request.protectedTerms?.length || 0) -
          finalValidation.missingProtectedTerms.length +
          finalValidation.restoredEntitiesCount,
        flaggedEntitiesCount: finalValidation.warnings.length,
      },
    };
  } catch (err: unknown) {
    const durationMs = performance.now() - startTime;
    const errorObj = err as Error & { status?: number };
    const statusCode = errorObj.status || 500;
    const errorCategory =
      statusCode === 429 ? 'RATE_LIMIT' : statusCode >= 500 ? 'UPSTREAM_MODEL' : 'VALIDATION';

    logDiagnostic({
      requestId,
      provider: 'google-gemini',
      model,
      durationMs,
      inputWordCount: inputWords,
      outputWordCount: 0,
      status: 'error',
      statusCode,
      errorCategory,
      retryCount,
      warningsCount: 0,
    });

    throw err;
  }
}
