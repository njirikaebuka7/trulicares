import { Request, Response, NextFunction } from 'express';
import { getRedis } from '../services/redis.js';

interface ClientRequestRecord {
  count: number;
  resetAt: number;
}

const ipRequestsMap = new Map<string, ClientRequestRecord>();

function resolveIp(req: Request): string {
  const rawIp = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
  return Array.isArray(rawIp) ? rawIp[0] : (rawIp as string);
}

export interface RateLimitOptions {
  /** Logical bucket name so different routes don't share counters. */
  prefix?: string;
  /** Build the rate-limit key from the request (default: client IP). */
  keyBy?: (req: Request) => string;
}

/**
 * Distributed rate limiter.
 *
 * Uses Redis (atomic INCR + PEXPIRE) when configured so the limit holds across every
 * serverless instance; otherwise falls back to a per-instance in-memory Map. Backwards
 * compatible with the original positional signature `rateLimiter(limit, windowMs)`.
 */
export function rateLimiter(
  limit: number = 100,
  windowMs: number = 15 * 60 * 1000,
  options: RateLimitOptions = {}
) {
  const prefix = options.prefix || 'global';
  const keyBy = options.keyBy || resolveIp;
  const redisKeyPrefix = `${process.env.QUEUE_PREFIX || 'trulicares'}:rl:${prefix}:`;

  return async (req: Request, res: Response, next: NextFunction) => {
    const id = keyBy(req);
    const redis = getRedis();

    // ── Distributed path ──────────────────────────────────────
    if (redis) {
      try {
        const key = redisKeyPrefix + id;
        const count = await redis.incr(key);
        if (count === 1) await redis.pexpire(key, windowMs);
        if (count > limit) {
          const ttl = await redis.pttl(key);
          if (ttl > 0) res.setHeader('Retry-After', Math.ceil(ttl / 1000).toString());
          return res.status(429).json({ error: 'Too many requests. Please try again later.' });
        }
        return next();
      } catch {
        // fall through to in-memory on Redis hiccup
      }
    }

    // ── In-memory fallback ────────────────────────────────────
    const mapKey = `${prefix}:${id}`;
    const now = Date.now();
    const record = ipRequestsMap.get(mapKey);
    if (!record || now > record.resetAt) {
      ipRequestsMap.set(mapKey, { count: 1, resetAt: now + windowMs });
      return next();
    }
    record.count++;
    if (record.count > limit) {
      console.warn(`[Rate Limit] ${prefix} | ${id} | ${req.path} | ${record.count}`);
      return res.status(429).json({ error: 'Too many requests. Please try again later.' });
    }
    next();
  };
}

// ── Keying helpers ───────────────────────────────────────────
/** Key by IP + the email in the request body (good for login/forgot-password/OTP). */
export const byIpAndEmail = (req: Request): string => {
  const email = (req.body?.email || '').toString().toLowerCase().trim();
  return `${resolveIp(req)}|${email || 'noemail'}`;
};

/** Key by authenticated user id when present, else IP (good for uploads). */
export const byUserOrIp = (req: Request): string => {
  const userId = (req as any).user?.id;
  return userId ? `u:${userId}` : resolveIp(req);
};

// ── Preset limiters for sensitive endpoints ──────────────────
export const loginLimiter = rateLimiter(5, 15 * 60 * 1000, { prefix: 'login', keyBy: byIpAndEmail });
export const registerLimiter = rateLimiter(5, 60 * 60 * 1000, { prefix: 'register' });
export const forgotPasswordLimiter = rateLimiter(3, 60 * 60 * 1000, { prefix: 'forgot', keyBy: byIpAndEmail });
export const otpLimiter = rateLimiter(5, 15 * 60 * 1000, { prefix: 'otp', keyBy: byIpAndEmail });
export const uploadLimiter = rateLimiter(10, 10 * 60 * 1000, { prefix: 'upload', keyBy: byUserOrIp });
export const searchLimiter = rateLimiter(60, 60 * 1000, { prefix: 'search' });
// General write/mutation limiter, keyed per authenticated user (falls back to IP).
export const writeLimiter = rateLimiter(40, 60 * 1000, { prefix: 'write', keyBy: byUserOrIp });

// Automatically prune expired in-memory IPs to prevent memory leaks (fallback path only)
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of ipRequestsMap.entries()) {
    if (now > record.resetAt) ipRequestsMap.delete(key);
  }
}, 10 * 60 * 1000);
