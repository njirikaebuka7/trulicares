/**
 * Branded, responsive transactional email templates for TruliCares.
 *
 * Pure functions — no I/O. Each template returns { subject, html }. The worker (or the
 * direct-send fallback) passes the result to Resend. Inline styles only (email clients
 * strip <style>/external CSS). Uses the app brand palette and logo from env.
 */

export type EmailTemplate =
  | 'forgot-password'
  | 'email-verification'
  | 'welcome'
  | 'login-alert'
  | 'new-message'
  | 'care-request'
  | 'admin-notification'
  | 'payment-confirmation'
  | 'account-approval'
  | 'account-rejection'
  | 'password-changed'
  | 'security-alert'
  | 'generic-notification';

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

// ── Brand tokens (mirrors the frontend Tailwind theme) ───────
const BRAND = {
  green: '#2d6a4f',
  greenDark: '#1b4332',
  coral: '#ff6b5e',
  ink: '#111827',
  body: '#374151',
  muted: '#6b7280',
  line: '#e5e7eb',
  bg: '#f3f4f6',
  card: '#ffffff',
};

function env(name: string, fallback = ''): string {
  return process.env[name] || fallback;
}
const APP_URL = () => env('APP_URL', 'https://www.trulicares.com');
const LOGO_URL = () => env('EMAIL_LOGO_URL', `${APP_URL()}/logo.png`);
const SUPPORT = () => env('EMAIL_SUPPORT_ADDRESS', 'support@trulicares.com');
const FROM_NAME = () => env('EMAIL_FROM_NAME', 'TruliCares');

function esc(s: unknown): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function button(label: string, url: string): string {
  return `
  <table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px 0;">
    <tr><td align="center" bgcolor="${BRAND.green}" style="border-radius:12px;">
      <a href="${esc(url)}" target="_blank"
         style="display:inline-block;padding:14px 32px;font-family:Helvetica,Arial,sans-serif;
                font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:12px;">
        ${esc(label)}
      </a>
    </td></tr>
  </table>`;
}

/** Shared shell: logo header, card, content, footer. `accent` tints the top bar. */
function layout(opts: {
  title: string;
  body: string;
  preheader?: string;
  accent?: string;
}): string {
  const accent = opts.accent || BRAND.green;
  return `<!DOCTYPE html>
<html lang="en"><head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<meta name="color-scheme" content="light"/>
<title>${esc(opts.title)}</title>
</head>
<body style="margin:0;padding:0;background:${BRAND.bg};">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(opts.preheader || opts.title)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND.bg};padding:24px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
             style="max-width:560px;background:${BRAND.card};border-radius:20px;overflow:hidden;
                    box-shadow:0 1px 3px rgba(0,0,0,0.08);">
        <!-- Accent bar -->
        <tr><td style="height:6px;background:${accent};font-size:0;line-height:0;">&nbsp;</td></tr>
        <!-- Logo header -->
        <tr><td align="center" style="padding:32px 32px 8px;">
          <a href="${APP_URL()}" target="_blank">
            <img src="${LOGO_URL()}" alt="${esc(FROM_NAME())}" height="38"
                 style="height:38px;width:auto;border:0;display:block;"/>
          </a>
        </td></tr>
        <!-- Content -->
        <tr><td style="padding:8px 36px 32px;font-family:Helvetica,Arial,sans-serif;color:${BRAND.body};
                       font-size:15px;line-height:1.6;">
          ${opts.body}
        </td></tr>
        <!-- Footer -->
        <tr><td style="padding:22px 36px;background:#fafafa;border-top:1px solid ${BRAND.line};
                       font-family:Helvetica,Arial,sans-serif;color:${BRAND.muted};font-size:12px;line-height:1.6;">
          <p style="margin:0 0 6px;">Need help? Contact us at
            <a href="mailto:${SUPPORT()}" style="color:${BRAND.green};text-decoration:none;">${SUPPORT()}</a>.
          </p>
          <p style="margin:0;">© ${new Date().getFullYear()} TruliCares. Caring, made simple.</p>
        </td></tr>
      </table>
      <p style="font-family:Helvetica,Arial,sans-serif;color:#9ca3af;font-size:11px;margin:16px 0 0;">
        You're receiving this because you have a TruliCares account.
      </p>
    </td></tr>
  </table>
</body></html>`;
}

