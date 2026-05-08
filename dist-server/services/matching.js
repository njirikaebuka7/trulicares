import { query } from '../db.js';
function extractZip(location) {
    const match = location?.match(/\b(\d{5})\b/);
    return match ? match[1] : null;
}
export async function findMatches(careType, familyLocation, familyZip, limit = 10) {
    const zip = familyZip || (familyLocation ? extractZip(familyLocation) : null);
    const result = await query(`
    SELECT
      u.id, u.name, u.email, u.photo_url,
      cp.bio, cp.specialties, cp.hourly_rate_min, cp.hourly_rate_max,
      cp.rating, cp.review_count, cp.location, cp.service_zips,
      cp.verified, cp.background_checked, cp.years_experience, cp.availability
    FROM users u
    JOIN caregiver_profiles cp ON cp.user_id = u.id
    WHERE u.status = 'active'
      AND u.role = 'caregiver'
      AND ($1 = ANY(cp.specialties) OR $1 = '')
    ORDER BY cp.rating DESC, cp.review_count DESC
    LIMIT $2
  `, [careType || '', limit]);
    const candidates = result.rows.map((row) => ({
        ...row,
        near_you: zip ? (row.service_zips || []).includes(zip) : false,
    }));
    // Sort: near_you first, then by rating
    candidates.sort((a, b) => {
        if (a.near_you && !b.near_you)
            return -1;
        if (!a.near_you && b.near_you)
            return 1;
        return (b.rating || 0) - (a.rating || 0);
    });
    return candidates;
}
export async function createMatchesForRequest(requestId, familyId, careType, familyLocation, familyZip) {
    const candidates = await findMatches(careType, familyLocation, familyZip);
    for (const candidate of candidates.slice(0, 5)) {
        await query(`
      INSERT INTO matches (request_id, caregiver_id, family_id, near_you)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (caregiver_id, family_id) DO NOTHING
    `, [requestId, candidate.id, familyId, candidate.near_you || false]);
    }
    return candidates;
}
