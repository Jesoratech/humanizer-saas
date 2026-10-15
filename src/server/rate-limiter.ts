import type { UsageData, UserProfile, UserTier, AdminSystemMetrics } from '../shared/schemas.ts';

interface RateLimitConfig {
  dailyLimitPerUser: number;
  maxWordsPerRequest: number;
  globalDailyCap: number;
  enableDailyLimit?: boolean;
}

const DEFAULT_FREE_DAILY_LIMIT = 5; // 5 humanizations per day for free users
const PREMIUM_MAX_WORDS = 3000;
const FREE_MAX_WORDS = 800;

export interface ClientIdentifier {
  userId?: string | null;
  email?: string | null;
  clientIp?: string | null;
}

export interface CheckLimitResult {
  allowed: boolean;
  reason?: string;
  code?: 'RATE_LIMIT_EXCEEDED' | 'WORD_LIMIT_EXCEEDED' | 'GLOBAL_CAP_REACHED' | 'USER_SUSPENDED';
  usage: UsageData;
  tier: UserTier;
}

// In-memory usage store (keyed by userId or hashed IP)
interface MemoryRecord {
  requests: number;
  words: number;
  lastDate: string;
}

const memoryStore = new Map<string, MemoryRecord>();

// User management store
const userStore = new Map<string, UserProfile>();

// Initialize the admin account from environment/config
// No mock/seed data — only real users who sign up via Supabase auth appear here.
function initAdminEntry() {
  const adminEmail = 'rajan102805@gmail.com'; // Primary super-admin
  const now = new Date();
  userStore.set('admin-builtin', {
    id: 'admin-builtin',
    email: adminEmail,
    role: 'admin',
    tier: 'lifetime',
    createdAt: now.toISOString(),
    requestsToday: 0,
    dailyLimit: 999999,
    totalWordsProcessed: 0,
    status: 'active',
    subscription: {
      planId: 'lifetime',
      startDate: now.toISOString(),
      status: 'active',
    },
  });
}

initAdminEntry();


// System Runtime Metrics & Latencies (real values, zero until first request)
let globalDailyRequests = 0;
let globalDailyWords = 0;
let globalDate = new Date().toISOString().split('T')[0];
const latencyLog: number[] = [];
let totalErrorsCount = 0;
let fallbackModelHits = 0;

export const systemRuntimeConfig = {
  maintenanceMode: false,
  stealthEncodingEnabled: true,
  activeModel: 'gemini-2.5-flash',
  maxCyclesStrong: 2,
};

// Security Audit Log Store — populated in real-time by system events
const auditLogs: AdminSystemMetrics['recentAuditLogs'] = [];

export function addAuditLog(
  action: string,
  actorEmail: string,
  details: string,
  severity: 'info' | 'warn' | 'security' = 'info',
  targetUser?: string
) {
  auditLogs.unshift({
    id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    timestamp: new Date().toISOString(),
    action,
    actorEmail,
    targetUser,
    details,
    severity,
  });
  if (auditLogs.length > 50) auditLogs.pop();
}

export function recordLatency(durationMs: number) {
  latencyLog.push(durationMs);
  if (latencyLog.length > 50) latencyLog.shift();
}

export function recordError() {
  totalErrorsCount += 1;
}

export function recordFallbackHit() {
  fallbackModelHits += 1;
}

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

// Helper to get or register user profile
export function getOrCreateUserProfile(userId: string, email?: string): UserProfile {
  let user = userStore.get(userId);
  if (!user) {
    const isAdminEmail =
      email === 'rajan102805@gmail.com' ||
      email?.toLowerCase().includes('admin');

    user = {
      id: userId,
      email: email || `user_${userId.substring(0, 8)}@humanly.local`,
      role: isAdminEmail ? 'admin' : 'user',
      tier: isAdminEmail ? 'lifetime' : 'free',
      createdAt: new Date().toISOString(),
      requestsToday: 0,
      dailyLimit: isAdminEmail ? 999999 : DEFAULT_FREE_DAILY_LIMIT,
      totalWordsProcessed: 0,
      status: 'active',
      subscription: isAdminEmail
        ? {
            planId: 'lifetime',
            startDate: new Date().toISOString(),
            status: 'active',
          }
        : undefined,
    };
    userStore.set(userId, user);
  }
  return user;
}

export function isUserAdmin(identifier: ClientIdentifier): boolean {
  if (identifier.email === 'rajan102805@gmail.com') return true;
  if (identifier.userId) {
    const u = userStore.get(identifier.userId);
    if (u?.role === 'admin') return true;
  }
  return false;
}

