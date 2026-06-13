import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { query } from '../db.js';

// SECURITY: never ship a hardcoded fallback secret to production. A known fallback lets
// anyone forge tokens. In production we require a real JWT_SECRET (and reject the
// placeholder from .env.example); in dev we allow an insecure fallback with a warning.
function resolveSecret(): string {
  const s = process.env.JWT_SECRET;
  if (s && s !== 'your_super_secret_jwt_key_here') return s;
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET is not set (or is the placeholder) — refusing to start in production.');
  }
  console.warn('[auth] JWT_SECRET not set — using an INSECURE dev fallback. Set JWT_SECRET for production.');
  return 'trulicares-dev-secret-please-change';
}

export const JWT_SECRET = resolveSecret();

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
    name: string;
  };
}

export function generateToken(user: { id: string; email: string; role: string; name: string }) {
  return jwt.sign(user, JWT_SECRET, { expiresIn: '7d' });
}

async function resolveRequestUser(header?: string) {
  if (!header?.startsWith('Bearer ')) {
    return null;
  }
  try {
    const token = header.substring(7);
    const decoded = jwt.verify(token, JWT_SECRET) as any;

    // SECURITY: do not trust the role/status baked into a 7-day token. Re-load the user from
    // the DB so suspended/deleted/demoted users lose access immediately, and so the role used
    // for authorization is always the current one.
    const result = await query('SELECT id, email, role, name, status FROM users WHERE id = $1', [decoded.id]);
    const user = result.rows[0];
    if (!user) throw new Error('Account not found');
    if (user.status === 'suspended' || user.status === 'deleted') {
      throw new Error('This account is no longer active. Contact support.');
    }

    return { id: user.id, email: user.email, role: user.role, name: user.name };
  } catch (err) {
    if (err instanceof Error) throw err;
    throw new Error('Invalid or expired token');
  }
}

export async function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  try {
    const user = await resolveRequestUser(header);
    if (!user) return res.status(401).json({ error: 'Authentication required' });
    req.user = user;
    next();
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Invalid or expired token';
    const status = message === 'This account is no longer active. Contact support.' ? 403 : 401;
    return res.status(status).json({ error: message });
  }
}

export async function optionalAuth(req: AuthRequest, _res: Response, next: NextFunction) {
  try {
    const user = await resolveRequestUser(req.headers.authorization);
    if (user) req.user = user;
  } catch {
    // Guest-safe routes can continue without auth if the token is absent or invalid.
  }
  next();
}

export function requireAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  requireAuth(req, res, () => {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    next();
  });
}

// Content + support operations: a super-admin OR a support-admin may perform these.
export function requireSupportAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  requireAuth(req, res, () => {
    if (req.user?.role !== 'admin' && req.user?.role !== 'support_admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    next();
  });
}

export function requireCaregiver(req: AuthRequest, res: Response, next: NextFunction) {
  requireAuth(req, res, () => {
    if (req.user?.role !== 'caregiver') {
      return res.status(403).json({ error: 'Caregiver access required' });
    }
    next();
  });
}

export function requireFamily(req: AuthRequest, res: Response, next: NextFunction) {
  requireAuth(req, res, () => {
    if (req.user?.role !== 'family') {
      return res.status(403).json({ error: 'Family access required' });
    }
    next();
  });
}
