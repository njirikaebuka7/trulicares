import { query } from '../db.js';

export interface MatchCandidate {
  id: string;
  name: string;
  email: string;
  photo_url: string | null;
  bio: string | null;
  specialties: string[];
  hourly_rate_min: number;
  hourly_rate_max: number;
  rating: number;
  review_count: number;
  location: string | null;
  service_zips: string[];
  verified: boolean;
  background_checked: boolean;
  years_experience: number;
  availability: string;
  near_you?: boolean;
}

function extractZip(location: string): string | null {
  const match = location?.match(/\b(\d{5})\b/);
  return match ? match[1] : null;
}

function parseBudget(budgetStr: string): { min: number; max: number } | null {
  if (!budgetStr) return null;
  const matches = budgetStr.match(/\d+/g);
  if (!matches || matches.length === 0) return null;
  const nums = matches.map(Number);
  if (nums.length === 1) return { min: nums[0], max: nums[0] };
  return { min: Math.min(...nums), max: Math.max(...nums) };
}

export async function findMatches(
  careType: string,
  familyLocation: string | undefined,
  familyZip: string | undefined,
  budgetStr?: string,
  limit = 10
): Promise<MatchCandidate[]> {
  const zip = familyZip || (familyLocation ? extractZip(familyLocation) : null);
  const budget = parseBudget(budgetStr || '');

  // Fetch ALL potentially relevant caregivers (same specialty)
  // We filter dummy caregivers by ensuring they have a valid hourly_rate_min
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
      AND cp.hourly_rate_min IS NOT NULL
    ORDER BY cp.rating DESC, cp.review_count DESC
  `, [careType || '']);

  const candidates: MatchCandidate[] = result.rows.map((row: any) => ({
    ...row,
    near_you: zip ? (row.service_zips || []).includes(zip) : false,
  }));

  // Scoring/Tiering logic
  const scored = candidates.map(c => {
    let score = 0;
    
    // Tier 1: Location Match (Most important)
    if (c.near_you) score += 1000;
    
    // Tier 2: Budget Match
    if (budget && c.hourly_rate_min && c.hourly_rate_max) {
      const overlapMin = Math.max(budget.min, c.hourly_rate_min);
      const overlapMax = Math.min(budget.max, c.hourly_rate_max);
      
      if (overlapMax >= overlapMin) {
        // Exact overlap
        score += 500;
      } else {
        // Slight difference check
        const diff = Math.min(
          Math.abs(c.hourly_rate_min - budget.max),
          Math.abs(c.hourly_rate_max - budget.min)
        );
        if (diff <= 5) score += 200; // Within $5/hr
      }
    }

    // Tier 3: Rating/Experience (Tie breakers)
    score += (c.rating || 0) * 10;
    score += (c.years_experience || 0);

    return { ...c, matchScore: score };
  });

  // Sort by score descending
  scored.sort((a, b) => b.matchScore - a.matchScore);

  return scored.slice(0, limit);
}

export async function createMatchesForRequest(
  requestId: string,
  familyId: string,
  careType: string,
  familyLocation?: string,
  familyZip?: string
): Promise<MatchCandidate[]> {
  // Fetch the request details to get the budget
  const reqRes = await query('SELECT details FROM care_requests WHERE id = $1', [requestId]);
  const budgetStr = reqRes.rows[0]?.details?.budget || '';

  const candidates = await findMatches(careType, familyLocation, familyZip, budgetStr);

  for (const candidate of candidates.slice(0, 5)) {
    await query(`
      INSERT INTO matches (request_id, caregiver_id, family_id, near_you, status)
      VALUES ($1, $2, $3, $4, 'pending')
      ON CONFLICT (caregiver_id, family_id) DO NOTHING
    `, [requestId, candidate.id, familyId, candidate.near_you || false]);
  }

  return candidates;
}