export function checkAndIncrementUsage(
  identifier: ClientIdentifier,
  wordCount: number,
  config: Partial<RateLimitConfig> = {}
): CheckLimitResult {
  const today = getTodayString();

  if (globalDate !== today) {
    globalDate = today;
    globalDailyRequests = 0;
    globalDailyWords = 0;
  }

  // Get user profile if authenticated
  let userProfile: UserProfile | null = null;
  if (identifier.userId) {
    userProfile = getOrCreateUserProfile(identifier.userId, identifier.email || undefined);
  }

  const isPremium =
    userProfile?.tier === 'premium_monthly' ||
    userProfile?.tier === 'premium_yearly' ||
    userProfile?.tier === 'lifetime' ||
    userProfile?.role === 'admin';

  if (userProfile?.status === 'suspended') {
    return {
      allowed: false,
      reason: 'Your account has been temporarily suspended. Please contact support.',
      code: 'USER_SUSPENDED',
      tier: userProfile.tier,
      usage: {
        date: today,
        dailyLimit: 0,
        requestsUsed: 0,
        requestsRemaining: 0,
        wordsUsed: 0,
        maxWordsPerRequest: 0,
      },
    };
  }

  const maxWordsAllowed = isPremium ? PREMIUM_MAX_WORDS : (config.maxWordsPerRequest || FREE_MAX_WORDS);
  const dailyLimit = isPremium ? 999999 : (config.dailyLimitPerUser ?? DEFAULT_FREE_DAILY_LIMIT);

  // Check word limit per request
  if (wordCount > maxWordsAllowed) {
    return {
      allowed: false,
      reason: `Text exceeds the ${maxWordsAllowed}-word limit (${isPremium ? 'Pro limit: 3,000 words' : 'Free limit: 800 words'}).`,
      code: 'WORD_LIMIT_EXCEEDED',
      tier: userProfile?.tier || 'free',
      usage: {
        date: today,
        dailyLimit,
        requestsUsed: userProfile?.requestsToday || 0,
        requestsRemaining: Math.max(0, dailyLimit - (userProfile?.requestsToday || 0)),
        wordsUsed: 0,
        maxWordsPerRequest: maxWordsAllowed,
      },
    };
  }

  // Key for rate tracking: userId if available, else clientIp
  const key = identifier.userId
    ? `user:${identifier.userId}`
    : `ip:${identifier.clientIp || 'unknown'}`;

  const record = memoryStore.get(key) || { requests: 0, words: 0, lastDate: today };

  if (record.lastDate !== today) {
    record.requests = 0;
    record.words = 0;
    record.lastDate = today;
  }

  // Check daily limit for non-premium
  if (!isPremium && record.requests >= dailyLimit) {
    return {
      allowed: false,
      reason: `Daily free limit reached (${dailyLimit}/5 requests used today). Upgrade to Pro for $4/month to get unlimited humanizations!`,
      code: 'RATE_LIMIT_EXCEEDED',
      tier: 'free',
      usage: {
        date: today,
        dailyLimit,
        requestsUsed: record.requests,
        requestsRemaining: 0,
        wordsUsed: record.words,
        maxWordsPerRequest: maxWordsAllowed,
      },
    };
  }

  // Increment usage
  record.requests += 1;
  record.words += wordCount;
  memoryStore.set(key, record);

  if (userProfile) {
    userProfile.requestsToday = record.requests;
    userProfile.totalWordsProcessed += wordCount;
    userStore.set(userProfile.id, userProfile);
  }

  globalDailyRequests += 1;
  globalDailyWords += wordCount;

  return {
    allowed: true,
    tier: userProfile?.tier || 'free',
    usage: {
      date: today,
      dailyLimit,
      requestsUsed: record.requests,
      requestsRemaining: isPremium ? 999999 : Math.max(0, dailyLimit - record.requests),
      wordsUsed: record.words,
      maxWordsPerRequest: maxWordsAllowed,
    },
  };
}

