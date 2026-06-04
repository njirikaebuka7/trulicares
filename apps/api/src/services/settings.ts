import { query } from '../db.js';
import { cacheGet, cacheSet, cacheDel } from './cache.js';

/**
 * Platform settings (key/value) — admin-configurable pricing & config, DB-backed and
 * Redis-cached. Reads fall back to env, then a hardcoded default, so the platform always
 * has sane values even before an admin configures anything.
 */

const CACHE_KEY = 'platform_settings:all';
const CACHE_TTL = 300; // 5 min

// General platform settings (non-pricing).
export const GENERAL_DEFAULTS: Record<string, { value: string; label: string }> = {
  platform_name: { value: 'TruliCares', label: 'Platform Name' },
  support_email: { value: process.env.SUPPORT_EMAIL || 'support@trulicares.com', label: 'Support Email' },
  contact_phone: { value: '', label: 'Contact Phone' },
  terms_url: { value: '/terms', label: 'Terms URL' },
  privacy_url: { value: '/privacy-policy', label: 'Privacy Policy URL' },
  default_search_radius_miles: { value: '25', label: 'Default Search Radius (miles)' },
  default_service_area: { value: '', label: 'Default Service Area' },
};

// Canonical pricing keys + their defaults (USD amounts, or rates as decimals).
export const PRICING_DEFAULTS: Record<string, { value: string; label: string; kind: 'usd' | 'rate' | 'percent' }> = {
  background_check_fee: { value: process.env.BACKGROUND_CHECK_FEE_AMOUNT || '39', label: 'Background Check Processing Fee', kind: 'usd' },
  staffing_platform_fee_rate: { value: '0.20', label: 'Staffing Platform Fee', kind: 'rate' },
  family_matching_fee: { value: '9.99', label: 'Family Matching / Messaging Unlock Fee', kind: 'usd' },
  cancellation_fee: { value: '0', label: 'Cancellation Fee', kind: 'usd' },
  no_show_fee: { value: '0', label: 'No-Show Fee', kind: 'usd' },
  tax_rate: { value: '0', label: 'Tax Rate', kind: 'percent' },
};

async function loadAll(): Promise<Record<string, string>> {
  const cached = await cacheGet<Record<string, string>>(CACHE_KEY);
  if (cached) return cached;
  const res = await query('SELECT key, value FROM platform_settings', []).catch(() => ({ rows: [] as any[] }));
  const map: Record<string, string> = {};
  for (const r of res.rows) map[r.key] = r.value;
  await cacheSet(CACHE_KEY, map, CACHE_TTL).catch(() => {});
  return map;
}

/** Get a raw setting value (DB → env → default). */
export async function getSetting(key: string): Promise<string | null> {
  const all = await loadAll();
  if (all[key] != null) return all[key];
  return PRICING_DEFAULTS[key]?.value ?? null;
}

/** Get a numeric setting (e.g. a fee in USD or a rate). */
export async function getNumberSetting(key: string, fallback: number): Promise<number> {
  const v = await getSetting(key);
  const n = v != null ? parseFloat(v) : NaN;
  return Number.isFinite(n) ? n : fallback;
}

/** All pricing settings merged with defaults, for the admin UI. */
export async function getPricing(): Promise<Record<string, { value: string; label: string; kind: string }>> {
  const all = await loadAll();
  const out: Record<string, { value: string; label: string; kind: string }> = {};
  for (const [key, def] of Object.entries(PRICING_DEFAULTS)) {
    out[key] = { value: all[key] ?? def.value, label: def.label, kind: def.kind };
  }
  return out;
}

/** All general settings merged with defaults, for the admin UI. */
export async function getGeneral(): Promise<Record<string, { value: string; label: string }>> {
  const all = await loadAll();
  const out: Record<string, { value: string; label: string }> = {};
  for (const [key, def] of Object.entries(GENERAL_DEFAULTS)) {
    out[key] = { value: all[key] ?? def.value, label: def.label };
  }
  return out;
}

/** Upsert a setting + invalidate cache. Only known (pricing or general) keys are accepted. */
export async function setSetting(key: string, value: string, updatedBy?: string): Promise<void> {
  if (!(key in PRICING_DEFAULTS) && !(key in GENERAL_DEFAULTS)) throw new Error(`Unknown setting key: ${key}`);
  await query(
    `INSERT INTO platform_settings (key, value, updated_by, updated_at)
     VALUES ($1, $2, $3, NOW())
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_by = EXCLUDED.updated_by, updated_at = NOW()`,
    [key, value, updatedBy || null]
  );
  await cacheDel(CACHE_KEY).catch(() => {});
}
