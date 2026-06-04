import crypto from 'crypto';

/**
 * Turn.ai background-check client.
 *
 * Safe integration model:
 *  - The backend creates a candidate + a background-check request.
 *  - Turn handles candidate consent and ALL sensitive data collection (SSN, DOB, ID docs)
 *    through its hosted URL / embedded flow — that PII never touches our servers or DB.
 *  - We persist only: Turn IDs, status, timestamps, package type, and summary/adjudication.
 *
 * All calls are backend-only (the API key is never exposed to the frontend). Entirely
 * optional & sandbox-first: when TURN_API_KEY is unset, `turnEnabled()` is false and the
 * caller keeps a graceful pending/manual fallback so nothing breaks before go-live.
 *
 * NOTE: endpoint paths are written against Turn's documented REST shape and are easy to
 * adjust via TURN_API_BASE_URL / the path constants below if Turn's spec differs.
 */

const API_KEY = () => process.env.TURN_API_KEY || '';
const BASE_URL = () => (process.env.TURN_API_BASE_URL || 'https://api.sandbox.turn.ai/v1').replace(/\/+$/, '');
const DEFAULT_PACKAGE = () => process.env.TURN_DEFAULT_BACKGROUND_CHECK_PACKAGE_ID || '';

export function turnEnabled(): boolean {
  return !!API_KEY();
}

async function turnFetch(path: string, init: RequestInit = {}): Promise<any> {
  const res = await fetch(`${BASE_URL()}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${API_KEY()}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(init.headers || {}),
    },
  });
  const text = await res.text();
  const json = text ? JSON.parse(text) : {};
  if (!res.ok) {
    throw new Error(`Turn ${path} failed (${res.status}): ${json?.error || json?.message || text}`);
  }
  return json;
}

export interface TurnCandidate { id: string; [k: string]: any }
export interface TurnCheck {
  id: string;
  status?: string;
  /** Hosted consent / data-collection URL the candidate must complete. */
  hosted_url?: string;
  invitation_url?: string;
  [k: string]: any;
}

/** Create (or fetch) a Turn candidate for this user. */
export async function createCandidate(input: { email: string; firstName?: string; lastName?: string }): Promise<TurnCandidate> {
  return turnFetch('/candidates', {
    method: 'POST',
    body: JSON.stringify({
      email: input.email,
      first_name: input.firstName || undefined,
      last_name: input.lastName || undefined,
    }),
  });
}

/**
 * Create a background-check request for a candidate. Turn returns the check id + a hosted
 * URL where the candidate gives consent and enters their sensitive data directly with Turn.
 */
export async function createCheck(candidateId: string, packageId = DEFAULT_PACKAGE()): Promise<TurnCheck> {
  return turnFetch('/background_checks', {
    method: 'POST',
    body: JSON.stringify({
      candidate_id: candidateId,
      package: packageId || undefined,
    }),
  });
}

/** Re-fetch a check (used to refresh status or re-surface the hosted consent URL). */
export async function getCheck(checkId: string): Promise<TurnCheck> {
  return turnFetch(`/background_checks/${checkId}`);
}

/** Pull the hosted consent/invitation URL for an existing check (Resend link). */
export function hostedUrlOf(check: TurnCheck): string | null {
  return check.hosted_url || check.invitation_url || null;
}

/**
 * Verify the Turn webhook signature. Turn signs the raw body with TURN_WEBHOOK_SECRET
 * (HMAC-SHA256, hex). Returns true when no secret is configured (sandbox/dev convenience).
 */
export function verifyWebhookSignature(rawBody: Buffer, signature: string | undefined): boolean {
  const secret = process.env.TURN_WEBHOOK_SECRET;
  if (!secret) return true;
  if (!signature) return false;
  // Accept either a bare hex digest or a "sha256=..." prefixed value.
  const provided = signature.includes('=') ? signature.split('=').pop()!.trim() : signature.trim();
  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(provided));
  } catch {
    return false;
  }
}

export type BgStatus =
  | 'not_started' | 'pending' | 'processing' | 'passed'
  | 'needs_review' | 'failed' | 'expired' | 'cancelled';

/**
 * Normalize a Turn status/result into our canonical background_check_status vocabulary.
 * Turn's own statuses map almost 1:1; we also accept common synonyms defensively.
 */
export function mapTurnStatus(status?: string, result?: string): BgStatus {
  const s = (status || '').toLowerCase();
  const r = (result || '').toLowerCase();
  if (['passed', 'clear', 'complete_clear', 'eligible'].includes(r) || ['passed', 'clear'].includes(s)) return 'passed';
  if (['needs_review', 'review', 'consider', 'dispute'].includes(r) || ['needs_review', 'review'].includes(s)) return 'needs_review';
  if (['failed', 'fail', 'ineligible', 'rejected'].includes(r) || ['failed', 'rejected'].includes(s)) return 'failed';
  if (['expired'].includes(s) || r === 'expired') return 'expired';
  if (['cancelled', 'canceled'].includes(s)) return 'cancelled';
  if (['processing', 'in_progress', 'running'].includes(s)) return 'processing';
  if (['pending', 'created', 'invited', 'consent_pending', 'awaiting_consent'].includes(s)) return 'pending';
  return 'pending';
}

/** Terminal states that should never be auto-overwritten by a late/stale event. */
export function isTerminal(status: BgStatus): boolean {
  return ['passed', 'failed', 'expired', 'cancelled'].includes(status);
}
