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
  service_radius_miles?: number;
  distance_miles?: number | null;
  matchScore?: number;
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

const METERS_PER_MILE = 1609.34;
const MAX_SEARCH_MILES = 60;     // hard cap so the index query stays bounded

// Bayesian-adjusted rating: shrink low-review caregivers toward the global mean so a
// single 5★ review doesn't outrank a long track record. C = prior weight, m = prior mean.
function bayesianRating(avg: number, n: number, C = 8, m = 4.4): number {
  const a = Number(avg) || 0;
  const count = Number(n) || 0;
  return (C * m + a * count) / (C + count);
}
function distanceDecay(miles: number | null): number {
  if (miles == null) return 0.4;             // unknown distance → neutral
  return Math.exp(-miles / 15);              // ~1 nearby, ~0.5 at ~10mi, ~0.13 at 30mi
}
function budgetFit(budget: { min: number; max: number } | null, lo?: number, hi?: number): number {
  if (!budget || !lo || !hi) return 0.5;     // unknown → neutral
  if (Math.min(budget.max, hi) >= Math.max(budget.min, lo)) return 1;          // overlap
  const diff = Math.min(Math.abs(lo - budget.max), Math.abs(hi - budget.min));
  return diff <= 5 ? 0.5 : 0.1;              // within $5 → partial
}

export interface FindMatchesOptions {
  careType: string;
  reqLat?: number | null;
  reqLng?: number | null;
  familyLocation?: string; // legacy fallback (text)
  familyZip?: string;      // legacy fallback (zip)
  budgetStr?: string;
  limit?: number;
}

/**
 * Geo-aware matching.
 *  1. SQL filters by specialty (GIN) and, when the request has coordinates, by a bounded
 *     radius using ST_DWithin on the GiST geo index — returning distance + only the top
 *     candidates (LIMIT 60), instead of scanning the whole table in JS.
 *  2. JS computes a principled, weighted score over that small set:
 *       distance decay · budget fit · Bayesian rating · experience (+ verified bonus).
 *  3. Caregivers without coordinates yet are still included (legacy fallback) so the
 *     transition to geo doesn't drop anyone; they rank on the non-distance factors.
 */
export async function findMatches(opts: FindMatchesOptions): Promise<MatchCandidate[]> {
  const { careType, reqLat, reqLng, familyLocation, familyZip, budgetStr, limit = 10 } = opts;
  const budget = parseBudget(budgetStr || '');
  const zip = familyZip || (familyLocation ? extractZip(familyLocation) : null);
  const hasReqGeo = Number.isFinite(reqLat as number) && Number.isFinite(reqLng as number);

  const params: any[] = [careType || ''];
  let distanceSelect = 'NULL::float8 AS distance_meters';
  let geoFilter = '';
  let orderBy = 'cp.rating DESC NULLS LAST, cp.review_count DESC';

  if (hasReqGeo) {
    params.push(reqLng, reqLat); // ST_MakePoint(lng, lat)
    const geoExpr = `ST_SetSRID(ST_MakePoint($${params.length - 1}, $${params.length}), 4326)::geography`;
    params.push(MAX_SEARCH_MILES * METERS_PER_MILE);
    distanceSelect = `CASE WHEN cp.geo IS NOT NULL THEN ST_Distance(cp.geo, ${geoExpr}) END AS distance_meters`;
    // Include geo-near caregivers OR those without coordinates yet (legacy fallback).
    geoFilter = `AND ( (cp.geo IS NOT NULL AND ST_DWithin(cp.geo, ${geoExpr}, $${params.length})) OR cp.geo IS NULL )`;
    orderBy = '(distance_meters IS NULL), distance_meters ASC NULLS LAST, cp.rating DESC NULLS LAST';
  }

  const result = await query(
    `SELECT u.id, u.name, u.email, u.photo_url,
            cp.bio, cp.specialties, cp.hourly_rate_min, cp.hourly_rate_max,
            cp.rating, cp.review_count, cp.location, cp.service_zips,
            cp.verified, cp.background_checked, cp.years_experience, cp.availability,
            cp.service_radius_miles, ${distanceSelect}
     FROM users u
     JOIN caregiver_profiles cp ON cp.user_id = u.id
     WHERE u.status = 'active' AND u.role = 'caregiver'
       AND ($1 = ANY(cp.specialties) OR $1 = '')
       AND cp.hourly_rate_min IS NOT NULL
       ${geoFilter}
     ORDER BY ${orderBy}
     LIMIT 60`,
    params
  );

  const scored = result.rows.map((row: any) => {
    const distMiles = row.distance_meters != null ? row.distance_meters / METERS_PER_MILE : null;

    // near_you: inside the caregiver's own service radius (geo), else legacy tally
    let nearYou: boolean;
    if (distMiles != null) {
      nearYou = distMiles <= (row.service_radius_miles || 25);
    } else {
      nearYou = locationsTally(familyLocation, zip || undefined, row.location, row.service_zips || []);
    }

    const score =
      0.45 * distanceDecay(distMiles) +
      0.25 * budgetFit(budget, row.hourly_rate_min, row.hourly_rate_max) +
      0.20 * (bayesianRating(row.rating, row.review_count) / 5) +
      0.07 * Math.min((row.years_experience || 0) / 10, 1) +
      0.03 * (row.background_checked ? 1 : 0);

    return {
      ...row,
      near_you: nearYou,
      distance_miles: distMiles,
      matchScore: Math.round(score * 1000) / 10, // 0..100, one decimal
    } as MatchCandidate & { matchScore: number };
  });

  // When we have geo, drop caregivers clearly outside their own radius unless we're short
  // on results (keeps quality high but never returns an empty list if anyone is plausible).
  let pool = scored;
  if (hasReqGeo) {
    const within = scored.filter((c: any) => c.distance_miles == null || c.near_you);
    pool = within.length >= 3 ? within : scored;
  }

  pool.sort((a: any, b: any) => b.matchScore - a.matchScore);
  return pool.slice(0, limit);
}

export async function createMatchesForRequest(
  requestId: string,
  familyId: string,
  careType: string,
  familyLocation?: string,
  familyZip?: string
): Promise<MatchCandidate[]> {
  // Fetch the request budget + coordinates
  const reqRes = await query('SELECT details, latitude, longitude FROM care_requests WHERE id = $1', [requestId]);
  const reqRow = reqRes.rows[0] || {};
  const budgetStr = reqRow.details?.budget || '';

  const candidates = await findMatches({
    careType,
    reqLat: reqRow.latitude,
    reqLng: reqRow.longitude,
    familyLocation,
    familyZip,
    budgetStr,
  });

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
