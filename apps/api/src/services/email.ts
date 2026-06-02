import { Resend } from 'resend';
import { renderEmail, type EmailTemplate } from './emailTemplates.js';
import { enqueueEmail } from '../queues/queues.js';

/**
 * Email service.
 *
 *  • `sendEmail()` performs the ACTUAL Resend delivery (renders a branded template).
 *    It is called by the BullMQ email worker, and by the queue producer's fallback
 *    when Redis isn't configured. Controllers should NOT call it directly.
 *  • The legacy `send*` helpers are kept for existing call sites but now *enqueue* a
 *    job instead of sending inline, so nothing blocks the API response.
 */

let resend: Resend | null = null;
function getResend(): Resend {
  if (!resend) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      console.warn('[email] RESEND_API_KEY not set — emails will be logged only');
      return {
        emails: {
          send: async (opts: any) => {
            console.log('[EMAIL MOCK]', { to: opts.to, subject: opts.subject });
            return { data: { id: 'mock' }, error: null };
          },
        },
      } as any;
    }
    resend = new Resend(apiKey);
  }
  return resend;
}

function fromHeader(): string {
  const name = process.env.EMAIL_FROM_NAME || 'TruliCares';
  const addr = process.env.EMAIL_FROM_ADDRESS || 'noreply@trulicares.com';
  return `${name} <${addr}>`;
}

export interface SendEmailInput {
  template: EmailTemplate;
  to: string;
  data?: Record<string, any>;
}

/** Renders + sends a branded email via Resend. Throws on hard failure (so BullMQ retries). */
export async function sendEmail({ template, to, data = {} }: SendEmailInput): Promise<{ id: string }> {
  if (!to) throw new Error('sendEmail: missing recipient');
  const { subject, html, text } = renderEmail(template, data);
  const res: any = await getResend().emails.send({
    from: fromHeader(),
    to,
    subject,
    html,
    text,
    replyTo: process.env.EMAIL_SUPPORT_ADDRESS || undefined,
  });
  if (res?.error) throw new Error(typeof res.error === 'string' ? res.error : JSON.stringify(res.error));
  return { id: res?.data?.id || 'sent' };
}

// ─────────────────────────────────────────────────────────────
// Legacy compatibility wrappers — now enqueue instead of inline send.
// ─────────────────────────────────────────────────────────────
export function sendWelcomeEmail(to: string, name: string, role: string) {
  return enqueueEmail('welcome', to, { name, role });
}

export function sendMatchNotification(to: string, name: string, caregiverName: string) {
  return enqueueEmail('care-request', to, {
    name,
    heading: 'New match found!',
    message: `We found a great caregiver match for you: ${caregiverName}.`,
    cta: 'View Match',
  });
}

export function sendJobRequestNotification(to: string, name: string, familyName: string, service: string) {
  return enqueueEmail('care-request', to, {
    name,
    heading: 'New job request',
    message: `${familyName} is looking for help with ${service}.`,
    cta: 'View Request',
  });
}

export function sendMessageNotification(to: string, name: string, senderName: string, preview?: string) {
  return enqueueEmail('new-message', to, { name, senderName, preview });
}

export function sendPasswordResetEmail(to: string, name: string, resetToken: string) {
  const resetUrl = `${process.env.APP_URL || 'https://www.trulicares.com'}/reset-password?token=${resetToken}`;
  return enqueueEmail('forgot-password', to, { name, resetUrl, token: resetToken });
}

export function sendNotificationPreferenceEmail(to: string, name: string) {
  return enqueueEmail('generic-notification', to, {
    name,
    subject: 'Email notifications enabled on TruliCares',
    heading: 'Email notifications enabled',
    message: "You'll now receive updates about matches, messages, and upcoming sessions.",
    cta: 'Go to Dashboard',
  });
}

export function sendVerificationStatusEmail(to: string, name: string, approved: boolean, reason?: string) {
  return approved
    ? enqueueEmail('account-approval', to, { name, message: 'your profile has been reviewed and approved.' })
    : enqueueEmail('account-rejection', to, { name, reason });
}
