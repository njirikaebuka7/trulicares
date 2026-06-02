import { getRedis } from './redis.js';

/**
 * Two-tier cache.
 *
 *  • When Redis is configured it is the source of truth (shared across all serverless
 *    instances + the worker), via the async helpers `cacheGet` / `cacheSet` / `cacheDel`.
 *  • The legacy synchronous helpers (`getCached` / `setCached` / `invalidateCache`) are
 *    kept for existing call sites and back an in-process Map. They continue to work
 *    unchanged on a single instance.
 *
 * New code should prefer the async, Redis-backed helpers below.
 */

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

const cacheMap = new Map<string, CacheEntry<any>>();

// ─────────────────────────────────────────────────────────────
// Legacy synchronous in-memory API (unchanged signatures)
// ─────────────────────────────────────────────────────────────
export function getCached<T>(key: string): T | null {
  const entry = cacheMap.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cacheMap.delete(key);
    return null;
  }
  return entry.value;
}

export function setCached<T>(key: string, value: T, ttlSeconds: number = 60): void {
  cacheMap.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
}

export function invalidateCache(pattern: string | RegExp): void {
  const before = cacheMap.size;
  for (const key of cacheMap.keys()) {
    const isMatch =
      typeof pattern === 'string' ? key.startsWith(pattern) || key.includes(pattern) : pattern.test(key);
    if (isMatch) cacheMap.delete(key);
  }
  const deleted = before - cacheMap.size;
  if (deleted > 0) console.log(`Cache Invalidation: Purged ${deleted} key(s) matching [${pattern}]`);
  // Also clear matching Redis keys (best-effort) when a string prefix is used.
  if (typeof pattern === 'string') void cacheDelByPrefix(pattern);
}

// ─────────────────────────────────────────────────────────────
// Redis-backed async API (preferred)
// ─────────────────────────────────────────────────────────────
const PREFIX = `${process.env.QUEUE_PREFIX || 'trulicares'}:cache:`;

export async function cacheGet<T>(key: string): Promise<T | null> {
  const redis = getRedis();
  if (!redis) return getCached<T>(key);
  try {
    const raw = await redis.get(PREFIX + key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return getCached<T>(key);
  }
}

export async function cacheSet<T>(key: string, value: T, ttlSeconds = 60): Promise<void> {
  const redis = getRedis();
  setCached(key, value, ttlSeconds); // keep local copy as a fast L1 + fallback
  if (!redis) return;
  try {
    await redis.set(PREFIX + key, JSON.stringify(value), 'EX', ttlSeconds);
  } catch {
    /* fall back to in-memory only */
  }
}

export async function cacheDel(key: string): Promise<void> {
  cacheMap.delete(key);
  const redis = getRedis();
  if (!redis) return;
  try {
    await redis.del(PREFIX + key);
  } catch {
    /* ignore */
  }
}

/** Deletes all Redis keys under a logical prefix (uses SCAN to stay non-blocking). */
export async function cacheDelByPrefix(prefix: string): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  try {
    const match = `${PREFIX}${prefix}*`;
    let cursor = '0';
    do {
      const [next, keys] = await redis.scan(cursor, 'MATCH', match, 'COUNT', 200);
      cursor = next;
      if (keys.length) await redis.del(...keys);
    } while (cursor !== '0');
  } catch {
    /* ignore */
  }
}

/**
 * Cache-aside helper: returns the cached value or computes, stores, and returns it.
 */
export async function cacheAside<T>(key: string, ttlSeconds: number, compute: () => Promise<T>): Promise<T> {
  const hit = await cacheGet<T>(key);
  if (hit !== null) return hit;
  const value = await compute();
  await cacheSet(key, value, ttlSeconds);
  return value;
}
