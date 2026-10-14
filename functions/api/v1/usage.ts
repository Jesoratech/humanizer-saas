import { hashIp, getCurrentUsage } from '../../../src/server/rate-limiter';

interface Env {
  MAX_WORDS_PER_REQUEST?: string;
  BETA_DAILY_REQUESTS_PER_USER?: string;
}

export const onRequestGet = async (context: {
  request: Request;
  env: Env;
}) => {
  const { request, env } = context;

  const authHeader = request.headers.get('Authorization');
  let userId: string | null = null;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const token = authHeader.substring(7);
      const parts = token.split('.');
      if (parts.length === 3) {
        const payload = JSON.parse(atob(parts[1]));
        userId = payload.sub || null;
      }
    } catch {
      // Ignored
    }
  }

  const clientIp =
    request.headers.get('CF-Connecting-IP') ||
    request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    '127.0.0.1';

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

  return new Response(JSON.stringify(usage), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
    },
  });
};
