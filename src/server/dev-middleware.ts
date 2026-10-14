import type { Plugin, ViteDevServer } from 'vite';
import { loadEnv } from 'vite';
import { humanizeRequestSchema, feedbackSchema, countWords } from '../shared/schemas.ts';
import { executeHumanize } from './humanizer.ts';
import { hashIp, checkAndIncrementUsage, getCurrentUsage } from './rate-limiter.ts';
import type { IncomingMessage, ServerResponse } from 'http';

function parseJsonBody(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > 1e6) {
        // 1MB max body limit
        req.destroy();
        reject(new Error('Payload too large'));
      }
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (e) {
        reject(e);
      }
    });
    req.on('error', reject);
  });
}

function sendJson(res: ServerResponse, status: number, data: unknown) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(data));
}

export function devApiPlugin(): Plugin {
  return {
    name: 'dev-api-middleware',
    configureServer(server: ViteDevServer) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url?.split('?')[0];

        if (!url || !url.startsWith('/api/')) {
          return next();
        }

        // Load env for dev
        const env = loadEnv(server.config.mode, process.cwd(), '');
        const apiKey = env.GEMINI_API_KEY || process.env.GEMINI_API_KEY;
        const model = env.GEMINI_MODEL || process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite';
        const modelEnabled = env.MODEL_REQUESTS_ENABLED !== 'false';

        // 1. Health check
        if (url === '/api/health' && req.method === 'GET') {
          return sendJson(res, 200, {
            status: 'healthy',
            modelEnabled,
            timestamp: new Date().toISOString(),
            version: '1.0.0-beta (dev)',
          });
        }

        // 2. Usage endpoint
        if (url === '/api/v1/usage' && req.method === 'GET') {
          const authHeader = req.headers['authorization'];
          let userId: string | null = null;
          if (authHeader && authHeader.startsWith('Bearer ')) {
            try {
              const token = authHeader.substring(7);
              const parts = token.split('.');
              if (parts.length === 3) {
                const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
                userId = payload.sub || null;
              }
            } catch {
              // Ignore
            }
          }

          const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';
          const hashedIp = await hashIp(clientIp);

          const dailyLimitDisabled =
            env.ENABLE_DAILY_LIMIT === 'false' ||
            !env.BETA_DAILY_REQUESTS_PER_USER ||
            env.BETA_DAILY_REQUESTS_PER_USER === '0' ||
            env.BETA_DAILY_REQUESTS_PER_USER === 'unlimited';
          const dailyLimitPerUser = dailyLimitDisabled
            ? 999999
            : Number(env.BETA_DAILY_REQUESTS_PER_USER) || 999999;

          const usage = getCurrentUsage(
            { userId, clientIp: hashedIp },
            {
              enableDailyLimit: !dailyLimitDisabled,
              dailyLimitPerUser,
              maxWordsPerRequest: Number(env.MAX_WORDS_PER_REQUEST) || 800,
            }
          );
          return sendJson(res, 200, usage);
        }

        // 3. Feedback endpoint
        if (url === '/api/v1/feedback' && req.method === 'POST') {
          try {
            const body = await parseJsonBody(req);
            const parsed = feedbackSchema.safeParse(body);
            if (!parsed.success) {
              const errorDetails = parsed.error.errors.map((e) => e.message).join(', ');
              return sendJson(res, 400, {
                error: `Validation error: ${errorDetails}`,
                code: 'VALIDATION_ERROR',
              });
            }
            return sendJson(res, 200, { success: true, message: 'Thank you for your feedback!' });
          } catch {
            return sendJson(res, 400, { error: 'Invalid JSON', code: 'BAD_REQUEST' });
          }
        }

        // 4. Humanize endpoint
        if (url === '/api/v1/humanize' && req.method === 'POST') {
          if (!modelEnabled) {
            return sendJson(res, 503, {
              error: 'AI service is currently paused for maintenance.',
              code: 'SERVICE_PAUSED',
            });
          }

          if (!apiKey) {
            return sendJson(res, 500, {
              error: 'GEMINI_API_KEY is missing from environment. Please add it to .env.local.',
              code: 'CONFIG_ERROR',
            });
          }

          let body: unknown;
          try {
            body = await parseJsonBody(req);
          } catch {
            return sendJson(res, 400, { error: 'Invalid request JSON payload.', code: 'BAD_REQUEST' });
          }

          const parsed = humanizeRequestSchema.safeParse(body);
          if (!parsed.success) {
            const errorDetails = parsed.error.errors.map((e: { message: string }) => e.message).join(', ');
            return sendJson(res, 400, {
              error: `Validation error: ${errorDetails}`,
              code: 'VALIDATION_ERROR',
            });
          }

          const humanizeReq = parsed.data;
          const wordCount = countWords(humanizeReq.text);

          const authHeader = req.headers['authorization'];
          let userId: string | null = null;
          if (authHeader && authHeader.startsWith('Bearer ')) {
            try {
              const token = authHeader.substring(7);
              const parts = token.split('.');
              if (parts.length === 3) {
                const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
                userId = payload.sub || null;
              }
            } catch {
              // Ignore
            }
          }

          const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';
          const hashedIp = await hashIp(clientIp);

          const dailyLimitDisabled =
            env.ENABLE_DAILY_LIMIT === 'false' ||
            !env.BETA_DAILY_REQUESTS_PER_USER ||
            env.BETA_DAILY_REQUESTS_PER_USER === '0' ||
            env.BETA_DAILY_REQUESTS_PER_USER === 'unlimited';
          const dailyLimitPerUser = dailyLimitDisabled
            ? 999999
            : Number(env.BETA_DAILY_REQUESTS_PER_USER) || 999999;
          const globalDailyCap = dailyLimitDisabled
            ? 999999
            : Number(env.GLOBAL_DAILY_REQUEST_CAP) || 999999;

          const limitCheck = checkAndIncrementUsage(
            { userId, clientIp: hashedIp },
            wordCount,
            {
              enableDailyLimit: !dailyLimitDisabled,
              dailyLimitPerUser,
              maxWordsPerRequest: Number(env.MAX_WORDS_PER_REQUEST) || 800,
              globalDailyCap,
            }
          );

          if (!limitCheck.allowed) {
            const status = limitCheck.code === 'RATE_LIMIT_EXCEEDED' ? 429 : 400;
            return sendJson(res, status, {
              error: limitCheck.reason,
              code: limitCheck.code,
            });
          }

          try {
            const result = await executeHumanize(humanizeReq, {
              apiKey,
              model,
            });
            return sendJson(res, 200, result);
          } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Rewrite failed';
            return sendJson(res, 502, {
              error: message,
              code: 'GENERATION_FAILED',
            });
          }
        }

        // Unknown API route
        return sendJson(res, 404, { error: 'API endpoint not found', code: 'NOT_FOUND' });
      });
    },
  };
}
