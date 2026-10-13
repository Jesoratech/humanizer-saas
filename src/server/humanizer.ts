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
    const err = new Error(errorMessage) as Error & { status?: number };
    err.status = response.status;
    throw err;
  }

  const data = (await response.json()) as GeminiResponse;
  return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
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
    // Primary inference attempt
    rawText = await callGeminiApi(
      endpoint,
      promptConfig.systemPrompt,
      promptConfig.userPrompt,
      promptConfig.temperature,
      promptConfig.topP
    );

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
