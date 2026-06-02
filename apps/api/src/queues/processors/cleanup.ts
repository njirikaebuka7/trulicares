import { getClient, query, supabase } from '../../db.js';
import { enqueueEmail } from '../queues.js';

/**
 * Scheduled maintenance jobs. Each is defensive (try/catch) so one failing table
 * doesn't abort the others.
 */
export async function processCleanup(jobName: string): Promise<void> {
  switch (jobName) {
    case 'purge-expired-otps':
      return purgeExpiredOtps();
    case 'prune-reset-tokens':
      return pruneResetTokens();
    case 'release-stuck-escrow':
      return releaseStuckEscrow();
    default:
      console.warn('[cleanup] unknown job:', jobName);
  }
}

async function purgeExpiredOtps(): Promise<void> {
  try {
    const res = await query('DELETE FROM otp_codes WHERE expires_at < NOW()');
    if (res.rowCount) console.log(`[cleanup] purged ${res.rowCount} expired OTP(s)`);
  } catch (err: any) {
    console.warn('[cleanup] purge-expired-otps skipped:', err?.message);
  }
}

async function pruneResetTokens(): Promise<void> {
  try {
    const res = await query(
      `UPDATE users SET reset_token = NULL, reset_token_expires = NULL
       WHERE reset_token IS NOT NULL AND reset_token_expires < NOW()`
    );
    if (res.rowCount) console.log(`[cleanup] cleared ${res.rowCount} expired reset token(s)`);
  } catch (err: any) {
    console.warn('[cleanup] prune-reset-tokens skipped:', err?.message);
  }
}

/**
 * Auto-completes bookings the facility forgot to confirm: if a professional checked out
 * more than 24h ago and there's no open dispute, release escrow to the pro's wallet.
 * Mirrors the logic in checkin.ts `confirm-complete`.
 */
async function releaseStuckEscrow(): Promise<void> {
  let stuck;
  try {
    stuck = await query(
      `SELECT sb.id
       FROM shift_bookings sb
       LEFT JOIN shift_disputes sd ON sd.booking_id = sb.id AND sd.status IN ('open','under_review')
       WHERE sb.status = 'checked_out'
         AND sb.checked_out_at < NOW() - INTERVAL '24 hours'
         AND sd.id IS NULL`
    );
  } catch (err: any) {
    console.warn('[cleanup] release-stuck-escrow query skipped:', err?.message);
    return;
  }

  for (const { id: bookingId } of stuck.rows) {
    const client = await getClient();
    try {
      await client.query('BEGIN');
      const bRes = await client.query(
        `SELECT sb.*, pp.user_id AS pro_user_id, fp.user_id AS facility_user_id
         FROM shift_bookings sb
         JOIN professional_profiles pp ON pp.id = sb.professional_id
         JOIN facility_profiles fp ON fp.id = sb.facility_id
         WHERE sb.id = $1 AND sb.status = 'checked_out' FOR UPDATE`,
        [bookingId]
      );
      if (bRes.rows.length === 0) {
        await client.query('ROLLBACK');
        continue;
      }
      const booking = bRes.rows[0];
      const wage = parseFloat(booking.wage_amount);

      await client.query(
        `UPDATE shift_bookings SET status = 'completed', facility_confirmed_complete_at = NOW(), updated_at = NOW() WHERE id = $1`,
        [bookingId]
      );
      await client.query(
        `UPDATE shift_escrow SET status = 'released', released_at = NOW(), released_to = $1 WHERE booking_id = $2 AND status = 'holding'`,
        [booking.pro_user_id, bookingId]
      );
      const walletRes = await client.query(
        `INSERT INTO professional_wallets (user_id, balance, total_earned)
         VALUES ($1, $2, $2)
         ON CONFLICT (user_id) DO UPDATE SET
           balance = professional_wallets.balance + $2,
           total_earned = professional_wallets.total_earned + $2,
           updated_at = NOW()
         RETURNING balance`,
        [booking.pro_user_id, wage]
      );
      const newBalance = walletRes.rows[0].balance;
      await client.query(
        `INSERT INTO wallet_transactions (user_id, type, amount, balance_after, description, booking_id)
         VALUES ($1, 'credit', $2, $3, $4, $5)`,
        [booking.pro_user_id, wage, newBalance, `Shift auto-completed: ${booking.ref_id}`, bookingId]
      );
      await client.query(`UPDATE shifts SET status = 'completed', updated_at = NOW() WHERE id = $1`, [booking.shift_id]);
      await client.query('COMMIT');

      await supabase
        .channel(`wallet:${booking.pro_user_id}`)
        .send({ type: 'broadcast', event: 'balance_updated', payload: { newBalance, creditAmount: wage } })
        .catch(() => {});

      console.log(`[cleanup] auto-released escrow for booking ${booking.ref_id} ($${wage})`);

      // Best-effort email notifications (pro + facility) — addresses fetched separately.
      try {
        const emails = await query(
          `SELECT u.email, u.name, 'pro' AS who FROM users u WHERE u.id = $1
           UNION ALL SELECT u.email, u.name, 'fac' FROM users u WHERE u.id = $2`,
          [booking.pro_user_id, booking.facility_user_id]
        );
        for (const r of emails.rows) {
          await enqueueEmail('generic-notification', r.email, {
            name: r.name,
            subject: 'Shift completed',
            heading: 'Shift auto-completed',
            message:
              r.who === 'pro'
                ? `Your shift ${booking.ref_id} was auto-completed and $${wage} was released to your wallet.`
                : `Shift ${booking.ref_id} was auto-completed after 24h with no dispute.`,
          });
        }
      } catch {
        /* non-fatal */
      }
    } catch (err: any) {
      await client.query('ROLLBACK').catch(() => {});
      console.error(`[cleanup] failed to auto-release booking ${bookingId}:`, err?.message);
    } finally {
      client.release();
    }
  }
}
