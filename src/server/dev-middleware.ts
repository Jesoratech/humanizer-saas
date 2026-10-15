import type { Plugin, ViteDevServer } from 'vite';
import { loadEnv } from 'vite';
import { humanizeRequestSchema, feedbackSchema, countWords } from '../shared/schemas.ts';
import { executeHumanize } from './humanizer.ts';
import {
  hashIp,
  checkAndIncrementUsage,
  getCurrentUsage,
  getOrCreateUserProfile,
  isUserAdmin,
  getAllUsers,
  updateUserTier,
  setUserStatus,
  resetUserUsage,
  getAdminMetrics,
  systemRuntimeConfig,
  recordLatency,
  recordError,
  addAuditLog,
} from './rate-limiter.ts';
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

function extractAuth(req: IncomingMessage): { userId: string | null; userEmail: string | null; isAdmin: boolean } {
  let userId: string | null = (req.headers['x-user-id'] as string) || null;
  let userEmail: string | null = (req.headers['x-user-email'] as string) || null;

  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const token = authHeader.substring(7);
      const parts = token.split('.');
      if (parts.length === 3) {
        const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
        if (payload.sub) userId = payload.sub;
        if (payload.email) userEmail = payload.email;
      }
    } catch {
      // Ignore invalid JWT tokens
    }
  }

  const adminHeader = req.headers['x-admin-key'];
  const isAdmin =
    adminHeader === 'humanly-super-admin' ||
    userEmail === 'rajan102805@gmail.com' ||
    isUserAdmin({ userId, email: userEmail });

  return { userId, userEmail, isAdmin };
}

