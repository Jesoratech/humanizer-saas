import { humanizeRequestSchema, countWords } from '../../../src/shared/schemas';
import { executeHumanize } from '../../../src/server/humanizer';
import { hashIp, checkAndIncrementUsage } from '../../../src/server/rate-limiter';

interface Env {
  GEMINI_API_KEY?: string;
  GEMINI_MODEL?: string;
  MODEL_REQUESTS_ENABLED?: string;
  MAX_WORDS_PER_REQUEST?: string;
  BETA_DAILY_REQUESTS_PER_USER?: string;
  GLOBAL_DAILY_REQUEST_CAP?: string;
}

export const onRequestPost = async (context: {
  request: Request;
  env: Env;
}) => {
  const { request, env } = context;

  // Kill switch check
  if (env.MODEL_REQUESTS_ENABLED === 'false') {
    return new Response(
      JSON.stringify({
        error: 'The AI writing service is temporarily paused for maintenance.',
        code: 'SERVICE_PAUSED',
      }),
      {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  const apiKey = env.GEMINI_API_KEY;
  if (!apiKey) {
    return new Response(
      JSON.stringify({
        error: 'AI service API key is not configured on the server.',
        code: 'CONFIG_ERROR',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  // Parse and validate request
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return new Response(
      JSON.stringify({
        error: 'Invalid JSON payload.',
        code: 'BAD_REQUEST',
      }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  const parsed = humanizeRequestSchema.safeParse(body);
  if (!parsed.success) {
    const errorDetails = parsed.error.errors.map((e: { message: string }) => e.message).join(', ');
    return new Response(
      JSON.stringify({
        error: `Validation error: ${errorDetails}`,
        code: 'VALIDATION_ERROR',
      }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  const humanizeReq = parsed.data;
  const wordCount = countWords(humanizeReq.text);

  // Identify client
  const authHeader = request.headers.get('Authorization');
  let userId: string | null = null;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    // In production with Supabase, extract user or subject from JWT
    try {
      const token = authHeader.substring(7);
      const parts = token.split('.');
      if (parts.length === 3) {
        const payload = JSON.parse(atob(parts[1]));
        userId = payload.sub || null;
      }
    } catch {
      // Non-fatal if JWT unparsable
    }
  }

  const clientIp =
    request.headers.get('CF-Connecting-IP') ||
    request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    '127.0.0.1';

  const hashedIp = await hashIp(clientIp);

  // Check rate limit & quotas
  const rateLimitCheck = checkAndIncrementUsage(
    { userId, clientIp: hashedIp },
    wordCount,
    {
      dailyLimitPerUser: Number(env.BETA_DAILY_REQUESTS_PER_USER) || 3,
      maxWordsPerRequest: Number(env.MAX_WORDS_PER_REQUEST) || 800,
      globalDailyCap: Number(env.GLOBAL_DAILY_REQUEST_CAP) || 500,
    }
  );

  if (!rateLimitCheck.allowed) {
    const statusCode = rateLimitCheck.code === 'RATE_LIMIT_EXCEEDED' ? 429 : 400;
    return new Response(
      JSON.stringify({
        error: rateLimitCheck.reason,
        code: rateLimitCheck.code,
      }),
      {
        status: statusCode,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  // Execute humanize request
  try {
    const result = await executeHumanize(humanizeReq, {
      apiKey,
      model: env.GEMINI_MODEL || 'gemini-3.5-flash-lite',
    });

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown rewrite error';
    return new Response(
      JSON.stringify({
        error: message,
        code: 'GENERATION_FAILED',
      }),
      {
        status: 502,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
