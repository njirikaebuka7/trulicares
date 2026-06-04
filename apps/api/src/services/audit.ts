import { query } from '../db.js';
import type { AuthRequest } from '../middleware/auth.js';

/**
 * Admin audit log. Records every consequential admin action (who, what, which entity,
 * before/after-ish metadata) for accountability. Best-effort: never throws into the
 * request path — a failed audit write must not break the action it describes.
 */
export async function logAdminAction(opts: {
  adminId: string;
  adminEmail?: string;
  action: string;          // e.g. 'user.suspend', 'pricing.update', 'verification.approve'
  entityType?: string;     // e.g. 'user', 'report', 'shift', 'setting'
  entityId?: string | string[] | null;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  try {
    const entityId = Array.isArray(opts.entityId) ? opts.entityId[0] : opts.entityId;
    await query(
      `INSERT INTO admin_audit_logs (admin_id, admin_email, action, entity_type, entity_id, metadata)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [opts.adminId, opts.adminEmail || null, opts.action, opts.entityType || null, entityId || null,
       opts.metadata ? JSON.stringify(opts.metadata) : null]
    );
  } catch (err: any) {
    console.error('[audit] failed to record action:', opts.action, err?.message);
  }
}

/** Convenience wrapper that pulls admin identity from the request. */
export function auditFromReq(
  req: AuthRequest,
  action: string,
  entityType?: string,
  entityId?: string | string[] | null,
  metadata?: Record<string, unknown>,
): Promise<void> {
  return logAdminAction({
    adminId: req.user!.id,
    adminEmail: req.user!.email,
    action, entityType, entityId, metadata,
  });
}
