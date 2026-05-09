import { Router } from 'express';
import { query } from '../db.js';
import { requireAuth, AuthRequest } from '../middleware/auth.js';

const router = Router();

const colorMap: Record<string, string> = {
  'Child Care': 'bg-brand-500',
  'Senior Care': 'bg-coral-400',
  'Adult Care': 'bg-sky-400',
  'Cleaning Services': 'bg-violet-400',
  'Cleaning': 'bg-violet-400',
};

// GET /api/schedule
router.get('/', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { id, role } = req.user!;

    let result;
    if (role === 'caregiver') {
      result = await query(
        `SELECT s.id, s.family_name, s.service, s.date_label, s.time_label, s.location, s.status,
                s.created_at, u.name as family_name_real, u.photo_url as family_photo
         FROM schedules s
         LEFT JOIN users u ON u.id = s.family_id
         WHERE s.caregiver_id = $1
         ORDER BY s.created_at DESC`,
        [id]
      );
    } else {
      result = await query(
        `SELECT s.id, s.service, s.date_label, s.time_label, s.location, s.status,
                s.created_at, u.name as caregiver_name, u.photo_url as caregiver_photo,
                cp.job_title
         FROM schedules s
         JOIN users u ON u.id = s.caregiver_id
         LEFT JOIN caregiver_profiles cp ON cp.user_id = s.caregiver_id
         WHERE s.family_id = $1
         ORDER BY s.created_at DESC`,
        [id]
      );
    }

    const schedule = result.rows.map((row: any) => ({
      id: row.id,
      service: row.service,
      date: row.date_label,
      time: row.time_label,
      location: row.location,
      status: row.status,
      colorClass: colorMap[row.service] || 'bg-brand-500',
      familyName: row.family_name_real || row.family_name,
      familyPhoto: row.family_photo,
      caregiverName: row.caregiver_name,
      caregiverPhoto: row.caregiver_photo,
      caregiverRole: row.job_title,
    }));

    res.json({ schedule });
  } catch (err) {
    console.error('Get schedule error:', err);
    res.status(500).json({ error: 'Failed to fetch schedule' });
  }
});

// POST /api/schedule — create schedule entry
router.post('/', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { familyId, familyName, service, dateLabel, timeLabel, location } = req.body;

    const result = await query(
      `INSERT INTO schedules (caregiver_id, family_id, family_name, service, date_label, time_label, location, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'confirmed')
       RETURNING *`,
      [req.user!.id, familyId || null, familyName || '', service, dateLabel, timeLabel, location || '']
    );

    // Stamp care_date on the related accepted match so the 48-hour expiry
    // window starts from when care was booked/delivered.
    if (familyId) {
      await query(
        `UPDATE matches SET care_date = NOW()
         WHERE family_id = $1 AND caregiver_id = $2
           AND status = 'accepted' AND messaging_unlocked = true`,
        [familyId, req.user!.id]
      );
    }

    res.status(201).json({ schedule: result.rows[0] });
  } catch (err) {
    console.error('Create schedule error:', err);
    res.status(500).json({ error: 'Failed to create schedule' });
  }
});

export default router;
