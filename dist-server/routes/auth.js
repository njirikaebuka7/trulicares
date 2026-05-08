import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { query } from '../db.js';
import { generateToken, requireAuth } from '../middleware/auth.js';
import { sendWelcomeEmail, sendPasswordResetEmail } from '../services/email.js';
import crypto from 'crypto';
const router = Router();
function detectRole(email, explicitRole) {
    if (explicitRole === 'admin' || email.includes('admin'))
        return 'admin';
    if (explicitRole === 'caregiver' || email.includes('caregiver') || email.includes('provider'))
        return 'caregiver';
    if (explicitRole === 'family')
        return 'family';
    return 'family';
}
// POST /api/auth/register
router.post('/register', async (req, res) => {
    try {
        const { name, email, password, role: requestedRole, caregiverData } = req.body;
        if (!name || !email || !password) {
            return res.status(400).json({ error: 'Name, email and password are required' });
        }
        if (password.length < 8) {
            return res.status(400).json({ error: 'Password must be at least 8 characters' });
        }
        const existing = await query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
        if (existing.rows.length > 0) {
            return res.status(409).json({ error: 'An account with this email already exists' });
        }
        const role = detectRole(email.toLowerCase(), requestedRole);
        const passwordHash = await bcrypt.hash(password, 12);
        const result = await query(`INSERT INTO users (name, email, password_hash, role, status)
       VALUES ($1, $2, $3, $4, 'active')
       RETURNING id, name, email, role, status, photo_url, created_at`, [name.trim(), email.toLowerCase().trim(), passwordHash, role]);
        const user = result.rows[0];
        if (role === 'caregiver') {
            await query(`INSERT INTO caregiver_profiles (user_id, bio, specialties, hourly_rate_min, hourly_rate_max,
          years_experience, availability, location, service_zips, job_title, languages, certifications)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`, [
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
            ]);
            // Submit to verification queue
            await query(`INSERT INTO verification_queue (caregiver_id, specialty, experience, status)
         VALUES ($1, $2, $3, 'pending')`, [user.id, caregiverData?.specialties?.[0] || '', caregiverData?.yearsExperience?.toString() || '0']);
        }
        const token = generateToken({ id: user.id, email: user.email, role: user.role, name: user.name });
        sendWelcomeEmail(user.email, user.name, user.role).catch(console.error);
        res.status(201).json({
            token,
            user: { id: user.id, name: user.name, email: user.email, role: user.role, photoUrl: user.photo_url },
        });
    }
    catch (err) {
        console.error('Register error:', err);
        res.status(500).json({ error: 'Registration failed. Please try again.' });
    }
});
// POST /api/auth/login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }
        const result = await query('SELECT id, name, email, password_hash, role, status, photo_url FROM users WHERE email = $1', [email.toLowerCase().trim()]);
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
        res.json({
            token,
            user: { id: user.id, name: user.name, email: user.email, role: user.role, photoUrl: user.photo_url },
        });
    }
    catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ error: 'Login failed. Please try again.' });
    }
});
// GET /api/auth/me
router.get('/me', requireAuth, async (req, res) => {
    try {
        const result = await query('SELECT id, name, email, role, status, photo_url, created_at FROM users WHERE id = $1', [req.user.id]);
        if (result.rows.length === 0)
            return res.status(404).json({ error: 'User not found' });
        const u = result.rows[0];
        res.json({ id: u.id, name: u.name, email: u.email, role: u.role, status: u.status, photoUrl: u.photo_url });
    }
    catch (err) {
        console.error('Me error:', err);
        res.status(500).json({ error: 'Failed to fetch user' });
    }
});
// PUT /api/auth/profile
router.put('/profile', requireAuth, async (req, res) => {
    try {
        const { name, photoUrl } = req.body;
        const updates = [];
        const params = [];
        let idx = 1;
        if (name) {
            updates.push(`name = $${idx++}`);
            params.push(name.trim());
        }
        if (photoUrl !== undefined) {
            updates.push(`photo_url = $${idx++}`);
            params.push(photoUrl);
        }
        updates.push(`updated_at = NOW()`);
        params.push(req.user.id);
        const result = await query(`UPDATE users SET ${updates.join(', ')} WHERE id = $${idx} RETURNING id, name, email, role, photo_url`, params);
        const u = result.rows[0];
        res.json({ id: u.id, name: u.name, email: u.email, role: u.role, photoUrl: u.photo_url });
    }
    catch (err) {
        console.error('Profile update error:', err);
        res.status(500).json({ error: 'Failed to update profile' });
    }
});
// POST /api/auth/forgot-password
router.post('/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;
        if (!email)
            return res.status(400).json({ error: 'Email is required' });
        const result = await query('SELECT id, name FROM users WHERE email = $1', [email.toLowerCase()]);
        // Always return success to prevent email enumeration
        res.json({ message: 'If an account exists, a reset link has been sent.' });
        if (result.rows.length > 0) {
            const user = result.rows[0];
            const token = crypto.randomBytes(32).toString('hex');
            const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
            await query('UPDATE users SET reset_token = $1, reset_token_expires = $2 WHERE id = $3', [token, expires, user.id]);
            sendPasswordResetEmail(email, user.name, token).catch(console.error);
        }
    }
    catch (err) {
        console.error('Forgot password error:', err);
        res.status(500).json({ error: 'Failed to process request' });
    }
});
// POST /api/auth/reset-password
router.post('/reset-password', async (req, res) => {
    try {
        const { token, password } = req.body;
        if (!token || !password)
            return res.status(400).json({ error: 'Token and password are required' });
        if (password.length < 8)
            return res.status(400).json({ error: 'Password must be at least 8 characters' });
        const result = await query(`SELECT id, name, email FROM users
       WHERE reset_token = $1 AND reset_token_expires > NOW()`, [token]);
        if (result.rows.length === 0) {
            return res.status(400).json({ error: 'Reset link is invalid or has expired.' });
        }
        const user = result.rows[0];
        const passwordHash = await bcrypt.hash(password, 12);
        await query('UPDATE users SET password_hash = $1, reset_token = NULL, reset_token_expires = NULL WHERE id = $2', [passwordHash, user.id]);
        const jwtToken = generateToken({ id: user.id, email: user.email, role: 'family', name: user.name });
        res.json({ message: 'Password reset successfully.', token: jwtToken, user: { id: user.id, name: user.name, email: user.email } });
    }
    catch (err) {
        console.error('Reset password error:', err);
        res.status(500).json({ error: 'Failed to reset password' });
    }
});
export default router;