function h1(text: string): string {
  return `<h1 style="margin:0 0 16px;color:${BRAND.ink};font-size:22px;font-weight:800;">${esc(text)}</h1>`;
}
function p(text: string): string {
  return `<p style="margin:0 0 14px;">${text}</p>`;
}
function infoBox(rows: Array<[string, string]>): string {
  const trs = rows
    .map(
      ([k, v]) =>
        `<tr><td style="padding:6px 0;color:${BRAND.muted};font-size:13px;">${esc(k)}</td>
             <td style="padding:6px 0;color:${BRAND.ink};font-size:13px;font-weight:600;text-align:right;">${esc(v)}</td></tr>`
    )
    .join('');
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0"
            style="background:#f9fafb;border:1px solid ${BRAND.line};border-radius:12px;padding:8px 16px;margin:8px 0 18px;">
            ${trs}</table>`;
}

// ─────────────────────────────────────────────────────────────
// Template registry
// ─────────────────────────────────────────────────────────────
type Data = Record<string, any>;

export function renderEmail(template: EmailTemplate, data: Data): RenderedEmail {
  const name = esc(data.name || 'there');
  const dash = `${APP_URL()}/dashboard`;
  const login = `${APP_URL()}/login`;

  switch (template) {
    case 'welcome': {
      const isCaregiver = data.role === 'caregiver' || data.role === 'professional';
      return {
        subject: `Welcome to TruliCares, ${data.name || ''}!`.trim(),
        text: `Welcome to TruliCares, ${data.name || ''}. Your account is ready. Log in: ${login}`,
        html: layout({
          title: 'Welcome to TruliCares',
          preheader: 'Your account is ready.',
          body:
            h1('Welcome to TruliCares! 🎉') +
            p(`Hi ${name}, your account is ready to go.`) +
            p(
              isCaregiver
                ? `You can now complete your profile and start receiving ${data.role === 'professional' ? 'shift opportunities' : 'job requests'}.`
                : `You can now find trusted, verified caregivers for your family in just a few minutes.`
            ) +
            button('Get Started', dash),
        }),
      };
    }

    case 'email-verification': {
      const code = data.code ? String(data.code) : null;
      const link = data.verifyUrl || `${APP_URL()}/verify?token=${esc(data.token || '')}`;
      return {
        subject: 'Verify your TruliCares email',
        text: code
          ? `Your TruliCares verification code is ${code}. It expires in 10 minutes.`
          : `Verify your email: ${link}`,
        html: layout({
          title: 'Verify your email',
          preheader: 'Confirm your email address to activate your account.',
          body:
            h1('Confirm your email') +
            p(`Hi ${name}, please confirm your email address to activate your account.`) +
            (code
              ? `<div style="text-align:center;margin:24px 0;">
                   <div style="display:inline-block;font-size:34px;letter-spacing:10px;font-weight:800;
                               color:${BRAND.green};background:#f0fdf4;border:1px dashed ${BRAND.green};
                               border-radius:14px;padding:16px 28px;">${esc(code)}</div>
                 </div>` + p('This code expires in 10 minutes.')
              : button('Verify Email', link)),
        }),
      };
    }

    case 'forgot-password': {
      const url = data.resetUrl || `${APP_URL()}/reset-password?token=${esc(data.token || '')}`;
      return {
        subject: 'Reset your TruliCares password',
        text: `Reset your password: ${url} (expires in 1 hour). If you didn't request this, ignore it.`,
        html: layout({
          title: 'Reset your password',
          preheader: 'A request was made to reset your password.',
          body:
            h1('Password reset') +
            p(`Hi ${name}, we received a request to reset your password. Click below to choose a new one.`) +
            button('Reset Password', url) +
            p(`<span style="color:${BRAND.muted};font-size:13px;">This link expires in 1 hour. If you didn't request this, you can safely ignore this email.</span>`),
        }),
      };
    }

    case 'password-changed': {
      return {
        subject: 'Your TruliCares password was changed',
        text: `Hi ${data.name || ''}, your password was just changed. If this wasn't you, contact ${SUPPORT()} immediately.`,
        html: layout({
          title: 'Password changed',
          accent: BRAND.coral,
          preheader: 'Your password was just changed.',
          body:
            h1('Your password was changed') +
            p(`Hi ${name}, this is a confirmation that your TruliCares password was just changed.`) +
            p(`<strong>Didn't do this?</strong> Secure your account right away and contact <a href="mailto:${SUPPORT()}" style="color:${BRAND.green};">${SUPPORT()}</a>.`) +
            button('Review Account Security', `${APP_URL()}/login`),
        }),
      };
    }

    case 'login-alert': {
      return {
        subject: 'New sign-in to your TruliCares account',
        text: `New sign-in detected${data.device ? ` from ${data.device}` : ''}${data.location ? ` (${data.location})` : ''}. If this wasn't you, reset your password.`,
        html: layout({
          title: 'New sign-in detected',
          accent: BRAND.coral,
          preheader: 'A new sign-in to your account was detected.',
          body:
            h1('New sign-in detected') +
            p(`Hi ${name}, we noticed a new sign-in to your account.`) +
            infoBox([
              ['Time', esc(data.time || new Date().toLocaleString())],
              ['Device', esc(data.device || 'Unknown')],
              ['Location', esc(data.location || 'Unknown')],
              ['IP', esc(data.ip || 'Unknown')],
            ]) +
            p(`If this was you, no action is needed. If not, reset your password immediately.`) +
            button('Secure My Account', `${APP_URL()}/reset-password`),
        }),
      };
    }

    case 'security-alert': {
      return {
        subject: data.subject || 'Security alert on your TruliCares account',
        text: `${data.message || 'A security-related event occurred on your account.'} Contact ${SUPPORT()} if you have concerns.`,
        html: layout({
          title: 'Security alert',
          accent: BRAND.coral,
          preheader: 'Important security notice for your account.',
          body:
            h1('Security alert') +
            p(`Hi ${name},`) +
            p(esc(data.message || 'We detected a security-related event on your account that needs your attention.')) +
            (data.reason ? infoBox([['Reason', esc(data.reason)]]) : '') +
            button('Go to Dashboard', dash),
        }),
      };
    }

    case 'new-message': {
      const sender = esc(data.senderName || 'someone');
      return {
        subject: `New message from ${data.senderName || 'a TruliCares user'}`,
        text: `You have a new message from ${data.senderName || 'a user'}. Reply: ${dash}`,
        html: layout({
          title: 'New message',
          preheader: `${data.senderName || 'Someone'} sent you a message.`,
          body:
            h1('You have a new message') +
            p(`Hi ${name}, <strong>${sender}</strong> just sent you a message on TruliCares.`) +
            (data.preview
              ? `<div style="background:#f9fafb;border-left:3px solid ${BRAND.green};border-radius:8px;
                            padding:12px 16px;margin:8px 0 18px;color:${BRAND.body};font-style:italic;">
                   “${esc(String(data.preview).slice(0, 140))}”</div>`
              : '') +
            button('Reply Now', data.url || dash),
        }),
      };
    }

    case 'care-request': {
      // Used for: family booking, caregiver job request, shift posted/applied/accepted.
      return {
        subject: data.subject || 'New activity on TruliCares',
        text: `${data.heading || 'You have a new request'}: ${data.message || ''} View: ${data.url || dash}`,
        html: layout({
          title: data.heading || 'New request',
          preheader: data.message || 'You have new activity on your account.',
          body:
            h1(data.heading || 'New request') +
            p(`Hi ${name},`) +
            p(esc(data.message || 'You have a new care request waiting for your response.')) +
            (Array.isArray(data.details) && data.details.length ? infoBox(data.details) : '') +
            button(data.cta || 'View Details', data.url || dash),
        }),
      };
    }

    case 'payment-confirmation': {
      return {
        subject: 'Payment confirmation — TruliCares',
        text: `Your payment of ${data.amount || ''} for ${data.description || 'your TruliCares order'} was successful.`,
        html: layout({
          title: 'Payment confirmed',
          preheader: 'Your payment was successful.',
          body:
            h1('Payment confirmed ✅') +
            p(`Hi ${name}, thank you! Your payment was processed successfully.`) +
            infoBox([
              ['Description', esc(data.description || 'TruliCares order')],
              ['Amount', esc(data.amount || '')],
              ...(data.refId ? [['Reference', esc(data.refId)] as [string, string]] : []),
              ['Date', esc(data.date || new Date().toLocaleDateString())],
            ]) +
            button('View Receipt', data.url || dash),
        }),
      };
    }

    case 'account-approval': {
      return {
        subject: 'Your TruliCares account is approved 🎉',
        text: `Hi ${data.name || ''}, your account/verification has been approved. ${dash}`,
        html: layout({
          title: 'Account approved',
          preheader: 'Your verification has been approved.',
          body:
            h1('You’re verified! 🎉') +
            p(`Hi ${name}, great news — ${esc(data.message || 'your profile has been reviewed and approved.')}`) +
            p(data.role === 'professional'
              ? 'You can now apply to shifts and get hired by facilities.'
              : data.role === 'caregiver'
              ? 'You can now receive job requests from families.'
              : 'You now have full access to your account.') +
            button('Go to Dashboard', dash),
        }),
      };
    }

    case 'account-rejection': {
      return {
        subject: 'Update on your TruliCares verification',
        text: `Hi ${data.name || ''}, your verification needs attention. ${data.reason || ''} ${dash}`,
        html: layout({
          title: 'Verification update',
          accent: BRAND.coral,
          preheader: 'Your verification needs additional information.',
          body:
            h1('Verification update') +
            p(`Hi ${name}, we reviewed your submission and it needs some changes before we can approve it.`) +
            (data.reason ? infoBox([['Reason', esc(data.reason)]]) : '') +
            p('Please update your profile and resubmit. We’re here to help if you have questions.') +
            button('Update My Profile', dash),
        }),
      };
    }

    case 'admin-notification': {
      return {
        subject: data.subject || 'Admin alert — TruliCares',
        text: `${data.heading || 'Admin notification'}: ${data.message || ''}`,
        html: layout({
          title: data.heading || 'Admin notification',
          accent: BRAND.greenDark,
          preheader: data.message || 'New admin activity requires attention.',
          body:
            h1(data.heading || 'Admin notification') +
            p(esc(data.message || 'A new event requires your attention in the admin dashboard.')) +
            (Array.isArray(data.details) && data.details.length ? infoBox(data.details) : '') +
            button('Open Admin Dashboard', `${APP_URL()}/dashboard`),
        }),
      };
    }

    case 'generic-notification':
    default: {
      return {
        subject: data.subject || 'TruliCares notification',
        text: `${data.message || 'You have a new notification.'} ${data.url || dash}`,
        html: layout({
          title: data.subject || 'Notification',
          preheader: data.message || 'You have a new notification.',
          body:
            h1(data.heading || data.subject || 'Notification') +
            p(`Hi ${name},`) +
            p(esc(data.message || 'You have a new notification on TruliCares.')) +
            button(data.cta || 'View in App', data.url || dash),
        }),
      };
    }
  }
}
