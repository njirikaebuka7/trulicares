import { enqueueEmail } from '../queues/queues.js';

/**
 * Emails the platform admin address (EMAIL_ADMIN_ADDRESS) about an event needing
 * attention. No-op if no admin address is configured. Best-effort — callers should
 * not block their main flow on it.
 */
export async function notifyAdmins(opts: {
  subject: string;
  heading: string;
  message: string;
  details?: Array<[string, string]>;
}): Promise<void> {
  const to = process.env.EMAIL_ADMIN_ADDRESS;
  if (!to) return;
  await enqueueEmail('admin-notification', to, {
    name: 'Admin',
    subject: opts.subject,
    heading: opts.heading,
    message: opts.message,
    details: opts.details,
  }).catch((e) => console.error('[notifyAdmins] failed:', e?.message));
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
