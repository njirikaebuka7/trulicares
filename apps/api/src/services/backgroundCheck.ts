import { query, supabase } from '../db.js';
import { checkrEnabled, createCandidate, createInvitation, mapReportStatus } from './checkr.js';
import { enqueueEmail } from '../queues/queues.js';

/**
 * Orchestrates a background check for a user (caregiver or professional) after they've
 * paid. Creates a Checkr candidate + invitation and records the ids. Idempotent-ish:
 * if a candidate already exists we re-send an invitation rather than duplicating.
 *
 * Falls back to the manual admin-approval path (verification_queue) when Checkr is off.
 */
export async function orderBackgroundCheck(userId: string): Promise<void> {
  const uRes = await query('SELECT id, name, email, role FROM users WHERE id = $1', [userId]);
  const user = uRes.rows[0];
  if (!user) return;

  // Which profile table holds this subject?
  const table = user.role === 'professional' ? 'professional_profiles' : 'caregiver_profiles';

  if (!checkrEnabled()) {
    // Manual fallback — flag pending so the admin queue picks it up.
    await query(`UPDATE ${table} SET background_check_status = 'pending' WHERE user_id = $1`, [userId]).catch(() => {});
    return;
  }

  try {
    const [firstName, ...rest] = (user.name || '').trim().split(/\s+/);
    const lastName = rest.join(' ') || firstName || 'Candidate';

    // Reuse an existing candidate if present.
    const existing = await query(`SELECT checkr_candidate_id FROM ${table} WHERE user_id = $1`, [userId]);
    let candidateId: string | undefined = existing.rows[0]?.checkr_candidate_id;

    if (!candidateId) {
      const candidate = await createCandidate({ email: user.email, firstName, lastName });
      candidateId = candidate.id;
    }
    const invitation = await createInvitation(candidateId!);

    await query(
      `UPDATE ${table}
       SET checkr_candidate_id = $1, checkr_invitation_id = $2, background_check_status = 'pending'
       WHERE user_id = $3`,
      [candidateId, invitation.id, userId]
    );

    await enqueueEmail('generic-notification', user.email, {
      name: user.name,
      subject: 'Complete your TruliCares background check',
      heading: 'Background check started',
      message:
        'We’ve started your background check with our partner Checkr. Check your inbox for a secure email from Checkr to enter your details. Your information goes directly to Checkr and is never stored by TruliCares.',
      cta: 'Open Dashboard',
    });
  } catch (err: any) {
    console.error('[backgroundCheck] order failed:', err?.message);
    // Fall back to manual review so the user isn't stuck.
    await query(`UPDATE ${table} SET background_check_status = 'pending' WHERE user_id = $1`, [userId]).catch(() => {});
  }
}

/**
 * Applies a completed Checkr report result to the matching profile (by candidate id),
 * broadcasts realtime, and emails the user. `result` is 'clear' | 'consider' | etc.
 */
export async function applyCheckrReport(candidateId: string, reportId: string, result?: string, status?: string): Promise<void> {
  const mapped = mapReportStatus(result, status);
  if (mapped === 'pending') return;

  for (const table of ['caregiver_profiles', 'professional_profiles']) {
    const isCleared = mapped === 'approved';
    const res = await query(
      `UPDATE ${table}
       SET checkr_report_id = $1,
           background_check_status = $2,
           background_check_completed_at = NOW()
           ${table === 'caregiver_profiles' ? ', background_checked = $4' : ''}
       WHERE checkr_candidate_id = $3
       RETURNING user_id`,
      table === 'caregiver_profiles'
        ? [reportId, mapped, candidateId, isCleared]
        : [reportId, mapped, candidateId]
    ).catch(() => ({ rows: [] as any[] }));

    if (res.rows.length === 0) continue;
    const userId = res.rows[0].user_id;

    const uRes = await query('SELECT name, email FROM users WHERE id = $1', [userId]);
    const u = uRes.rows[0];

    await supabase
      .channel(`profile:${userId}`)
      .send({ type: 'broadcast', event: 'verification_update', payload: { background_check_status: mapped } })
      .catch(() => {});

    if (u) {
      if (mapped === 'approved') {
        await enqueueEmail('account-approval', u.email, { name: u.name, message: 'your background check came back clear.' });
      } else if (mapped === 'consider') {
        await enqueueEmail('security-alert', u.email, {
          name: u.name,
          subject: 'Your background check needs review',
          message: 'Your background check returned results that need a manual review by our team. We’ll be in touch shortly.',
        });
      }
    }
    return; // matched one table; done
  }
}