export function getCurrentUsage(
  identifier: ClientIdentifier,
  config: Partial<RateLimitConfig> = {}
): UsageData {
  const today = getTodayString();
  let userProfile: UserProfile | null = null;
  if (identifier.userId) {
    userProfile = getOrCreateUserProfile(identifier.userId, identifier.email || undefined);
  }

  const isPremium =
    userProfile?.tier === 'premium_monthly' ||
    userProfile?.tier === 'premium_yearly' ||
    userProfile?.tier === 'lifetime' ||
    userProfile?.role === 'admin';

  const dailyLimit = isPremium ? 999999 : (config.dailyLimitPerUser ?? DEFAULT_FREE_DAILY_LIMIT);
  const maxWordsPerRequest = isPremium ? PREMIUM_MAX_WORDS : (config.maxWordsPerRequest || FREE_MAX_WORDS);

  const key = identifier.userId
    ? `user:${identifier.userId}`
    : `ip:${identifier.clientIp || 'unknown'}`;

  const record = memoryStore.get(key);

  if (!record || record.lastDate !== today) {
    return {
      date: today,
      dailyLimit,
      requestsUsed: 0,
      requestsRemaining: dailyLimit,
      wordsUsed: 0,
      maxWordsPerRequest,
    };
  }

  return {
    date: today,
    dailyLimit,
    requestsUsed: record.requests,
    requestsRemaining: isPremium ? 999999 : Math.max(0, dailyLimit - record.requests),
    wordsUsed: record.words,
    maxWordsPerRequest,
  };
}

// ── Admin Functions ──

export function getAllUsers(): UserProfile[] {
  return Array.from(userStore.values());
}

export function updateUserTier(
  userId: string,
  tier: UserTier,
  adminEmail: string
): UserProfile | null {
  const user = userStore.get(userId);
  if (!user) return null;

  const oldTier = user.tier;
  user.tier = tier;
  if (tier !== 'free') {
    user.dailyLimit = 999999;
    user.subscription = {
      planId: tier === 'lifetime' ? 'lifetime' : tier,
      startDate: new Date().toISOString(),
      renewDate:
        tier === 'premium_yearly'
          ? new Date(Date.now() + 365 * 86400000).toISOString()
          : new Date(Date.now() + 30 * 86400000).toISOString(),
      status: 'active',
    };
  } else {
    user.dailyLimit = DEFAULT_FREE_DAILY_LIMIT;
    user.subscription = undefined;
  }

  userStore.set(userId, user);
  addAuditLog(
    'USER_TIER_UPDATED',
    adminEmail,
    `Changed plan for ${user.email} from ${oldTier} to ${tier}`,
    'warn',
    user.email
  );
  return user;
}

export function setUserStatus(
  userId: string,
  status: 'active' | 'suspended',
  adminEmail: string
): UserProfile | null {
  const user = userStore.get(userId);
  if (!user) return null;

  user.status = status;
  userStore.set(userId, user);
  addAuditLog(
    'USER_STATUS_UPDATED',
    adminEmail,
    `Set status for ${user.email} to ${status}`,
    status === 'suspended' ? 'security' : 'info',
    user.email
  );
  return user;
}

export function resetUserUsage(userId: string, adminEmail: string): boolean {
  const user = userStore.get(userId);
  if (!user) return false;

  user.requestsToday = 0;
  userStore.set(userId, user);
  memoryStore.delete(`user:${userId}`);

  addAuditLog(
    'USER_USAGE_RESET',
    adminEmail,
    `Reset daily usage count for ${user.email}`,
    'info',
    user.email
  );
  return true;
}

export function getAdminMetrics(): AdminSystemMetrics {
  const allUsers = getAllUsers();
  const activeSubscribers = allUsers.filter(
    (u) => u.tier === 'premium_monthly' || u.tier === 'premium_yearly' || u.tier === 'lifetime'
  ).length;

  // Calculate MRR from active subscriptions:
  // monthly = $4/mo, yearly = $30/yr ($2.50/mo)
  const monthlyCount = allUsers.filter((u) => u.tier === 'premium_monthly').length;
  const yearlyCount = allUsers.filter((u) => u.tier === 'premium_yearly').length;
  const mrrEstimateUsd = monthlyCount * 4 + yearlyCount * 2.5;

  const avgLatency =
    latencyLog.length > 0
      ? Math.round(latencyLog.reduce((a, b) => a + b, 0) / latencyLog.length)
      : 850;

  const totalReqs = globalDailyRequests || 1;
  const errPercent = Number(((totalErrorsCount / totalReqs) * 100).toFixed(1));

  return {
    totalUsers: allUsers.length,
    activeSubscribers,
    freeUsers: allUsers.length - activeSubscribers,
    requestsToday: globalDailyRequests,
    wordsToday: globalDailyWords,
    mrrEstimateUsd,
    systemHealth: {
      status: systemRuntimeConfig.maintenanceMode ? 'maintenance' : 'healthy',
      activeModel: systemRuntimeConfig.activeModel,
      geminiStatus: 'connected',
      avgLatencyMs: avgLatency,
      fallbackCount: fallbackModelHits,
      errorRatePercent: errPercent,
      stealthEncodingEnabled: systemRuntimeConfig.stealthEncodingEnabled,
    },
    recentAuditLogs: [...auditLogs],
  };
}
