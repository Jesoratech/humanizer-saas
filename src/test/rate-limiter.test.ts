import { describe, it, expect } from 'vitest';
import {
  hashIp,
  checkAndIncrementUsage,
  getCurrentUsage,
} from '../server/rate-limiter.ts';

describe('Rate Limiter & Quota System', () => {
  it('generates consistent and non-reversible SHA-256 IP hashes', async () => {
    const hash1 = await hashIp('192.168.1.1');
    const hash2 = await hashIp('192.168.1.1');
    const hashOther = await hashIp('192.168.1.2');

    expect(hash1).toBe(hash2);
    expect(hash1).not.toBe(hashOther);
    expect(hash1.length).toBe(32);
  });

  it('enforces word limits per request', () => {
    const result = checkAndIncrementUsage(
      { userId: 'test_user_word_limit' },
      900,
      { maxWordsPerRequest: 800 }
    );

    expect(result.allowed).toBe(false);
    expect(result.code).toBe('WORD_LIMIT_EXCEEDED');
  });

  it('tracks daily request quota and blocks when limit is exceeded', () => {
    const id = { userId: `test_user_${Date.now()}` };

    // Request 1
    const r1 = checkAndIncrementUsage(id, 100, { dailyLimitPerUser: 2 });
    expect(r1.allowed).toBe(true);
    expect(r1.usage.requestsUsed).toBe(1);
    expect(r1.usage.requestsRemaining).toBe(1);

    // Request 2
    const r2 = checkAndIncrementUsage(id, 150, { dailyLimitPerUser: 2 });
    expect(r2.allowed).toBe(true);
    expect(r2.usage.requestsUsed).toBe(2);
    expect(r2.usage.requestsRemaining).toBe(0);

    // Request 3 (should be blocked)
    const r3 = checkAndIncrementUsage(id, 50, { dailyLimitPerUser: 2 });
    expect(r3.allowed).toBe(false);
    expect(r3.code).toBe('RATE_LIMIT_EXCEEDED');

    // Current usage reflects limit state
    const current = getCurrentUsage(id, { dailyLimitPerUser: 2 });
    expect(current.requestsUsed).toBe(2);
    expect(current.requestsRemaining).toBe(0);
  });
});
