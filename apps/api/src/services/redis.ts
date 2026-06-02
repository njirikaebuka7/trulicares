import IORedis, { type Redis, type RedisOptions } from 'ioredis';

/**
 * Serverless-safe Redis connection.
 *
 * Vercel serverless functions are reused across "warm" invocations, so we cache the
 * connection on globalThis to avoid opening a new socket per request (connection storms).
 * If REDIS_URL is missing (or REDIS_DISABLED=true) every helper degrades gracefully:
 * callers must treat a `null` client as "Redis unavailable" and fall back to in-memory.
 */

const REDIS_URL = process.env.REDIS_URL;
const REDIS_DISABLED = process.env.REDIS_DISABLED === 'true';

type GlobalWithRedis = typeof globalThis & {
  __trulicaresRedis?: Redis | null;
};
const g = globalThis as GlobalWithRedis;

function baseOptions(): RedisOptions {
  return {
    // Required by BullMQ; also fine for general use — we never want a request to hang
    // forever waiting on a dead Redis. Commands fail fast and callers fall back.
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    // Cap reconnection backoff so a flapping Redis doesn't spin the event loop.
    retryStrategy: (times: number) => Math.min(times * 200, 3000),
    // Upstash and most managed providers use TLS via the rediss:// scheme; ioredis
    // picks that up automatically. Keep lazy so import never throws.
    lazyConnect: false,
  };
}

/**
 * Returns the shared Redis client, or `null` when Redis is not configured.
 * Never throws — safe to call from any controller.
 */
export function getRedis(): Redis | null {
  if (REDIS_DISABLED || !REDIS_URL) return null;
  if (g.__trulicaresRedis !== undefined) return g.__trulicaresRedis;

  try {
    const client = new IORedis(REDIS_URL, baseOptions());
    client.on('error', (err) => {
      // Don't crash the process on transient Redis errors; just log once-ish.
      console.warn('[redis] connection error:', err.message);
    });
    client.on('connect', () => console.log('[redis] connected'));
    g.__trulicaresRedis = client;
    return client;
  } catch (err: any) {
    console.warn('[redis] failed to initialize, falling back to in-memory:', err.message);
    g.__trulicaresRedis = null;
    return null;
  }
}

export function redisEnabled(): boolean {
  return !REDIS_DISABLED && !!REDIS_URL;
}

/**
 * Creates a *dedicated* connection for BullMQ (queues/workers need their own).
 * Returns null when Redis is not configured so queue setup can no-op.
 */
export function createBullConnection(): Redis | null {
  if (REDIS_DISABLED || !REDIS_URL) return null;
  const conn = new IORedis(REDIS_URL, baseOptions());
  conn.on('error', (err) => console.warn('[redis/bullmq] connection error:', err.message));
  return conn;
}

/** Lightweight health probe used by /api/health. */
export async function redisHealthCheck(): Promise<{ enabled: boolean; ok: boolean; latencyMs?: number }> {
  const client = getRedis();
  if (!client) return { enabled: false, ok: false };
  try {
    const start = Date.now();
    await client.ping();
    return { enabled: true, ok: true, latencyMs: Date.now() - start };
  } catch {
    return { enabled: true, ok: false };
  }
}
