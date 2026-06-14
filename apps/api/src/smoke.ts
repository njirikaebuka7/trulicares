import 'dotenv/config';

// Smoke test: hits the live public API endpoints and reports any failure.
// Run with:  npm run smoke           (defaults to https://trulicares.com)
//        or: SMOKE_BASE_URL=https://trulicares-api.vercel.app npm run smoke
// Exits non-zero if any endpoint fails — usable in CI or a scheduled check.

const BASE = (process.env.SMOKE_BASE_URL || 'https://trulicares.com').replace(/\/$/, '');

interface Check {
  name: string;
  method: 'GET' | 'POST';
  path: string;
  body?: unknown;
  ok?: number[]; // acceptable status codes (default [200])
}

const CHECKS: Check[] = [
  { name: 'Health (DB)', method: 'GET', path: '/api/health' },
  { name: 'Public settings', method: 'GET', path: '/api/settings/public' },
  { name: 'Resources list', method: 'GET', path: '/api/resources' },
  { name: 'Caregivers (public)', method: 'GET', path: '/api/caregivers/public' },
  // Geocoding depends on an optional provider — "alive" if it responds at all.
  { name: 'Geocode forward', method: 'POST', path: '/api/geo/forward', body: { query: 'New York, NY' }, ok: [200, 400, 422] },
  { name: 'Assistant (guest)', method: 'POST', path: '/api/assistant/chat', body: { message: 'hello' } },
];

async function run() {
  console.log(`\n🔎 Smoke test against ${BASE}\n`);
  let failed = 0;

  for (const c of CHECKS) {
    const ok = c.ok || [200];
    const started = Date.now();
    try {
      const res = await fetch(`${BASE}${c.path}`, {
        method: c.method,
        headers: c.body ? { 'Content-Type': 'application/json' } : undefined,
        body: c.body ? JSON.stringify(c.body) : undefined,
      });
      const ms = Date.now() - started;
      const pass = ok.includes(res.status);
      if (!pass) failed++;
      console.log(`${pass ? '✓' : '✗'} ${c.name.padEnd(22)} ${c.method} ${c.path} → ${res.status} (${ms}ms)`);
    } catch (e: any) {
      failed++;
      console.log(`✗ ${c.name.padEnd(22)} ${c.method} ${c.path} → ERROR ${e?.message}`);
    }
  }

  console.log(`\n${failed === 0 ? '✅ All endpoints healthy' : `❌ ${failed} endpoint(s) failed`}\n`);
  process.exit(failed === 0 ? 0 : 1);
}

run();
