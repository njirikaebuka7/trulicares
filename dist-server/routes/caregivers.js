import { Router } from 'express';
import { query } from '../db.js';
import { requireCaregiver } from '../middleware/auth.js';
const router = Router();
function formatCaregiver(row) {
    return {
        id: row.id,
        name: row.name,
        email: row.email,
        role: 'caregiver',
        bio: row.bio || '',
        specialties: row.specialties || [],
        hourlyRate: [row.hourly_rate_min || 15, row.hourly_rate_max || 30],
        rating: parseFloat(row.rating) || 4.5,
        reviewCount: row.review_count || 0,
        location: row.location || 'United States',
        verified: row.verified || false,
        backgroundChecked: row.background_checked || false,
        yearsExperience: row.years_experience || 0,
        availability: row.availability || 'Flexible',
        photoUrl: row.photo_url || undefined,
        serviceZips: row.service_zips || [],
        status: row.status || 'active',
        joinedAt: row.created_at,
        // Extended profile fields
        jobTitle: row.job_title || 'Caregiver',
        languages: row.languages || ['English'],
        education: row.education || '',
        certifications: row.certifications || [],
    };
}
// GET /api/caregivers
router.get('/', async (req, res) => {
    try {
        const { category, verified, backgroundChecked, sort, search } = req.query;
        const whereConditions = ["u.status = 'active'", "u.role = 'caregiver'"];
        const params = [];
        let paramIdx = 1;
        if (category && category !== 'all') {
            whereConditions.push(`$${paramIdx} = ANY(cp.specialties)`);
            params.push(category);
            paramIdx++;
        }
        if (verified === 'true')
            whereConditions.push('cp.verified = true');
        if (backgroundChecked === 'true')
            whereConditions.push('cp.background_checked = true');
        if (search) {
            whereConditions.push(`(u.name ILIKE $${paramIdx} OR cp.bio ILIKE $${paramIdx} OR cp.job_title ILIKE $${paramIdx})`);
            params.push(`%${search}%`);
            paramIdx++;
        }
        let orderBy = 'cp.rating DESC, cp.review_count DESC';
        if (sort === 'rating')
            orderBy = 'cp.rating DESC';
        else if (sort === 'price')
            orderBy = 'cp.hourly_rate_min ASC';
        else if (sort === 'experience')
            orderBy = 'cp.years_experience DESC';
        const result = await query(`SELECT u.id, u.name, u.email, u.photo_url, u.status, u.created_at,
              cp.bio, cp.specialties, cp.hourly_rate_min, cp.hourly_rate_max,
              cp.rating, cp.review_count, cp.location, cp.service_zips,
              cp.verified, cp.background_checked, cp.years_experience, cp.availability,
              cp.job_title, cp.languages, cp.education, cp.certifications
       FROM users u
       JOIN caregiver_profiles cp ON cp.user_id = u.id
       WHERE ${whereConditions.join(' AND ')}
       ORDER BY ${orderBy}
       LIMIT 100`, params);
        res.json({ caregivers: result.rows.map(formatCaregiver) });
    }
    catch (err) {
        console.error('Caregivers list error:', err);
        res.status(500).json({ error: 'Failed to fetch caregivers' });
    }
});
// GET /api/caregivers/profile/me — must be BEFORE /:id
router.get('/profile/me', requireCaregiver, async (req, res) => {
    try {
        const result = await query(`SELECT u.id, u.name, u.email, u.photo_url, u.status, u.created_at,
              cp.bio, cp.specialties, cp.hourly_rate_min, cp.hourly_rate_max,
              cp.rating, cp.review_count, cp.location, cp.service_zips,
              cp.verified, cp.background_checked, cp.years_experience, cp.availability,
              cp.job_title, cp.languages, cp.education, cp.certifications
       FROM users u
       JOIN caregiver_profiles cp ON cp.user_id = u.id
       WHERE u.id = $1`, [req.user.id]);
        if (result.rows.length === 0)
            return res.status(404).json({ error: 'Profile not found' });
        res.json({ caregiver: formatCaregiver(result.rows[0]) });
    }
    catch (err) {
        console.error('Caregiver profile me error:', err);
        res.status(500).json({ error: 'Failed to fetch profile' });
    }
});
// GET /api/caregivers/:id
router.get('/:id', async (req, res) => {
    try {
        const result = await query(`SELECT u.id, u.name, u.email, u.photo_url, u.status, u.created_at,
              cp.bio, cp.specialties, cp.hourly_rate_min, cp.hourly_rate_max,
              cp.rating, cp.review_count, cp.location, cp.service_zips,
              cp.verified, cp.background_checked, cp.years_experience, cp.availability,
              cp.job_title, cp.languages, cp.education, cp.certifications
       FROM users u
       JOIN caregiver_profiles cp ON cp.user_id = u.id
       WHERE u.id = $1 AND u.role = 'caregiver'`, [req.params.id]);
        if (result.rows.length === 0)
            return res.status(404).json({ error: 'Caregiver not found' });
        const reviewsResult = await query(`SELECT r.id, r.rating, r.text, r.service, r.created_at, u.name as reviewer_name, u.photo_url as reviewer_photo
       FROM reviews r JOIN users u ON u.id = r.family_id
       WHERE r.caregiver_id = $1 ORDER BY r.created_at DESC LIMIT 10`, [req.params.id]);
        const caregiver = formatCaregiver(result.rows[0]);
        res.json({
            caregiver: {
                ...caregiver,
                sampleReviews: reviewsResult.rows.map((r) => ({
                    id: r.id,
                    author: r.reviewer_name,
                    photo: r.reviewer_photo,
                    rating: r.rating,
                    text: r.text,
                    service: r.service,
                    date: new Date(r.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
                })),
            },
        });
    }
    catch (err) {
        console.error('Caregiver get error:', err);
        res.status(500).json({ error: 'Failed to fetch caregiver' });
    }
});
// PUT /api/caregivers/profile
router.put('/profile', requireCaregiver, async (req, res) => {
    try {
        const { bio, specialties, hourlyRateMin, hourlyRateMax, yearsExperience, availability, location, serviceZips, jobTitle, languages, education, certifications, } = req.body;
        const updates = [];
        const params = [];
        let idx = 1;
        if (bio !== undefined) {
            updates.push(`bio = $${idx++}`);
            params.push(bio);
        }
        if (specialties) {
            updates.push(`specialties = $${idx++}`);
            params.push(specialties);
        }
        if (hourlyRateMin !== undefined) {
            updates.push(`hourly_rate_min = $${idx++}`);
            params.push(hourlyRateMin);
        }
        if (hourlyRateMax !== undefined) {
            updates.push(`hourly_rate_max = $${idx++}`);
            params.push(hourlyRateMax);
        }
        if (yearsExperience !== undefined) {
            updates.push(`years_experience = $${idx++}`);
            params.push(yearsExperience);
        }
        if (availability) {
            updates.push(`availability = $${idx++}`);
            params.push(availability);
        }
        if (location !== undefined) {
            updates.push(`location = $${idx++}`);
            params.push(location);
        }
        if (serviceZips) {
            updates.push(`service_zips = $${idx++}`);
            params.push(serviceZips);
        }
        if (jobTitle !== undefined) {
            updates.push(`job_title = $${idx++}`);
            params.push(jobTitle);
        }
        if (languages) {
            updates.push(`languages = $${idx++}`);
            params.push(languages);
        }
        if (education !== undefined) {
            updates.push(`education = $${idx++}`);
            params.push(education);
        }
        if (certifications) {
            updates.push(`certifications = $${idx++}`);
            params.push(certifications);
        }
        if (updates.length === 0)
            return res.status(400).json({ error: 'No fields to update' });
        params.push(req.user.id);
        await query(`UPDATE caregiver_profiles SET ${updates.join(', ')} WHERE user_id = $${idx}`, params);
        const result = await query(`SELECT u.id, u.name, u.email, u.photo_url, u.status, u.created_at,
              cp.bio, cp.specialties, cp.hourly_rate_min, cp.hourly_rate_max,
              cp.rating, cp.review_count, cp.location, cp.service_zips,
              cp.verified, cp.background_checked, cp.years_experience, cp.availability,
              cp.job_title, cp.languages, cp.education, cp.certifications
       FROM users u JOIN caregiver_profiles cp ON cp.user_id = u.id WHERE u.id = $1`, [req.user.id]);
        res.json({ caregiver: formatCaregiver(result.rows[0]) });
    }
    catch (err) {
        console.error('Caregiver profile update error:', err);
        res.status(500).json({ error: 'Failed to update profile' });
    }
});
export default router;