export function devApiPlugin(): Plugin {
  return {
    name: 'dev-api-middleware',
    configureServer(server: ViteDevServer) {
      server.middlewares.use(async (req, res, next) => {
        const fullUrl = req.url || '';
        const url = fullUrl.split('?')[0];

        if (!url || !url.startsWith('/api/')) {
          return next();
        }

        // Load env for dev
        const env = loadEnv(server.config.mode, process.cwd(), '');
        const apiKey = env.GEMINI_API_KEY || process.env.GEMINI_API_KEY;
        const defaultModel =
          systemRuntimeConfig.activeModel ||
          env.GEMINI_MODEL ||
          process.env.GEMINI_MODEL ||
          'gemini-2.5-flash';
        const modelEnabled = env.MODEL_REQUESTS_ENABLED !== 'false';

        const { userId, userEmail, isAdmin } = extractAuth(req);
        const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';
        const hashedIp = await hashIp(clientIp);

        // 1. Health check
        if (url === '/api/health' && req.method === 'GET') {
          return sendJson(res, 200, {
            status: systemRuntimeConfig.maintenanceMode ? 'maintenance' : 'healthy',
            modelEnabled: modelEnabled && !systemRuntimeConfig.maintenanceMode,
            activeModel: defaultModel,
            timestamp: new Date().toISOString(),
            version: '2.0.0-pro (dev)',
          });
        }

        // 2. User Profile & Subscription endpoint
        if (url === '/api/v1/user/profile' && req.method === 'GET') {
          const effectiveId = userId || `anon_${hashedIp.substring(0, 8)}`;
          const profile = getOrCreateUserProfile(effectiveId, userEmail || undefined);
          const usage = getCurrentUsage({ userId: effectiveId, email: userEmail, clientIp: hashedIp });
          return sendJson(res, 200, { profile, usage });
        }

        // 3. User Upgrade / Subscription endpoint ($4/mo or $30/yr)
        if (url === '/api/v1/subscribe' && req.method === 'POST') {
          try {
            const body = (await parseJsonBody(req)) as { planId?: 'premium_monthly' | 'premium_yearly' };
            const planId = body?.planId || 'premium_monthly';
            const effectiveId = userId || `anon_${hashedIp.substring(0, 8)}`;
            const updated = updateUserTier(effectiveId, planId, userEmail || 'user-self-checkout');
            if (updated) {
              addAuditLog(
                'SUBSCRIPTION_PURCHASED',
                updated.email,
                `Subscribed to ${planId === 'premium_yearly' ? 'Pro Annual ($30/yr)' : 'Pro Monthly ($4/mo)'}`,
                'info',
                updated.email
              );
              return sendJson(res, 200, {
                success: true,
                message: `Successfully upgraded to ${planId === 'premium_yearly' ? 'Pro Annual' : 'Pro Monthly'}!`,
                profile: updated,
              });
            }
            return sendJson(res, 400, { error: 'Unable to process subscription update', code: 'UPGRADE_FAILED' });
          } catch {
            return sendJson(res, 400, { error: 'Invalid JSON payload', code: 'BAD_REQUEST' });
          }
        }

        // 4. Usage endpoint
        if (url === '/api/v1/usage' && req.method === 'GET') {
          const effectiveId = userId || `anon_${hashedIp.substring(0, 8)}`;
          const usage = getCurrentUsage(
            { userId: effectiveId, email: userEmail, clientIp: hashedIp },
            {
              maxWordsPerRequest: Number(env.MAX_WORDS_PER_REQUEST) || 800,
            }
          );
          return sendJson(res, 200, usage);
        }

        // 5. Feedback endpoint
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

        // ==========================================
        // ADMIN ENDPOINTS (Protected with RBAC)
        // ==========================================

        if (url.startsWith('/api/admin/')) {
          if (!isAdmin) {
            addAuditLog(
              'UNAUTHORIZED_ADMIN_ACCESS_ATTEMPT',
              userEmail || `ip:${clientIp}`,
              `Blocked unauthorized access to ${url}`,
              'security'
            );
            return sendJson(res, 403, {
              error: 'Access denied: Administrator privileges required.',
              code: 'FORBIDDEN',
            });
          }

          // Admin: Metrics overview
          if (url === '/api/admin/metrics' && req.method === 'GET') {
            const metrics = getAdminMetrics();
            return sendJson(res, 200, metrics);
          }

          // Admin: Users list
          if (url === '/api/admin/users' && req.method === 'GET') {
            const users = getAllUsers();
            return sendJson(res, 200, { users });
          }

          // Admin: Update user plan tier
          const planMatch = url.match(/^\/api\/admin\/users\/([^/]+)\/plan$/);
          if (planMatch && req.method === 'POST') {
            const targetUserId = decodeURIComponent(planMatch[1]);
            const body = (await parseJsonBody(req)) as { tier?: string };
            if (!body?.tier) {
              return sendJson(res, 400, { error: 'Missing tier parameter', code: 'BAD_REQUEST' });
            }
            const updated = updateUserTier(
              targetUserId,
              body.tier as any,
              userEmail || 'admin'
            );
            if (!updated) {
              return sendJson(res, 404, { error: 'User not found', code: 'NOT_FOUND' });
            }
            return sendJson(res, 200, { success: true, user: updated });
          }

          // Admin: Update user status (suspend / activate)
          const statusMatch = url.match(/^\/api\/admin\/users\/([^/]+)\/status$/);
          if (statusMatch && req.method === 'POST') {
            const targetUserId = decodeURIComponent(statusMatch[1]);
            const body = (await parseJsonBody(req)) as { status?: 'active' | 'suspended' };
            if (!body?.status) {
              return sendJson(res, 400, { error: 'Missing status parameter', code: 'BAD_REQUEST' });
            }
            const updated = setUserStatus(targetUserId, body.status, userEmail || 'admin');
            if (!updated) {
              return sendJson(res, 404, { error: 'User not found', code: 'NOT_FOUND' });
            }
            return sendJson(res, 200, { success: true, user: updated });
          }

          // Admin: Reset user daily usage count
          const resetMatch = url.match(/^\/api\/admin\/users\/([^/]+)\/reset$/);
          if (resetMatch && req.method === 'POST') {
            const targetUserId = decodeURIComponent(resetMatch[1]);
            const ok = resetUserUsage(targetUserId, userEmail || 'admin');
            if (!ok) {
              return sendJson(res, 404, { error: 'User not found', code: 'NOT_FOUND' });
            }
            return sendJson(res, 200, { success: true, message: 'Daily limit reset' });
          }

          // Admin: System settings update
          if (url === '/api/admin/system' && req.method === 'POST') {
            const body = (await parseJsonBody(req)) as {
              maintenanceMode?: boolean;
              activeModel?: string;
              stealthEncodingEnabled?: boolean;
            };
            if (body.maintenanceMode !== undefined) {
              systemRuntimeConfig.maintenanceMode = Boolean(body.maintenanceMode);
            }
            if (body.activeModel) {
              systemRuntimeConfig.activeModel = body.activeModel;
            }
            if (body.stealthEncodingEnabled !== undefined) {
              systemRuntimeConfig.stealthEncodingEnabled = Boolean(body.stealthEncodingEnabled);
            }
            addAuditLog(
              'SYSTEM_SETTINGS_CHANGED',
              userEmail || 'admin',
              `Updated runtime settings: model=${systemRuntimeConfig.activeModel}, maintenance=${systemRuntimeConfig.maintenanceMode}, stealth=${systemRuntimeConfig.stealthEncodingEnabled}`,
              'warn'
            );
            return sendJson(res, 200, { success: true, config: systemRuntimeConfig });
          }
        }

        // ==========================================
        // 6. Humanize endpoint (Core AI pipeline)
        // ==========================================
        if (url === '/api/v1/humanize' && req.method === 'POST') {
          if (!modelEnabled || systemRuntimeConfig.maintenanceMode) {
            return sendJson(res, 503, {
              error: 'AI service is currently paused for maintenance. Please check back shortly.',
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

          const effectiveId = userId || `anon_${hashedIp.substring(0, 8)}`;
          const limitCheck = checkAndIncrementUsage(
            { userId: effectiveId, email: userEmail, clientIp: hashedIp },
            wordCount
          );

          if (!limitCheck.allowed) {
            const status = limitCheck.code === 'RATE_LIMIT_EXCEEDED' ? 429 : 403;
            return sendJson(res, status, {
              error: limitCheck.reason,
              code: limitCheck.code,
              tier: limitCheck.tier,
              dailyLimit: limitCheck.usage.dailyLimit,
              requestsUsed: limitCheck.usage.requestsUsed,
            });
          }

          const startTime = Date.now();
          try {
            const result = await executeHumanize(humanizeReq, {
              apiKey,
              model: defaultModel,
            });
            recordLatency(Date.now() - startTime);
            return sendJson(res, 200, result);
          } catch (err: unknown) {
            recordError();
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
