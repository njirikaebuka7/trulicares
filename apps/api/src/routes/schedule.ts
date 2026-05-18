import { Router } from 'express';
import { query } from '../db.js';
import { requireAuth, AuthRequest } from '../middleware/auth.js';

const router = Router();

const MONTH_NAMES = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];

function parseDateLabel(label: string): Date | null {
  if (!label) return null;
  const m = label.match(/([A-Za-z]+)\s+(\d+)/);
  if (!m) return null;
  const monthIdx = MONTH_NAMES.indexOf(m[1].toLowerCase().slice(0, 3));
  if (monthIdx === -1) return null;
  const day = parseInt(m[2], 10);
  const now = new Date();
  const d = new Date(now.getFullYear(), monthIdx, day);
  if (d < now) d.setFullYear(now.getFullYear() + 1);
  return d;
}

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
                s.created_at, u.name as family_name_real, u.photo_url as family_photo,
                cr.ref_id
         FROM schedules s
         LEFT JOIN users u ON u.id = s.family_id
         LEFT JOIN matches m ON (m.family_id = s.family_id AND m.caregiver_id = s.caregiver_id AND m.status = 'accepted')
         LEFT JOIN care_requests cr ON cr.id = m.request_id
         WHERE s.caregiver_id = $1
         ORDER BY s.created_at DESC`,
        [id]
      );
    } else {
      result = await query(
        `SELECT s.id, s.service, s.date_label, s.time_label, s.location, s.status,
                s.created_at, u.name as caregiver_name, u.photo_url as caregiver_photo,
                cp.job_title, cr.ref_id
         FROM schedules s
         JOIN users u ON u.id = s.caregiver_id
         LEFT JOIN caregiver_profiles cp ON cp.user_id = s.caregiver_id
         LEFT JOIN matches m ON (m.family_id = s.family_id AND m.caregiver_id = s.caregiver_id AND m.status = 'accepted')
         LEFT JOIN care_requests cr ON cr.id = m.request_id
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
      refId: row.ref_id,
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

// POST /api/schedule — create schedule entry (versatile for both caregiver & family initiations)
router.post('/', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { role, id: userId } = req.user!;
    let { caregiverId, familyId, familyName, service, dateLabel, timeLabel, location, date, time } = req.body;

    if (!dateLabel && date) dateLabel = date;
    if (!timeLabel && time) timeLabel = time;

    let caregiver_id = caregiverId;
    let family_id = familyId;

    if (role === 'caregiver') {
      caregiver_id = userId;
      family_id = familyId || null;
    } else if (role === 'family') {
      family_id = userId;
      caregiver_id = caregiverId || null;
      if (!familyName) {
        const u = await query('SELECT name FROM users WHERE id = $1', [family_id]);
        familyName = u.rows[0]?.name || '';
      }
    }

    if (!caregiver_id) {
      return res.status(400).json({ error: 'Caregiver ID is required' });
    }

    const result = await query(
      `INSERT INTO schedules (caregiver_id, family_id, family_name, service, date_label, time_label, location, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'confirmed')
       RETURNING *`,
      [caregiver_id, family_id, familyName || '', service, dateLabel, timeLabel, location || '']
    );

    // Stamp care_date on the related accepted match using the actual scheduled
    // session date so the 48-hour expiry window begins after care occurs
    if (family_id && caregiver_id) {
      const parsedCareDate = parseDateLabel(dateLabel as string);
      await query(
        `UPDATE matches SET care_date = $3
         WHERE family_id = $1 AND caregiver_id = $2
           AND status = 'accepted' AND messaging_unlocked = true`,
        [family_id, caregiver_id, parsedCareDate ?? new Date()]
      );
    }

    res.status(201).json({ schedule: result.rows[0] });
  } catch (err) {
    console.error('Create schedule error:', err);
    res.status(500).json({ error: 'Failed to create schedule' });
  }
});

export default router;
