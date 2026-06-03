import { cacheAside } from './cache.js';

/**
 * Geocoding abstraction. Forward (text/ZIP → coords + normalized address) and reverse
 * (coords → normalized address). Provider chosen via env:
 *   GEOCODING_PROVIDER = 'nominatim' (default, free, no key) | 'google'
 *   GOOGLE_MAPS_API_KEY (required for the google provider)
 * Results are Redis-cached (geocoding is stable) to respect provider rate limits.
 */

export interface GeoResult {
  latitude: number;
  longitude: number;
  address: string; // street line (house number + road) if available
  city: string;
  state: string;
  zipCode: string;
  country: string;
  formattedAddress: string;
  confidence: 'high' | 'low';
}

const PROVIDER = () => (process.env.GEOCODING_PROVIDER || 'nominatim').toLowerCase();
const USER_AGENT = 'TruliCares/1.0 (+https://www.trulicares.com)';

function confidenceOf(r: Omit<GeoResult, 'confidence'>): 'high' | 'low' {
  // Require the fields the app depends on for matching/display.
  return r.city && r.state && r.zipCode ? 'high' : 'low';
}

// ── Nominatim (OpenStreetMap) ────────────────────────────────
function normalizeNominatim(item: any): GeoResult {
  const a = item.address || {};
  const city = a.city || a.town || a.village || a.hamlet || a.suburb || a.county || '';
  const street = [a.house_number, a.road].filter(Boolean).join(' ');
  const base = {
    latitude: parseFloat(item.lat),
    longitude: parseFloat(item.lon),
    address: street,
    city,
    state: a.state || '',
    zipCode: a.postcode || '',
    country: a.country || '',
    formattedAddress: item.display_name || '',
  };
  return { ...base, confidence: confidenceOf(base) };
}

async function nominatim(path: string, params: Record<string, string>): Promise<any> {
  const url = new URL(`https://nominatim.openstreetmap.org/${path}`);
  url.searchParams.set('format', 'jsonv2');
  url.searchParams.set('addressdetails', '1');
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT, 'Accept-Language': 'en' } });
  if (!res.ok) throw new Error(`Nominatim ${res.status}`);
  return res.json();
}

// ── Google ───────────────────────────────────────────────────
function normalizeGoogle(item: any): GeoResult {
  const comp: any[] = item.address_components || [];
  const get = (type: string) => comp.find((c) => c.types.includes(type));
  const base = {
    latitude: item.geometry?.location?.lat,
    longitude: item.geometry?.location?.lng,
    address: [get('street_number')?.long_name, get('route')?.long_name].filter(Boolean).join(' '),
    city: get('locality')?.long_name || get('postal_town')?.long_name || get('administrative_area_level_2')?.long_name || '',
    state: get('administrative_area_level_1')?.short_name || '',
    zipCode: get('postal_code')?.long_name || '',
    country: get('country')?.long_name || '',
    formattedAddress: item.formatted_address || '',
  };
  return { ...base, confidence: confidenceOf(base) };
}

async function google(params: Record<string, string>): Promise<any[]> {
  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) throw new Error('GOOGLE_MAPS_API_KEY not set');
  const url = new URL('https://maps.googleapis.com/maps/api/geocode/json');
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  url.searchParams.set('key', key);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Google geocode ${res.status}`);
  const data = await res.json();
  return data.results || [];
}

// ── Public API ───────────────────────────────────────────────
export async function reverseGeocode(lat: number, lng: number): Promise<GeoResult[]> {
  const key = `geo:rev:${lat.toFixed(5)},${lng.toFixed(5)}:${PROVIDER()}`;
  return cacheAside(key, 86400, async () => {
    if (PROVIDER() === 'google') {
      const results = await google({ latlng: `${lat},${lng}` });
      return results.slice(0, 5).map(normalizeGoogle);
    }
    const item = await nominatim('reverse', { lat: String(lat), lon: String(lng) });
    return item && item.lat ? [normalizeNominatim(item)] : [];
  });
}

export async function forwardGeocode(queryText: string): Promise<GeoResult[]> {
  const q = queryText.trim();
  if (!q) return [];
  const key = `geo:fwd:${q.toLowerCase()}:${PROVIDER()}`;
  return cacheAside(key, 86400, async () => {
    if (PROVIDER() === 'google') {
      const results = await google({ address: q });
      return results.slice(0, 5).map(normalizeGoogle);
    }
    const items = await nominatim('search', { q, limit: '5', countrycodes: process.env.GEOCODING_COUNTRY || '' });
    return (Array.isArray(items) ? items : []).map(normalizeNominatim);
  });
}
