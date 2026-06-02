import crypto from 'crypto';

/**
 * Checkr background-check client.
 *
 * Care.com-style flow: we create a Candidate and send them a secure Invitation; the
 * candidate enters SSN/DOB directly on Checkr's hosted form (PII never touches us).
 * Checkr emails the candidate and notifies us via webhook when the report completes.
 *
 * Entirely optional: when CHECKR_API_KEY is unset, `checkrEnabled()` is false and the
 * caller keeps the manual admin-approval fallback.
 */

const API_KEY = () => process.env.CHECKR_API_KEY || '';
const PACKAGE = () => process.env.CHECKR_PACKAGE || 'test_pro_criminal';
const BASE_URL = () =>
  process.env.CHECKR_ENV === 'live' ? 'https://api.checkr.com/v1' : 'https://api.checkr-staging.com/v1';

export function checkrEnabled(): boolean {
  return !!API_KEY();
}

function authHeader(): string {
  // Checkr uses HTTP Basic auth: API key as username, empty password.
  return 'Basic ' + Buffer.from(`${API_KEY()}:`).toString('base64');
}

async function checkrFetch(path: string, init: RequestInit = {}): Promise<any> {
  const res = await fetch(`${BASE_URL()}${path}`, {
    ...init,
    headers: {
      Authorization: authHeader(),
      'Content-Type': 'application/x-www-form-urlencoded',
      ...(init.headers || {}),
    },
  });
  const text = await res.text();
  const json = text ? JSON.parse(text) : {};
  if (!res.ok) {
    throw new Error(`Checkr ${path} failed (${res.status}): ${json?.error || text}`);
  }
  return json;
}

function form(data: Record<string, string | undefined>): string {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(data)) if (v !== undefined && v !== '') params.append(k, v);
  return params.toString();
}

export interface CheckrCandidate {
  id: string;
}
export interface CheckrInvitation {
  id: string;
  invitation_url?: string;
  status?: string;
}

export async function createCandidate(input: { email: string; firstName?: string; lastName?: string }): Promise<CheckrCandidate> {
  return checkrFetch('/candidates', {
    method: 'POST',
    body: form({ email: input.email, first_name: input.firstName, last_name: input.lastName }),
  });
}

export async function createInvitation(candidateId: string, pkg = PACKAGE()): Promise<CheckrInvitation> {
  return checkrFetch('/invitations', {
    method: 'POST',
    body: form({ candidate_id: candidateId, package: pkg }),
  });
}

export async function getReport(reportId: string): Promise<any> {
  return checkrFetch(`/reports/${reportId}`);
}

/**
 * Verifies the X-Checkr-Signature header (HMAC-SHA256 hex of the raw body using the
 * webhook secret). Returns true when no secret is configured (dev convenience).
 */
export function verifyWebhookSignature(rawBody: Buffer, signature: string | undefined): boolean {
  const secret = process.env.CHECKR_WEBHOOK_SECRET;
  if (!secret) return true;
  if (!signature) return false;
  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return false;
  }
}

/** Maps a Checkr report result to our internal status. */
export function mapReportStatus(result?: string, status?: string): 'pending' | 'approved' | 'rejected' | 'consider' {
  if (status && status !== 'complete' && status !== 'completed') return 'pending';
  if (result === 'clear') return 'approved';
  if (result === 'consider') return 'consider';
  return 'pending';
}
