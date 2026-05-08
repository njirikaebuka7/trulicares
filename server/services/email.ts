import { Resend } from 'resend';

let resend: Resend | null = null;

function getResend(): Resend {
  if (!resend) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      console.warn('RESEND_API_KEY not set — emails will be logged only');
      return { emails: { send: async (opts: any) => { console.log('[EMAIL MOCK]', opts); return { data: { id: 'mock' }, error: null }; } } } as any;
    }
    resend = new Resend(apiKey);
  }
  return resend;
}

const FROM = 'TruliCares <noreply@trulicares.com>';

export async function sendWelcomeEmail(to: string, name: string, role: string) {
  const roleLabel = role === 'caregiver' ? 'caregiver' : 'family';
  return getResend().emails.send({
    from: FROM,
    to,
    subject: `Welcome to TruliCares, ${name}!`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
        <h1 style="color:#2d6a4f">Welcome to TruliCares!</h1>
        <p>Hi ${name}, your ${roleLabel} account is ready.</p>
        <p>You can now log in and ${role === 'caregiver' ? 'start receiving job requests' : 'find a caregiver for your family'}.</p>
        <a href="${process.env.APP_URL || 'https://trulicares.replit.app'}/login" style="background:#2d6a4f;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;margin-top:16px">Get Started</a>
      </div>
    `,
  });
}

export async function sendMatchNotification(to: string, name: string, caregiverName: string) {
  return getResend().emails.send({
    from: FROM,
    to,
    subject: `You have a new match on TruliCares!`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
        <h1 style="color:#2d6a4f">New Match Found!</h1>
        <p>Hi ${name}, we found a great caregiver match for you: <strong>${caregiverName}</strong>.</p>
        <a href="${process.env.APP_URL || 'https://trulicares.replit.app'}/dashboard" style="background:#2d6a4f;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;margin-top:16px">View Match</a>
      </div>
    `,
  });
}

export async function sendJobRequestNotification(to: string, name: string, familyName: string, service: string) {
  return getResend().emails.send({
    from: FROM,
    to,
    subject: `New job request on TruliCares!`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
        <h1 style="color:#2d6a4f">New Job Request!</h1>
        <p>Hi ${name}, <strong>${familyName}</strong> is looking for help with <strong>${service}</strong>.</p>
        <a href="${process.env.APP_URL || 'https://trulicares.replit.app'}/dashboard" style="background:#2d6a4f;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;margin-top:16px">View Request</a>
      </div>
    `,
  });
}

export async function sendMessageNotification(to: string, name: string, senderName: string) {
  return getResend().emails.send({
    from: FROM,
    to,
    subject: `New message from ${senderName}`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
        <h1 style="color:#2d6a4f">New Message</h1>
        <p>Hi ${name}, you have a new message from <strong>${senderName}</strong>.</p>
        <a href="${process.env.APP_URL || 'https://trulicares.replit.app'}/dashboard" style="background:#2d6a4f;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;margin-top:16px">Reply Now</a>
      </div>
    `,
  });
}

export async function sendPasswordResetEmail(to: string, name: string, resetToken: string) {
  const resetUrl = `${process.env.APP_URL || 'https://trulicares.replit.app'}/reset-password?token=${resetToken}`;
  return getResend().emails.send({
    from: FROM,
    to,
    subject: `Reset your TruliCares password`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
        <h1 style="color:#2d6a4f">Password Reset</h1>
        <p>Hi ${name}, click the link below to reset your password. This link expires in 1 hour.</p>
        <a href="${resetUrl}" style="background:#2d6a4f;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;margin-top:16px">Reset Password</a>
        <p style="color:#999;font-size:12px;margin-top:24px">If you didn't request this, ignore this email.</p>
      </div>
    `,
  });
}

export async function sendVerificationStatusEmail(to: string, name: string, approved: boolean) {
  return getResend().emails.send({
    from: FROM,
    to,
    subject: `TruliCares verification ${approved ? 'approved' : 'update'}`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
        <h1 style="color:#2d6a4f">Verification ${approved ? 'Approved!' : 'Update'}</h1>
        <p>Hi ${name}, ${approved
          ? 'your caregiver profile has been verified. You can now receive job requests from families.'
          : 'your verification requires additional information. Please check your dashboard for details.'
        }</p>
        <a href="${process.env.APP_URL || 'https://trulicares.replit.app'}/dashboard" style="background:#2d6a4f;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;margin-top:16px">Go to Dashboard</a>
      </div>
    `,
  });
}
