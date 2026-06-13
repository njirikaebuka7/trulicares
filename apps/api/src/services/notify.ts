import { enqueueEmail } from '../queues/queues.js';
import { query } from '../db.js';

/**
 * Emails the platform admin address (EMAIL_ADMIN_ADDRESS) about an event needing
 * attention. No-op if no recipients are configured. Best-effort — callers should
 * not block their main flow on it.
 *
 * Pass `includeSupportAdmins` for content/support events (e.g. contact-form
 * tickets) so the support-admin team is alerted too, in addition to the env address.
 */
export async function notifyAdmins(opts: {
  subject: string;
  heading: string;
  message: string;
  details?: Array<[string, string]>;
  includeSupportAdmins?: boolean;
}): Promise<void> {
  const recipients = new Set<string>();
  if (process.env.EMAIL_ADMIN_ADDRESS) recipients.add(process.env.EMAIL_ADMIN_ADDRESS.toLowerCase());

  if (opts.includeSupportAdmins) {
    try {
      const r = await query(
        `SELECT email FROM users WHERE role IN ('admin','support_admin') AND status = 'active'`
      );
      for (const row of r.rows) if (row.email) recipients.add(String(row.email).toLowerCase());
    } catch (e: any) {
      console.error('[notifyAdmins] role lookup failed:', e?.message);
    }
  }

  if (recipients.size === 0) return;

  await Promise.all(
    [...recipients].map((to) =>
      enqueueEmail('admin-notification', to, {
        name: 'Admin',
        subject: opts.subject,
        heading: opts.heading,
        message: opts.message,
        details: opts.details,
      }).catch((e) => console.error('[notifyAdmins] failed:', e?.message))
    )
  );
}

/** Convenience: alert admins that a payment completed. */
export async function notifyAdminPayment(opts: {
  description: string;
  amount: string;
  payer?: string;
  refId?: string;
}): Promise<void> {
  const details: Array<[string, string]> = [
    ['Amount', opts.amount],
    ['For', opts.description],
  ];
  if (opts.payer) details.push(['Payer', opts.payer]);
  if (opts.refId) details.push(['Reference', opts.refId]);
  await notifyAdmins({
    subject: `Payment received: ${opts.amount}`,
    heading: '💰 Payment received',
    message: `A payment of ${opts.amount} was completed for ${opts.description}.`,
    details,
  });
}
