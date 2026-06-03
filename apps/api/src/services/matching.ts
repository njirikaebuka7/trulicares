import { query } from '../db.js';
import { generateRefId } from './utils.js';
import { cacheGet, cacheSet } from './cache.js';

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

function locationsTally(
  reqLocation: string | undefined,
  reqZip: string | undefined,
  cgLocation: string | null,
  cgServiceZips: string[]
): boolean {
  // Helper to normalize location names (remove zip codes, trim whitespace, lowercase)
  const normalize = (loc: string | null | undefined): string => {
    if (!loc) return '';
    // If the location is just a ZIP code (e.g., "10028"), don't strip it!
    if (/^\s*\d{5}\s*$/.test(loc)) {
      return loc.trim();
    }
    // Remove zip codes if present (e.g. "Brooklyn, NY 11201" -> "Brooklyn, NY")
    let cleaned = loc.replace(/\b\d{5}\b/g, '');
    // Clean up multiple spaces, trailing commas, and lowercase
    cleaned = cleaned.replace(/,\s*$/, '').replace(/\s+/g, ' ').trim().toLowerCase();
    return cleaned;
  };

  const normReq = normalize(reqLocation);
  const normCg = normalize(cgLocation);

  // 1. Check exact ZIP code match or close ZIP code match (fuzzy matching)
  if (reqZip && cgServiceZips && cgServiceZips.length > 0) {
    if (cgServiceZips.includes(reqZip)) return true;
    
    // Fuzzy matching for close zip codes (e.g. 100265 and 100266)
    const reqZipNum = parseInt(reqZip, 10);
    if (!isNaN(reqZipNum)) {
      for (const cgZip of cgServiceZips) {
        const cgZipNum = parseInt(cgZip, 10);
        if (!isNaN(cgZipNum) && Math.abs(reqZipNum - cgZipNum) <= 10) {
          return true;
        }
      }
    }
  }

  // 2. Check exact location name match (case-insensitive)
  if (normReq && normCg && (normReq === normCg || normReq.includes(normCg) || normCg.includes(normReq))) {
    return true;
  }

  if (!normReq || !normCg) return false;

  // 3. Check proximity of locations (cities close to each other)
  const proximityMap: Record<string, string[]> = {
    'brooklyn, ny': ['brooklyn, ny', 'manhattan, ny', 'queens, ny', 'flushing, ny'],
    'manhattan, ny': ['manhattan, ny', 'brooklyn, ny', 'queens, ny', 'hoboken, nj', 'jersey city, nj'],
    'queens, ny': ['queens, ny', 'brooklyn, ny', 'flushing, ny', 'manhattan, ny'],
    'flushing, ny': ['flushing, ny', 'queens, ny', 'brooklyn, ny'],
    'jersey city, nj': ['jersey city, nj', 'hoboken, nj', 'newark, nj', 'manhattan, ny'],
    'hoboken, nj': ['hoboken, nj', 'jersey city, nj', 'newark, nj', 'manhattan, ny'],
    'newark, nj': ['newark, nj', 'jersey city, nj', 'hoboken, nj'],
  };

  const getProximityKeys = (normLoc: string): string[] => {
    return Object.keys(proximityMap).filter(key => normLoc.includes(key) || key.includes(normLoc));
  };

  const reqKeys = getProximityKeys(normReq);
  const cgKeys = getProximityKeys(normCg);

  for (const rKey of reqKeys) {
    const closeToReq = proximityMap[rKey] || [];
    for (const cKey of cgKeys) {
      if (closeToReq.includes(cKey)) {
        return true;
      }
    }
  }

  return false;
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

  // Strictly filter candidates whose location tallies (exact ZIP, exact name, or geographic proximity)
  const candidates: MatchCandidate[] = result.rows
    .map((row: any) => {
      let isNear = false;
      const zips = row.service_zips || [];
      if (zip && zips.length > 0) {
        if (zips.includes(zip)) {
          isNear = true;
        } else {
          const reqZipNum = parseInt(zip, 10);
          if (!isNaN(reqZipNum)) {
            isNear = zips.some((z: string) => {
              const cgZipNum = parseInt(z, 10);
              return !isNaN(cgZipNum) && Math.abs(reqZipNum - cgZipNum) <= 10;
            });
          }
        }
      }
      return {
        ...row,
        near_you: isNear,
      };
    })
    .filter((row: any) => {
      return locationsTally(familyLocation, zip || undefined, row.location, row.service_zips || []);
    });

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
    const refId = generateRefId('SES');
    await query(`
      INSERT INTO matches (request_id, caregiver_id, family_id, near_you, status, ref_id)
      VALUES ($1, $2, $3, $4, 'matching', $5)
      ON CONFLICT (request_id, caregiver_id) DO NOTHING
    `, [requestId, candidate.id, familyId, candidate.near_you || false, refId]);
  }

  return candidates;
}

/**
 * Tops up matches for a family's active requests, THROTTLED to at most once per 10 min
 * per family (via Redis/in-memory cache). This replaces the previous behaviour of
 * re-running the full matching scan on every dashboard load/poll, which was the biggest
 * load risk. Safe to call on every read — it no-ops while the throttle key is warm.
 */
export async function refreshFamilyMatches(familyId: string): Promise<void> {
  const key = `match-refresh:${familyId}`;
  if (await cacheGet<number>(key)) return; // refreshed recently → skip
  await cacheSet(key, Date.now(), 600); // throttle window: 10 minutes

  const activeRequests = await query(
    `SELECT id, care_type, location, zip FROM care_requests
     WHERE family_id = $1 AND status IN ('matching', 'matched')`,
    [familyId]
  );
  for (const r of activeRequests.rows) {
    await createMatchesForRequest(r.id, familyId, r.care_type, r.location || undefined, r.zip || undefined).catch(
      (e) => console.error('refreshFamilyMatches/createMatchesForRequest:', e?.message)
    );
  }
}
