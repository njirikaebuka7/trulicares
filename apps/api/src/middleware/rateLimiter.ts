import { Request, Response, NextFunction } from 'express';

interface ClientRequestRecord {
  count: number;
  resetAt: number;
}

const ipRequestsMap = new Map<string, ClientRequestRecord>();

/**
 * Performant, in-memory API Rate Limiter middleware.
 * Backed by a clean JS Map to keep operations fast and zero-cost on free-tier deployments.
 * 
 * @param limit - Maximum requests allowed per IP inside the window
 * @param windowMs - Timeframe window in milliseconds
 */
export function rateLimiter(limit: number = 100, windowMs: number = 15 * 60 * 1000) {
  return (req: Request, res: Response, next: NextFunction) => {
    // Resolve IP address from standard proxies or direct sockets
    const rawIp = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
    const ip = Array.isArray(rawIp) ? rawIp[0] : (rawIp as string);

    const now = Date.now();
    const record = ipRequestsMap.get(ip);

    // If client is new or window has expired, reset/initialize record
    if (!record || now > record.resetAt) {
      ipRequestsMap.set(ip, {
        count: 1,
        resetAt: now + windowMs
      });
      return next();
    }

    // Increment request count
    record.count++;

    // Deny request if limit is breached
    if (record.count > limit) {
      console.warn(`[Rate Limit Exceeded] IP: ${ip} | Path: ${req.path} | Count: ${record.count}`);
      return res.status(429).json({
        error: 'Too many requests. Please try again later.'
      });
    }

    next();
  };
}

// Automatically prune expired IPs periodically to prevent memory leaks
setInterval(() => {
  const now = Date.now();
  for (const [ip, record] of ipRequestsMap.entries()) {
    if (now > record.resetAt) {
      ipRequestsMap.delete(ip);
    }
  }
}, 10 * 60 * 1000); // Run garbage collection every 10 minutes
