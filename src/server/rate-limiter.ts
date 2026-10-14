import type { UsageData } from '../shared/schemas.ts';

interface RateLimitConfig {
  dailyLimitPerUser: number;
  maxWordsPerRequest: number;
  globalDailyCap: number;
  enableDailyLimit?: boolean;
}

const DEFAULT_CONFIG: RateLimitConfig = {
  dailyLimitPerUser: 999999,
  maxWordsPerRequest: 800,
  globalDailyCap: 999999,
};

// In-memory tracking cache (resets daily or provides fallback if DB table not yet migrated)
interface MemoryRecord {
  requests: number;
  words: number;
  lastDate: string;
}

const memoryStore = new Map<string, MemoryRecord>();
let globalDailyRequests = 0;
let globalDate = new Date().toISOString().split('T')[0];

function getTodayString(): string {
  return new Date().toISOString().split('T')[0];
}

export async function hashIp(ip: string, salt = 'humanly_salt_2026'): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(`${salt}:${ip}`);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('').substring(0, 32);
}

export interface ClientIdentifier {
  userId?: string | null;
  clientIp?: string | null;
}

export interface CheckLimitResult {
  allowed: boolean;
  reason?: string;
  code?: 'RATE_LIMIT_EXCEEDED' | 'WORD_LIMIT_EXCEEDED' | 'GLOBAL_CAP_REACHED';
  usage: UsageData;
}

export function checkAndIncrementUsage(
  identifier: ClientIdentifier,
  wordCount: number,
  config: Partial<RateLimitConfig> = {}
): CheckLimitResult {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const today = getTodayString();

  // Reset global count on new day
  if (globalDate !== today) {
    globalDate = today;
    globalDailyRequests = 0;
  }

  // Check global limit
  if (globalDailyRequests >= cfg.globalDailyCap) {
    return {
      allowed: false,
      reason: 'Global beta capacity reached for today. Please check back tomorrow!',
      code: 'GLOBAL_CAP_REACHED',
      usage: {
        date: today,
        dailyLimit: cfg.dailyLimitPerUser,
        requestsUsed: cfg.dailyLimitPerUser,
        requestsRemaining: 0,
        wordsUsed: 0,
        maxWordsPerRequest: cfg.maxWordsPerRequest,
      },
    };
  }

  // Check word limit per request
  if (wordCount > cfg.maxWordsPerRequest) {
    return {
      allowed: false,
      reason: `Text exceeds the ${cfg.maxWordsPerRequest}-word limit for the free beta.`,
      code: 'WORD_LIMIT_EXCEEDED',
      usage: {
        date: today,
        dailyLimit: cfg.dailyLimitPerUser,
        requestsUsed: 0,
        requestsRemaining: cfg.dailyLimitPerUser,
        wordsUsed: 0,
        maxWordsPerRequest: cfg.maxWordsPerRequest,
      },
    };
  }

  // Key for rate tracking
  const key = identifier.userId
    ? `user:${identifier.userId}`
    : `ip:${identifier.clientIp || 'unknown'}`;

  const record = memoryStore.get(key) || { requests: 0, words: 0, lastDate: today };

  // Reset user record if date changed
  if (record.lastDate !== today) {
    record.requests = 0;
    record.words = 0;
    record.lastDate = today;
  }

  const isDailyLimitEnforced = cfg.enableDailyLimit ?? (cfg.dailyLimitPerUser < 10000);

  if (isDailyLimitEnforced && record.requests >= cfg.dailyLimitPerUser) {
    return {
      allowed: false,
      reason: `Daily limit reached (${cfg.dailyLimitPerUser} requests/day). Resets at midnight UTC.`,
      code: 'RATE_LIMIT_EXCEEDED',
      usage: {
        date: today,
        dailyLimit: cfg.dailyLimitPerUser,
        requestsUsed: record.requests,
        requestsRemaining: 0,
        wordsUsed: record.words,
        maxWordsPerRequest: cfg.maxWordsPerRequest,
      },
    };
  }

  // Increment usage
  record.requests += 1;
  record.words += wordCount;
  memoryStore.set(key, record);
  globalDailyRequests += 1;

  return {
    allowed: true,
    usage: {
      date: today,
      dailyLimit: isDailyLimitEnforced ? cfg.dailyLimitPerUser : 999999,
      requestsUsed: record.requests,
      requestsRemaining: isDailyLimitEnforced ? Math.max(0, cfg.dailyLimitPerUser - record.requests) : 999999,
      wordsUsed: record.words,
      maxWordsPerRequest: cfg.maxWordsPerRequest,
    },
  };
}

export function getCurrentUsage(
  identifier: ClientIdentifier,
  config: Partial<RateLimitConfig> = {}
): UsageData {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const today = getTodayString();
  const isDailyLimitEnforced = cfg.enableDailyLimit ?? (cfg.dailyLimitPerUser < 10000);

  const key = identifier.userId
    ? `user:${identifier.userId}`
    : `ip:${identifier.clientIp || 'unknown'}`;

  const record = memoryStore.get(key);

  if (!record || record.lastDate !== today) {
    return {
      date: today,
      dailyLimit: isDailyLimitEnforced ? cfg.dailyLimitPerUser : 999999,
      requestsUsed: 0,
      requestsRemaining: isDailyLimitEnforced ? cfg.dailyLimitPerUser : 999999,
      wordsUsed: 0,
      maxWordsPerRequest: cfg.maxWordsPerRequest,
    };
  }

  return {
    date: today,
    dailyLimit: isDailyLimitEnforced ? cfg.dailyLimitPerUser : 999999,
    requestsUsed: record.requests,
    requestsRemaining: isDailyLimitEnforced ? Math.max(0, cfg.dailyLimitPerUser - record.requests) : 999999,
    wordsUsed: record.words,
    maxWordsPerRequest: cfg.maxWordsPerRequest,
  };
}
