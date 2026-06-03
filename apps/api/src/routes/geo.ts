import { Router } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth.js';
import { searchLimiter } from '../middleware/rateLimiter.js';
import { reverseGeocode, forwardGeocode, type GeoResult } from '../services/geocode.js';

/**
 * Geocoding endpoints used by the location picker. Auth + rate-limited; provider keys
 * stay server-side. Results are normalized + cached in the geocode service.
 */
const router = Router();

function toClient(r: GeoResult) {
  return {
    latitude: r.latitude,
    longitude: r.longitude,
    address: r.address,
    city: r.city,
    state: r.state,
    zipCode: r.zipCode,
    country: r.country,
    formattedAddress: r.formattedAddress,
    confidence: r.confidence,
  };
}

// POST /api/geo/reverse — { lat, lng } → normalized candidate(s)
router.post('/reverse', requireAuth, searchLimiter, async (req: AuthRequest, res) => {
  try {
    const lat = Number(req.body?.lat);
    const lng = Number(req.body?.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
      return res.status(400).json({ error: 'Valid lat/lng are required' });
    }
    const results = await reverseGeocode(lat, lng);
    res.json({ candidates: results.map(toClient) });
  } catch (err: any) {
    console.error('Reverse geocode error:', err?.message);
    res.status(502).json({ error: 'Could not resolve your location. Please enter it manually.' });
  }
});

// POST /api/geo/forward — { query } → normalized candidates (manual entry / ZIP)
router.post('/forward', requireAuth, searchLimiter, async (req: AuthRequest, res) => {
  try {
    const q = String(req.body?.query || '').trim();
    if (q.length < 3) return res.status(400).json({ error: 'Enter at least 3 characters' });
    const results = await forwardGeocode(q);
    res.json({ candidates: results.map(toClient) });
  } catch (err: any) {
    console.error('Forward geocode error:', err?.message);
    res.status(502).json({ error: 'Address lookup failed. Please try again.' });
  }
});

export default router;
