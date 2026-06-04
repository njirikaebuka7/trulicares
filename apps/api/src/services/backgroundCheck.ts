import { query, supabase } from '../db.js';
import {
  turnEnabled, createCandidate, createCheck, getCheck, hostedUrlOf,
  mapTurnStatus, isTerminal, type BgStatus,
} from './turn.js';
import { enqueueEmail } from '../queues/queues.js';

function tableForRole(role: string): 'professional_profiles' | 'caregiver_profiles' {
  return role === 'professional' ? 'professional_profiles' : 'caregiver_profiles';
}

/**
 * Orchestrates a Turn.ai background check AFTER the provider has paid. Creates a Turn
 * candidate + check and records ONLY the safe ids/status. Idempotent-ish: reuses an
 * existing Turn candidate, and won't recreate a check that's already underway.
 *
 * Falls back to the manual admin-approval path (status='pending') when Turn is disabled.
 * Returns the hosted consent URL (or null) so callers can surface / email it.
 */
export async function orderBackgroundCheck(userId: string): Promise<string | null> {
  const uRes = await query('SELECT id, name, email, role FROM users WHERE id = $1', [userId]);
  const user = uRes.rows[0];
  if (!user) return null;
  const table = tableForRole(user.role);

  if (!turnEnabled()) {
    // Sandbox/manual fallback — flag pending so the admin queue can review.
    await query(`UPDATE ${table} SET background_check_status = 'pending', background_check_started_at = COALESCE(background_check_started_at, NOW()) WHERE user_id = $1`, [userId]).catch(() => {});
    return null;
  }

  try {
    const [firstName, ...rest] = (user.name || '').trim().split(/\s+/);
    const lastName = rest.join(' ') || firstName || 'Candidate';

    // Reuse an existing Turn candidate if present.
    const existing = await query(`SELECT turn_candidate_id, turn_check_id, turn_hosted_url FROM ${table} WHERE user_id = $1`, [userId]);
    let candidateId: string | undefined = existing.rows[0]?.turn_candidate_id;
    if (!candidateId) {
      const candidate = await createCandidate({ email: user.email, firstName, lastName });
      candidateId = candidate.id;
    }

    const check = await createCheck(candidateId!);
    const hosted = hostedUrlOf(check);
    const pkg = process.env.TURN_DEFAULT_BACKGROUND_CHECK_PACKAGE_ID || null;

    await query(
      `UPDATE ${table}
       SET turn_candidate_id = $1, turn_check_id = $2, turn_hosted_url = $3,
           background_check_package = $4,
           background_check_status = $5,
           background_check_started_at = COALESCE(background_check_started_at, NOW())
       WHERE user_id = $6`,
      [candidateId, check.id, hosted, pkg, mapTurnStatus(check.status), userId]
    );

    if (hosted) {
      await enqueueEmail('generic-notification', user.email, {
        name: user.name,
        subject: 'Complete your TruliCares background check',
        heading: 'Finish your background check',
        message: 'Your payment is confirmed. Please complete your background check with our partner Turn. You’ll enter your details directly with Turn — TruliCares never sees or stores your sensitive information.',
        cta: 'Complete Background Check',
        url: hosted,
      }).catch(() => {});
    }
    return hosted;
  } catch (err: any) {
    console.error('[backgroundCheck] Turn order failed:', err?.message);
    await query(`UPDATE ${table} SET background_check_status = 'pending' WHERE user_id = $1`, [userId]).catch(() => {});
    return null;
  }
}

/** Re-fetch the hosted consent URL for a user's existing check (Resend link). */
export async function resendBackgroundCheckLink(userId: string, role: string): Promise<string | null> {
  const table = tableForRole(role);
  const res = await query(`SELECT turn_check_id, turn_hosted_url FROM ${table} WHERE user_id = $1`, [userId]);
  const row = res.rows[0];
  if (!row) return null;
  if (!turnEnabled()) return row.turn_hosted_url || null;
  if (!row.turn_check_id) return row.turn_hosted_url || null;
  try {
    const check = await getCheck(row.turn_check_id);
    const hosted = hostedUrlOf(check) || row.turn_hosted_url || null;
    if (hosted && hosted !== row.turn_hosted_url) {
      await query(`UPDATE ${table} SET turn_hosted_url = $1 WHERE user_id = $2`, [hosted, userId]).catch(() => {});
    }
    return hosted;
  } catch {
    return row.turn_hosted_url || null;
  }
}

/**
 * Applies a Turn webhook result to the matching profile (by turn_check_id, falling back to
 * turn_candidate_id), broadcasts realtime, and emails the user on terminal outcomes.
 */
export async function applyTurnResult(opts: {
  checkId?: string; candidateId?: string; status?: string; result?: string;
}): Promise<void> {
  const mapped: BgStatus = mapTurnStatus(opts.status, opts.result);

  for (const table of ['caregiver_profiles', 'professional_profiles'] as const) {
    const whereCol = opts.checkId ? 'turn_check_id' : 'turn_candidate_id';
    const whereVal = opts.checkId || opts.candidateId;
    if (!whereVal) return;

    const isPassed = mapped === 'passed';
    const completed = isTerminal(mapped);

    const res = await query(
      `UPDATE ${table}
       SET background_check_status = $1,
           background_check_completed_at = CASE WHEN $2 THEN NOW() ELSE background_check_completed_at END
           ${table === 'caregiver_profiles' ? ', background_checked = $4' : ''}
       WHERE ${whereCol} = $3
       RETURNING user_id`,
      table === 'caregiver_profiles'
        ? [mapped, completed, whereVal, isPassed]
        : [mapped, completed, whereVal]
    ).catch(() => ({ rows: [] as any[] }));

    if (res.rows.length === 0) continue;
    const userId = res.rows[0].user_id;

    // Append to the bg-check timeline (audit/webhook history).
    await query(
      `INSERT INTO background_check_events (user_id, check_id, status, raw_status, source)
       VALUES ($1, $2, $3, $4, 'turn_webhook')`,
      [userId, opts.checkId || null, mapped, opts.status || opts.result || null]
    ).catch(() => {});

    await supabase.channel(`profile:${userId}`).send({
      type: 'broadcast', event: 'verification_update', payload: { background_check_status: mapped },
    }).catch(() => {});

    const uRes = await query('SELECT name, email FROM users WHERE id = $1', [userId]);
    const u = uRes.rows[0];
    if (u) {
      if (mapped === 'passed') {
        await enqueueEmail('account-approval', u.email, { name: u.name, message: 'your background check passed — your profile is now active.' }).catch(() => {});
      } else if (mapped === 'needs_review') {
        await enqueueEmail('security-alert', u.email, {
          name: u.name,
          subject: 'Your background check needs review',
          message: 'Your background check returned results that need a manual review by our team. We’ll be in touch shortly.',
        }).catch(() => {});
      } else if (mapped === 'failed' || mapped === 'expired') {
        await enqueueEmail('generic-notification', u.email, {
          name: u.name,
          subject: 'Update on your background check',
          heading: 'Background check update',
          message: mapped === 'expired'
            ? 'Your background check link expired. You can restart it from your dashboard.'
            : 'Your background check did not pass our requirements. Please contact support if you believe this is an error.',
        }).catch(() => {});
      }
    }
    return; // matched one table; done
  }
}
