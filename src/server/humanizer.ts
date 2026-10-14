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
  const currentModel = urlMatch?.[1] || 'gemini-3.5-flash-lite';
  const apiKey = urlMatch?.[2] || '';

  // Candidate models to try in case of 429 (quota exceeded), 503 (high demand), 500, or timeout
  const candidateModels = [
    currentModel,
    'gemini-3.5-flash-lite',
    'gemini-flash-lite-latest',
    'gemini-2.5-flash',
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
- Avoid robotic corporate clichés, but DO NOT use juvenile slang or excessive casual fillers.
- Vary cadence: mix 4-8 word assertive statements with nuanced 20-30 word explanations.`,
    conversational: `Tone: Natural human conversation.
- Genuine, warm, and flowing.
- Natural contractions and relaxed transitions.
- Eliminate stiff corporate phrasing.`,
    academic: `Tone: Scholarly precision.
- Analytical depth without repetitive LLM filler.
- Eliminate 'Furthermore', 'Moreover', and robotic summaries.`,
    simple: `Tone: Plain, clear English.
- Short sentences, everyday words.
- Zero jargon or complexity.`,
    marketing: `Tone: Compelling copywriting.
- High impact, energetic, benefit-driven.
- Zero buzzwords.`,
    creative: `Tone: Evocative, rhythmic prose.
- Sensory depth and textured cadence.`,
  };

  const selectedTone = toneDirectives[tone] || toneDirectives.professional;

  const systemPrompt = `You are a master developmental editor and human writing calibrator.
Your ONLY mission is to make this text read 100% human-authored and trigger ZERO percent (0%) on all AI detection tools (ZeroGPT, GPTZero, Turnitin).

${selectedTone}

CRITICAL RULES TO ACHIEVE 0% AI DETECTION:
1. DESTROY SERIAL ABSTRACT LISTS:
   Never write lists of 3+ abstract nouns or gerunds (e.g. 'leadership, governance, education, healthcare, and infrastructure' or 'developing ideas, launching businesses, and applying skills').
   Break them apart into distinct, grounded realities and concrete actions.
2. RADICAL BURSTINESS (SENTENCE LENGTH ASYMMETRY):
   - Force wide contrast in sentence lengths. Alternate a 4-7 word sentence with a 20-30 word sentence.
   - Use em-dashes (—) or colons (:) to create authentic human pauses and mid-sentence pivots.
   - Start occasional sentences with 'And', 'But', 'In reality,', 'Of course,', or 'To be clear,'.
3. BANISHED AI SIGNATURES (DO NOT USE):
   'vital', 'pivotal', 'testament', 'tapestry', 'beacon', 'delve', 'potential', 'sustainable', 'advancements', 'foster', 'landscape', 'broader opportunities', 'equally vital', 'overcoming obstacles', 'rich cultural heritage', 'coexist harmoniously', 'poised to lead', 'brighter future'.
4. FACT PRESERVATION:
   Keep every single fact, name, date, statistic, number, and protected token (__HUMANLY_PROT_*__) exactly accurate.
5. OUTPUT:
   Return ONLY the final polished text. No preamble, no quotes, no commentary.`;

  const userPrompt = `Polish this text to sound authentically human:\n\n${firstPassText}`;

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
  const aiCrutches = [
    /\bIn today's (?:rapidly |fast-)?(?:evolving|changing) (?:world|landscape|environment)\b[.,]?\s*/gi,
    /\bIt is (?:important|worth|crucial|essential) to (?:note|remember|understand|recognize) that\b\s*/gi,
    /\bplays a (?:crucial|pivotal|vital|key|important) role (?:in|for)\b/gi,
    /\bplays a (?:crucial|pivotal|vital|key|important) role\b/gi,
    /\bserves as a (?:testament|beacon|reminder) to\b/gi,
    /\bserves as a (?:testament|beacon|reminder)\b/gi,
    /\brich (?:tapestry|cultural heritage)\b/gi,
    /\bharmonious (?:coexistence|blend|balance)\b/gi,
    /\bnot only\s+(.+?)\s+but also\b/gi,
    /\bis equally vital\b/gi,
    /\bis of paramount importance\b/gi,
    /\ba brighter (?:future|tomorrow)\b/gi,
    /\bpoised to (?:lead|drive|spearhead)\b/gi,
  ];

  for (const regex of aiCrutches) {
    if (regex.source.includes('not only')) {
      result = result.replace(regex, '$1 and also');
    } else if (regex.source.includes('equally vital')) {
      result = result.replace(regex, 'matters just as much');
    } else if (regex.source.includes('plays a')) {
      result = result.replace(regex, 'is central to');
    } else if (regex.source.includes('rich')) {
      result = result.replace(regex, 'centuries of heritage');
    } else if (regex.source.includes('brighter')) {
      result = result.replace(regex, 'better future');
    } else if (regex.source.includes('poised to')) {
      result = result.replace(regex, 'ready to');
    } else {
      result = result.replace(regex, '');
    }
  }

  // 3. Clean up double spaces from removals
  result = result.replace(/[ \t]{2,}/g, ' ');
  result = result.replace(/\n /g, '\n');
  result = result.replace(/^\s+/gm, (match) => {
    return match.length > 4 ? match : '';
  });

  // Remove empty lines caused by removals (keep intentional paragraph breaks)
  result = result.replace(/\n{3,}/g, '\n\n');

  return result.trim();
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
    // PASS 1: Structural rewrite with the main prompt engine
    // ============================================================
    rawText = await callGeminiApi(
      endpoint,
      promptConfig.systemPrompt,
      promptConfig.userPrompt,
      promptConfig.temperature,
      promptConfig.topP
    );

    // ============================================================
    // PASS 2: Naturalizer pass (only for v3 balanced/strong)
    // Runs a second model call to inject human tone and unpredictability
    // ============================================================
    if (promptVersion === 'v3' && request.strength !== 'light' && rawText.trim()) {
      const naturalizer = buildNaturalizerPrompt(rawText, request.tone);
      const pass2Result = await callGeminiApi(
        endpoint,
        naturalizer.systemPrompt,
        naturalizer.userPrompt,
        0.80,
        0.95
      );

      if (pass2Result.trim()) {
        rawText = pass2Result;
      }
    }

    // ============================================================
    // PASS 3: Deterministic post-processing
    // Strip any surviving AI crutch phrases
    // ============================================================
    if (promptVersion === 'v3') {
      rawText = postProcessText(rawText);
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
