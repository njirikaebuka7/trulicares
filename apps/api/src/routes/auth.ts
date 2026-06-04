import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { query } from '../db.js';
import { generateToken, requireAuth, AuthRequest } from '../middleware/auth.js';
import { sendWelcomeEmail, sendPasswordResetEmail, sendNotificationPreferenceEmail } from '../services/email.js';
import { enqueueEmail } from '../queues/queues.js';
import crypto from 'crypto';
import { uploadBase64Image } from '../services/storage.js';
import {
  loginLimiter,
  registerLimiter,
  forgotPasswordLimiter,
  otpLimiter,
  uploadLimiter,
} from '../middleware/rateLimiter.js';

const router = Router();

const STRONG_PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;


function detectRole(email: string, explicitRole?: string): 'family' | 'caregiver' | 'admin' | 'professional' | 'facility' {
  // SECURITY: admin is granted ONLY via the server-side ADMIN_EMAILS allowlist.
  // Never trust a user-supplied role of "admin" or an email merely containing "admin"
  // (that allowed anyone to self-register as an administrator).
  const adminEmails = (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  if (adminEmails.includes(email.toLowerCase())) return 'admin';

  if (explicitRole === 'professional') return 'professional';
  if (explicitRole === 'facility') return 'facility';
  if (explicitRole === 'caregiver' || email.includes('caregiver') || email.includes('provider')) return 'caregiver';
  return 'family';
}

// POST /api/auth/register
router.post('/register', registerLimiter, async (req, res) => {
  try {
    const { name, email, password, role: requestedRole, caregiverData, phone } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email and password are required' });
    }
    if (!STRONG_PASSWORD_REGEX.test(password)) {
      return res.status(400).json({ error: 'Password must be at least 8 characters and contain at least one uppercase letter, one lowercase letter, one number, and one special character.' });
    }

    const existing = await query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'An account with this email already exists' });
    }

    const role = detectRole(email.toLowerCase(), requestedRole);
    const passwordHash = await bcrypt.hash(password, 12);

    // If the email was verified during onboarding (before this account row existed),
    // carry that verification onto the new account.
    const normalizedEmail = email.toLowerCase().trim();
    const preVerified = await query('SELECT 1 FROM verified_emails WHERE email = $1', [normalizedEmail]);
    const emailVerified = preVerified.rows.length > 0;

    const result = await query(
      `INSERT INTO users (name, email, password_hash, role, status, phone, email_verified)
       VALUES ($1, $2, $3, $4, 'active', $5, $6)
       RETURNING id, name, email, role, status, photo_url, created_at, phone`,
      [name.trim(), normalizedEmail, passwordHash, role, phone || null, emailVerified]
    );

    const user = result.rows[0];
    if (emailVerified) {
      await query('DELETE FROM verified_emails WHERE email = $1', [normalizedEmail]).catch(() => {});
    }

    if (role === 'caregiver') {
      await query(
        `INSERT INTO caregiver_profiles (user_id, bio, specialties, hourly_rate_min, hourly_rate_max,
          years_experience, availability, location, service_zips, job_title, languages, certifications)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
        [
          user.id,
          caregiverData?.bio || '',
          caregiverData?.specialties || [],
          caregiverData?.hourlyRateMin || 15,
          caregiverData?.hourlyRateMax || 30,
          caregiverData?.yearsExperience || 0,
          caregiverData?.availability || 'Flexible',
          caregiverData?.location || '',
          caregiverData?.serviceZips || [],
          caregiverData?.jobTitle || 'Caregiver',
          caregiverData?.languages || ['English'],
          caregiverData?.certifications || [],
        ]
      );

      // Submit to verification queue
      await query(
        `INSERT INTO verification_queue (caregiver_id, specialty, experience, status)
         VALUES ($1, $2, $3, 'pending')`,
        [user.id, caregiverData?.specialties?.[0] || '', caregiverData?.yearsExperience?.toString() || '0']
      );
    }
    // professional and facility profiles are created via /api/staffing/* routes after account creation

    const token = generateToken({ id: user.id, email: user.email, role: user.role, name: user.name });

    sendWelcomeEmail(user.email, user.name, user.role).catch(console.error);

    res.status(201).json({
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role, photoUrl: user.photo_url },
    });
  } catch (err: any) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Registration failed. Please try again.' });
  }
});

// POST /api/auth/login
router.post('/login', loginLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const result = await query(
      'SELECT id, name, email, password_hash, role, status, photo_url FROM users WHERE email = $1',
      [email.toLowerCase().trim()]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = result.rows[0];

    if (user.status === 'suspended') {
      return res.status(403).json({ error: 'This account has been suspended. Contact support.' });
    }

    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = generateToken({ id: user.id, email: user.email, role: user.role, name: user.name });

    // Security: notify the user of the new sign-in (queued, non-blocking).
    const rawIp = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
    enqueueEmail('login-alert', user.email, {
      name: user.name,
      time: new Date().toLocaleString(),
      device: (req.headers['user-agent'] || 'Unknown device').toString().slice(0, 120),
      ip: Array.isArray(rawIp) ? rawIp[0] : rawIp,
    }).catch(() => {});

    res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role, photoUrl: user.photo_url },
    });
  } catch (err: any) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed. Please try again.' });
  }
});

// GET /api/auth/me
router.get('/me', requireAuth, async (req: AuthRequest, res) => {
  try {
    const result = await query(
      'SELECT id, name, email, role, status, photo_url, created_at FROM users WHERE id = $1',
      [req.user!.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    const u = result.rows[0];
    res.json({ id: u.id, name: u.name, email: u.email, role: u.role, status: u.status, photoUrl: u.photo_url });
  } catch (err) {
    console.error('Me error:', err);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// GET /api/auth/settings — extended profile fields (phone, prefs, address, stats)
router.get('/settings', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { id } = req.user!;
    const [userRes, requestsRes, matchesRes, sessionsRes] = await Promise.all([
      query('SELECT phone, address, notification_prefs, privacy_prefs, created_at, latitude, longitude, city, state, zip_code, country, formatted_address, location_source FROM users WHERE id = $1', [id]),
      query("SELECT COUNT(*) FROM care_requests WHERE family_id = $1", [id]),
      query("SELECT COUNT(*) FROM matches WHERE family_id = $1", [id]),
      query("SELECT COUNT(*) FROM schedules WHERE family_id = $1", [id]),
    ]);
    const u = userRes.rows[0];
    if (!u) return res.status(404).json({ error: 'User not found' });
    res.json({
      phone: u.phone || '',
      address: u.address || '',
      notificationPrefs: u.notification_prefs || { email: true, sms: true, push: false, marketing: false },
      privacyPrefs: u.privacy_prefs || { profileVisible: true, shareActivity: false, dataAnalytics: true },
      memberSince: u.created_at
        ? new Date(u.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
        : 'Unknown',
      careRequestsCount: parseInt(requestsRes.rows[0].count),
      matchesCount: parseInt(matchesRes.rows[0].count),
      sessionsCount: parseInt(sessionsRes.rows[0].count),
      location: u.latitude && u.longitude ? {
        latitude: u.latitude, longitude: u.longitude, city: u.city, state: u.state,
        zipCode: u.zip_code, country: u.country, formattedAddress: u.formatted_address, locationSource: u.location_source,
      } : null,
    });
  } catch (err) {
    console.error('Settings error:', err);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

// POST /api/auth/profile-photo — base64 data URL stored directly
router.post('/profile-photo', requireAuth, uploadLimiter, async (req: AuthRequest, res) => {
  try {
    const { photoData } = req.body;
    if (!photoData) return res.status(400).json({ error: 'photoData is required' });
    if (photoData.length > 2_700_000) return res.status(413).json({ error: 'Image too large (max 2 MB)' });
    const publicUrl = await uploadBase64Image(req.user!.id, photoData);
    await query('UPDATE users SET photo_url = $1, updated_at = NOW() WHERE id = $2', [publicUrl, req.user!.id]);
    res.json({ photoUrl: publicUrl, message: 'Photo updated' });
  } catch (err) {
    console.error('Profile photo error:', err);
    res.status(500).json({ error: 'Failed to update photo' });
  }
});

// PUT /api/auth/password — change password (requires current password)
router.put('/password', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Both current and new passwords are required' });
    }
    if (!STRONG_PASSWORD_REGEX.test(newPassword)) {
      return res.status(400).json({ error: 'Password must be at least 8 characters and contain at least one uppercase letter, one lowercase letter, one number, and one special character.' });
    }
    const result = await query('SELECT password_hash FROM users WHERE id = $1', [req.user!.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    const valid = await bcrypt.compare(currentPassword, result.rows[0].password_hash);
    if (!valid) return res.status(401).json({ error: 'Current password is incorrect' });
    const hash = await bcrypt.hash(newPassword, 12);
    await query('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2', [hash, req.user!.id]);
    enqueueEmail('password-changed', req.user!.email, { name: req.user!.name }).catch(() => {});
    res.json({ message: 'Password changed successfully' });
  } catch (err) {
    console.error('Password change error:', err);
    res.status(500).json({ error: 'Failed to change password' });
  }
});

// DELETE /api/auth/account — permanently delete user and all related data
router.delete('/account', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { id } = req.user!;
    // Delete in FK-safe order
    await query('DELETE FROM messages WHERE sender_id = $1', [id]);
    await query('DELETE FROM conversations WHERE family_id = $1 OR caregiver_id = $1', [id]);
    await query('DELETE FROM matches WHERE family_id = $1 OR caregiver_id = $1', [id]);
    await query('DELETE FROM care_requests WHERE family_id = $1', [id]);
    await query('DELETE FROM schedules WHERE family_id = $1 OR caregiver_id = $1', [id]);
    await query('DELETE FROM payments WHERE user_id = $1', [id]);
    await query('DELETE FROM reviews WHERE reviewer_id = $1 OR reviewed_id = $1', [id]).catch(() => {});
    await query('DELETE FROM notifications WHERE user_id = $1', [id]).catch(() => {});
    await query('DELETE FROM caregiver_profiles WHERE user_id = $1', [id]);
    await query('DELETE FROM verification_queue WHERE caregiver_id = $1', [id]).catch(() => {});
    await query('DELETE FROM reports WHERE reporter_id = $1 OR reported_id = $1', [id]).catch(() => {});
    await query('DELETE FROM users WHERE id = $1', [id]);
    res.json({ message: 'Account deleted' });
  } catch (err) {
    console.error('Account deletion error:', err);
    res.status(500).json({ error: 'Failed to delete account' });
  }
});

// PUT /api/auth/notifications — persist notification preferences
router.put('/notifications', requireAuth, async (req: AuthRequest, res) => {
  try {
    const prefs = req.body;
    const allowed = ['email', 'sms', 'push', 'marketing'];
    const safe: Record<string, boolean> = {};
    for (const k of allowed) { if (typeof prefs[k] === 'boolean') safe[k] = prefs[k]; }

    // Read previous prefs before updating so we only send confirmation on OFF→ON transition
    const prevRes = await query('SELECT notification_prefs, name, email FROM users WHERE id = $1', [req.user!.id]);
    const prevPrefs: Record<string, boolean> = prevRes.rows[0]?.notification_prefs || {};
    const wasEmailOff = !prevPrefs.email;

    await query('UPDATE users SET notification_prefs = $1, updated_at = NOW() WHERE id = $2', [JSON.stringify(safe), req.user!.id]);

    // Only send confirmation email when the email-notifications toggle transitions false → true
    if (safe.email && wasEmailOff && prevRes.rows[0]) {
      sendNotificationPreferenceEmail(prevRes.rows[0].email, prevRes.rows[0].name).catch(console.error);
    }

    res.json({ message: 'Notification preferences saved', prefs: safe });
  } catch (err) {
    console.error('Notification prefs error:', err);
    res.status(500).json({ error: 'Failed to save notification preferences' });
  }
});

// PUT /api/auth/privacy — persist privacy preferences
router.put('/privacy', requireAuth, async (req: AuthRequest, res) => {
  try {
    const prefs = req.body;
    const allowed = ['profileVisible', 'shareActivity', 'dataAnalytics'];
    const safe: Record<string, boolean> = {};
    for (const k of allowed) { if (typeof prefs[k] === 'boolean') safe[k] = prefs[k]; }
    await query('UPDATE users SET privacy_prefs = $1, updated_at = NOW() WHERE id = $2', [JSON.stringify(safe), req.user!.id]);
    res.json({ message: 'Privacy settings saved', prefs: safe });
  } catch (err) {
    console.error('Privacy prefs error:', err);
    res.status(500).json({ error: 'Failed to save privacy settings' });
  }
});

// PUT /api/auth/profile
router.put('/profile', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { name, photoUrl, phone, address, locationData } = req.body;
    const updates: string[] = [];
    const params: any[] = [];
    let idx = 1;

    let finalPhotoUrl = photoUrl;
    if (photoUrl && photoUrl.startsWith('data:')) {
      finalPhotoUrl = await uploadBase64Image(req.user!.id, photoUrl);
    }

    if (name) { updates.push(`name = $${idx++}`); params.push(name.trim()); }
    if (photoUrl !== undefined) { updates.push(`photo_url = $${idx++}`); params.push(finalPhotoUrl); }
    if (phone !== undefined) { updates.push(`phone = $${idx++}`); params.push(phone.trim()); }
    if (address !== undefined) { updates.push(`address = $${idx++}`); params.push(address.trim()); }

    // Confirmed home location (from the location picker)
    if (locationData && typeof locationData === 'object') {
      const loc = locationData;
      updates.push(`latitude = $${idx++}`); params.push(Number.isFinite(Number(loc.latitude)) ? Number(loc.latitude) : null);
      updates.push(`longitude = $${idx++}`); params.push(Number.isFinite(Number(loc.longitude)) ? Number(loc.longitude) : null);
      updates.push(`city = $${idx++}`); params.push(loc.city || null);
      updates.push(`state = $${idx++}`); params.push(loc.state || null);
      updates.push(`zip_code = $${idx++}`); params.push(loc.zipCode || null);
      updates.push(`country = $${idx++}`); params.push(loc.country || null);
      updates.push(`formatted_address = $${idx++}`); params.push(loc.formattedAddress || null);
      updates.push(`location_source = $${idx++}`); params.push(loc.locationSource || null);
    }

    updates.push(`updated_at = NOW()`);
    params.push(req.user!.id);

    const result = await query(
      `UPDATE users SET ${updates.join(', ')} WHERE id = $${idx}
       RETURNING id, name, email, role, photo_url, phone, address,
                 latitude, longitude, city, state, zip_code, country, formatted_address, location_source`,
      params
    );

    const u = result.rows[0];
    res.json({
      id: u.id, name: u.name, email: u.email, role: u.role, photoUrl: u.photo_url, phone: u.phone, address: u.address,
      location: {
        latitude: u.latitude, longitude: u.longitude, city: u.city, state: u.state,
        zipCode: u.zip_code, country: u.country, formattedAddress: u.formatted_address, locationSource: u.location_source,
      },
    });
  } catch (err) {
    console.error('Profile update error:', err);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// NOTE: the real PUT /notifications and PUT /privacy handlers are defined above (they
// persist to the DB). Earlier duplicate mock handlers here were dead code (Express uses the
// first match) and have been removed.

// GET /api/auth/stats — activity stats (care requests, matches, sessions booked)
router.get('/stats', requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const [userRow, requests, matches, sessions] = await Promise.all([
      query('SELECT created_at FROM users WHERE id = $1', [userId]),
      query('SELECT COUNT(*) FROM care_requests WHERE family_id = $1', [userId]),
      query('SELECT COUNT(*) FROM matches WHERE family_id = $1', [userId]),
      query('SELECT COUNT(*) FROM schedules WHERE family_id = $1', [userId]),
    ]);
    const createdAt = userRow.rows[0]?.created_at;
    const memberSince = createdAt
      ? new Date(createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
      : 'Recently';
    res.json({
      memberSince,
      careRequestsCount: parseInt(requests.rows[0]?.count ?? '0'),
      matchesCount: parseInt(matches.rows[0]?.count ?? '0'),
      sessionsCount: parseInt(sessions.rows[0]?.count ?? '0'),
    });
  } catch (err) {
    console.error('Stats error:', err);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// POST /api/auth/forgot-password
router.post('/forgot-password', forgotPasswordLimiter, async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });

    const result = await query('SELECT id, name FROM users WHERE email = $1', [email.toLowerCase()]);

    // IMPORTANT: do the token write + email send BEFORE responding. On Vercel
    // serverless the function can freeze the moment the response is flushed, so any
    // work placed after res.json() may never run (this is why the reset email never
    // arrived). We still return a generic message to prevent email enumeration.
    if (result.rows.length > 0) {
      const user = result.rows[0];
      const token = crypto.randomBytes(32).toString('hex');
      const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
      await query(
        'UPDATE users SET reset_token = $1, reset_token_expires = $2 WHERE id = $3',
        [token, expires, user.id]
      );
      await sendPasswordResetEmail(email, user.name, token).catch((e) =>
        console.error('Reset email failed:', e?.message)
      );
    }

    res.json({ message: 'If an account exists, a reset link has been sent.' });
  } catch (err) {
    console.error('Forgot password error:', err);
    res.status(500).json({ error: 'Failed to process request' });
  }
});

// POST /api/auth/reset-password
router.post('/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) return res.status(400).json({ error: 'Token and password are required' });
    if (!STRONG_PASSWORD_REGEX.test(password)) {
      return res.status(400).json({ error: 'Password must be at least 8 characters and contain at least one uppercase letter, one lowercase letter, one number, and one special character.' });
    }

    const result = await query(
      `SELECT id, name, email, role FROM users
       WHERE reset_token = $1 AND reset_token_expires > NOW()`,
      [token]
    );
    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Reset link is invalid or has expired.' });
    }

    const user = result.rows[0];
    const passwordHash = await bcrypt.hash(password, 12);
    await query(
      'UPDATE users SET password_hash = $1, reset_token = NULL, reset_token_expires = NULL WHERE id = $2',
      [passwordHash, user.id]
    );

    const jwtToken = generateToken({ id: user.id, email: user.email, role: user.role, name: user.name });
    res.json({ message: 'Password reset successfully.', token: jwtToken, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// POST /api/auth/email/send-code — email a 6-digit code to the given address.
// Email-keyed (works before the account row exists, during onboarding). This is safe: the
// code only lands in the real owner's inbox, and the endpoint is rate-limited.
router.post('/email/send-code', otpLimiter, async (req, res) => {
  try {
    const email = String(req.body?.email || '').toLowerCase().trim();
    if (!EMAIL_REGEX.test(email)) return res.status(400).json({ error: 'A valid email is required' });

    // If an account already exists and is verified, short-circuit.
    const existing = await query('SELECT name, email_verified FROM users WHERE email = $1', [email]);
    if (existing.rows[0]?.email_verified) return res.json({ message: 'Email already verified', alreadyVerified: true, email });

    const name = existing.rows[0]?.name || 'there';
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await query(
      `INSERT INTO email_verification_codes (email, code, expires_at) VALUES ($1, $2, $3)
       ON CONFLICT (email) DO UPDATE SET code = EXCLUDED.code, expires_at = EXCLUDED.expires_at, created_at = NOW()`,
      [email, code, expires]
    );

    await enqueueEmail('email-verification', email, { name, code }).catch((e) =>
      console.error('Verification email failed:', e?.message)
    );

    // SECURITY: never return the code itself in production. Expose it only in non-production
    // (so local testing works without a real inbox).
    const body: Record<string, unknown> = { message: 'Verification code sent', email };
    if (process.env.NODE_ENV !== 'production') body.simulatedCode = code;
    res.json(body);
  } catch (err) {
    console.error('Email code send error:', err);
    res.status(500).json({ error: 'Failed to send verification code' });
  }
});

// POST /api/auth/email/verify — confirm the 6-digit code for an email address.
router.post('/email/verify', otpLimiter, async (req, res) => {
  try {
    const email = String(req.body?.email || '').toLowerCase().trim();
    const code = String(req.body?.code || '').trim();
    if (!email || !code) return res.status(400).json({ error: 'Email and code are required' });

    const r = await query('SELECT code, expires_at FROM email_verification_codes WHERE email = $1', [email]);
    const row = r.rows[0];
    if (!row || new Date(row.expires_at) < new Date()) {
      return res.status(400).json({ error: 'Your code has expired. Request a new one.' });
    }
    if (String(row.code) !== code) {
      return res.status(400).json({ error: 'Invalid verification code' });
    }

    // Consume the code, record the verification, and mark the account verified if it exists.
    await query('DELETE FROM email_verification_codes WHERE email = $1', [email]).catch(() => {});
    await query(
      `INSERT INTO verified_emails (email, verified_at) VALUES ($1, NOW())
       ON CONFLICT (email) DO UPDATE SET verified_at = NOW()`,
      [email]
    );
    await query('UPDATE users SET email_verified = true, updated_at = NOW() WHERE email = $1', [email]).catch(() => {});

    res.json({ success: true, message: 'Email verified' });
  } catch (err) {
    console.error('Email verify error:', err);
    res.status(500).json({ error: 'Verification failed' });
  }
});

// ── DEPRECATED: phone SMS OTP. Replaced by email verification above. ──
// These previously leaked the code to the caller and accepted any code, so they are
// disabled rather than left as a self-verification bypass.
router.post('/otp/send', otpLimiter, (_req, res) =>
  res.status(410).json({ error: 'Phone verification has moved to email verification.', endpoint: '/api/auth/email/send-code' })
);
router.post('/otp/verify', otpLimiter, (_req, res) =>
  res.status(410).json({ error: 'Phone verification has moved to email verification.', endpoint: '/api/auth/email/verify' })
);

export default router;
