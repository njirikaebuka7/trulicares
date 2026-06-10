// Static prerendering (SSG-style) for SEO.
//
// After `vite build`, this serves dist/ locally, loads each public route in headless
// Chromium, and writes the fully-rendered HTML back to dist/<route>/index.html. Crawlers and
// social scrapers then get complete HTML (content + meta + JSON-LD) without executing JS.
//
// The app still hydrates client-side as usual; these files are just the first paint crawlers see.

import { createServer } from 'node:http';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join, extname } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const dist = resolve(root, 'dist');
const PORT = 4178;
const LOCAL_BROWSER_CANDIDATES = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
];

const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon', '.woff': 'font/woff', '.woff2': 'font/woff2', '.webp': 'image/webp',
  '.xml': 'application/xml', '.txt': 'text/plain',
};

// ── Browser-free SEO shells ──────────────────────────────────────────────────
// Headless Chromium cannot always launch in CI/Vercel build containers. When a
// route isn't fully prerendered, we still write valid, crawlable HTML for it:
// correct <head> (title/meta/canonical/OG/JSON-LD) plus a real <main> with the
// H1, intro copy, and internal links. React (createRoot) replaces this on mount,
// so users get the SPA while crawlers (Bing, social, AI) get complete HTML.
const SITE_URL = 'https://trulicares.com';
const HOME_TITLE = 'TruliCares — Find Trusted, Verified Caregivers & Healthcare Staffing';
const HOME_DESC =
  'TruliCares helps families find verified caregivers for child, senior, and adult care, and helps healthcare facilities hire licensed nursing professionals across the United States.';

const ORG_SCHEMA = {
  '@context': 'https://schema.org', '@type': 'Organization', name: 'TruliCares',
  url: SITE_URL, logo: `${SITE_URL}/logo.png`,
  description:
    'TruliCares connects families and healthcare facilities with trusted, verified caregivers and licensed nursing professionals across the United States.',
  sameAs: [
    'https://www.facebook.com/trulicares', 'https://twitter.com/trulicares',
    'https://www.instagram.com/trulicares', 'https://www.linkedin.com/company/trulicares',
  ],
  contactPoint: {
    '@type': 'ContactPoint', contactType: 'customer support',
    email: 'support@trulicares.com', areaServed: 'US', availableLanguage: 'English',
  },
};
const WEBSITE_SCHEMA = {
  '@context': 'https://schema.org', '@type': 'WebSite', name: 'TruliCares', url: SITE_URL,
  potentialAction: {
    '@type': 'SearchAction', target: `${SITE_URL}/caregivers?search={search_term_string}`,
    'query-input': 'required name=search_term_string',
  },
};

const FIND = { href: '/find-care', label: 'Find a caregiver' };
const PROVIDE = { href: '/provide-care', label: 'Become a caregiver' };
const SERVICES = { href: '/services', label: 'Care services' };
const FACILITIES = { href: '/for-facilities', label: 'For facilities' };
const PROS = { href: '/for-professionals', label: 'For professionals' };
const RESOURCES = { href: '/resources', label: 'Care resources & guides' };

// Per-route SEO content for the static marketing pages. Mirrors each page's <Seo>.
const ROUTE_SEO = {
  '/': {
    title: HOME_TITLE, description: HOME_DESC, h1: 'Find care you can truly trust',
    intro: [
      'TruliCares helps families find verified caregivers for child care, senior care, adult care, and home cleaning — and connects healthcare facilities with licensed nursing professionals for shift-based work.',
      'Every caregiver is background-checked and identity-verified, with transparent profiles, secure messaging, and escrow-protected payments.',
    ],
    links: [FIND, PROVIDE, SERVICES, FACILITIES, PROS, RESOURCES],
    jsonLd: [ORG_SCHEMA, WEBSITE_SCHEMA],
  },
  '/about': {
    title: 'About TruliCares — Trusted Care, Built on Verification',
    description: 'Learn how TruliCares connects families and healthcare facilities with verified caregivers and licensed professionals through thoughtful matching, background checks, and secure payments.',
    h1: 'Redefining how families find & trust care',
    intro: [
      'TruliCares was built on a simple belief: finding care you can trust should be transparent and safe. We pair families with verified caregivers and help facilities staff licensed professionals.',
      'Verification, background checks, and secure escrow-protected payments are core to every match on the platform.',
    ],
    links: [FIND, SERVICES, FACILITIES, RESOURCES],
    jsonLd: [ORG_SCHEMA],
  },
  '/services': {
    title: 'Care Services — Child Care, Senior Care, Adult Care & Cleaning | TruliCares',
    description: 'Explore TruliCares care services: trusted child care, senior care, adult care, and home cleaning from verified, background-checked caregivers near you.',
    h1: 'Care for every stage of life',
    intro: [
      'From nurturing children to caring for seniors, TruliCares helps you find the right verified professional for every need: child care, senior care, adult care, and home cleaning.',
      'Each caregiver profile shows verification and background-check status up front, so you can choose with confidence.',
    ],
    links: [FIND, PROVIDE, RESOURCES],
    jsonLd: [ORG_SCHEMA],
  },
  '/for-facilities': {
    title: 'Healthcare Staffing for Facilities | TruliCares',
    description: 'Post shifts and hire verified, licensed healthcare professionals (RN, LPN, CNA & more) on demand. Escrow-protected payments, transparent pricing, no long-term contracts.',
    h1: 'Healthcare staffing for facilities',
    intro: [
      'Fill open nursing shifts fast with verified, licensed professionals — RNs, LPNs, CNAs and more. Post a shift, review verified applicants, and confirm a booking in minutes.',
      'Payments are held in escrow and released only after a shift is completed, with transparent pricing and no long-term contracts.',
    ],
    links: [PROS, SERVICES, { href: '/contact', label: 'Contact our team' }],
    jsonLd: [ORG_SCHEMA],
  },
  '/for-professionals': {
    title: 'Per-Diem & Travel Healthcare Shifts for Professionals | TruliCares',
    description: 'Nurses and allied health professionals: find per-diem and travel shifts that fit your schedule. Verify once, apply anywhere, and get fast escrow-protected payouts.',
    h1: 'Per-diem & travel healthcare shifts',
    intro: [
      'Nurses and allied-health professionals: choose where and when you work. Find per-diem and travel shifts that fit your schedule, with fast wallet payouts.',
      'Verify your license and credentials once, then apply to shifts anywhere with escrow-protected payments.',
    ],
    links: [FACILITIES, { href: '/contact', label: 'Contact our team' }],
    jsonLd: [ORG_SCHEMA],
  },
  '/locations': {
    title: 'Find Caregivers Near You by City | TruliCares',
    description: 'Browse TruliCares caregiver coverage by city. Find verified child care, senior care, adult care, and home cleaning help near you across the United States.',
    h1: 'Find trusted caregivers near you',
    intro: [
      'TruliCares connects families with verified, background-checked caregivers in cities across the United States. Find child care, senior care, adult care, and home cleaning help near you.',
    ],
    links: [
      { href: '/care/new-york-ny', label: 'Caregivers in New York, NY' },
      { href: '/care/houston-tx', label: 'Caregivers in Houston, TX' },
      { href: '/care/austin-tx', label: 'Caregivers in Austin, TX' },
      FIND,
    ],
    jsonLd: [ORG_SCHEMA],
  },
  '/provide-care': {
    title: 'Become a Caregiver — Join TruliCares',
    description: 'Join TruliCares as a verified caregiver. Create a free profile, set your rates and availability, and connect with families who need trusted child, senior, and adult care.',
    h1: 'Join TruliCares as a caregiver',
    intro: [
      'Build a free caregiver profile, set your own rates and availability, and get matched with families seeking trusted child care, senior care, adult care, and cleaning help.',
      'Verification and background-check status on your profile help families choose you with confidence.',
    ],
    links: [SERVICES, RESOURCES],
    jsonLd: [ORG_SCHEMA],
  },
  '/contact': {
    title: "Contact TruliCares — We're Here to Help",
    description: 'Get in touch with the TruliCares team. Questions about finding care, becoming a caregiver, or staffing your facility? Reach us by email or phone.',
    h1: 'Contact TruliCares',
    intro: [
      'Questions about finding care, becoming a caregiver, or staffing your facility? The TruliCares team is here to help — reach us by email or phone.',
    ],
    links: [FIND, FACILITIES, RESOURCES],
    jsonLd: [ORG_SCHEMA],
  },
  '/resources': {
    title: 'Care Resources & Guides | TruliCares',
    description: 'Expert articles and guides on child care, senior care, hiring caregivers, and family wellbeing from the TruliCares team.',
    h1: 'Care knowledge & expert guides',
    intro: [
      'Expert articles and guides on child care, senior care, hiring trusted caregivers, healthcare staffing, and family wellbeing — from the TruliCares team.',
    ],
    links: [
      { href: '/resources/what-is-trulicares', label: 'What is TruliCares?' },
      { href: '/resources/how-to-find-a-trusted-caregiver', label: 'How to find a trusted caregiver' },
      { href: '/resources/in-home-senior-care-guide', label: 'In-home senior care guide' },
      FIND,
    ],
    jsonLd: [ORG_SCHEMA],
  },
  '/privacy-policy': {
    title: 'Privacy Policy | TruliCares',
    description: 'How TruliCares collects, uses, and protects your personal information.',
    h1: 'Privacy Policy', intro: ['How TruliCares collects, uses, and protects your personal information.'],
    links: [{ href: '/terms', label: 'Terms of Service' }], jsonLd: [],
  },
  '/terms': {
    title: 'Terms of Service | TruliCares',
    description: 'The terms that govern your use of the TruliCares platform.',
    h1: 'Terms of Service', intro: ['The terms that govern your use of the TruliCares platform.'],
    links: [{ href: '/privacy-policy', label: 'Privacy Policy' }], jsonLd: [],
  },
  '/cookie-policy': {
    title: 'Cookie Policy | TruliCares',
    description: 'How TruliCares uses cookies and similar technologies.',
    h1: 'Cookie Policy', intro: ['How TruliCares uses cookies and similar technologies.'],
    links: [{ href: '/privacy-policy', label: 'Privacy Policy' }], jsonLd: [],
  },
};

function cityConfig(c) {
  const place = `${c.city}, ${c.stateAbbr}`;
  const description = `Find trusted, background-checked caregivers in ${c.city}, ${c.state}. TruliCares matches families with verified child care, senior care, adult care, and home cleaning help near you.`;
  return {
    title: `Caregivers in ${place} | Child, Senior & Adult Care | TruliCares`,
    description,
    h1: `Find trusted caregivers in ${place}`,
    intro: [
      `Looking for trusted, verified caregivers in ${c.city}, ${c.state}? TruliCares matches families with background-checked professionals for child care, senior care, adult care, and home cleaning near you.`,
      `Every caregiver profile shows verification and background-check status up front, so you can choose with confidence and connect through secure, on-platform messaging.`,
    ],
    links: [
      { href: '/find-care', label: `Find a caregiver in ${c.city}` },
      SERVICES,
      { href: '/locations', label: 'Browse all locations' },
    ],
    jsonLd: [
      {
        '@context': 'https://schema.org', '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
          { '@type': 'ListItem', position: 2, name: 'Locations', item: `${SITE_URL}/locations` },
          { '@type': 'ListItem', position: 3, name: place, item: `${SITE_URL}/care/${c.slug}` },
        ],
      },
      {
        '@context': 'https://schema.org', '@type': 'Service',
        serviceType: 'Caregiver matching and home care services', provider: ORG_SCHEMA,
        areaServed: { '@type': 'City', name: c.city, containedInPlace: { '@type': 'State', name: c.state } },
        description,
      },
    ],
  };
}

function loadCities() {
  return JSON.parse(readFileSync(resolve(root, 'src/data/locations.json'), 'utf8')).cities;
}

function seoFor(route, cities) {
  if (ROUTE_SEO[route]) return ROUTE_SEO[route];
  const m = route.match(/^\/care\/(.+)$/);
  if (m) {
    const c = cities.find((x) => x.slug === m[1]);
    if (c) return cityConfig(c);
  }
  return null;
}

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function headTagsFor(cfg, route) {
  const url = route === '/' ? `${SITE_URL}/` : `${SITE_URL}${route}`;
  const img = `${SITE_URL}/logo.png`;
  const t = esc(cfg.title), d = esc(cfg.description);
  const tags = [
    `<title>${t}</title>`,
    `<meta name="description" content="${d}" />`,
    `<link rel="canonical" href="${url}" />`,
    `<meta name="robots" content="index,follow" />`,
    `<meta property="og:title" content="${t}" />`,
    `<meta property="og:description" content="${d}" />`,
    `<meta property="og:type" content="${cfg.ogType || 'website'}" />`,
    `<meta property="og:url" content="${url}" />`,
    `<meta property="og:image" content="${img}" />`,
    `<meta property="og:site_name" content="TruliCares" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${t}" />`,
    `<meta name="twitter:description" content="${d}" />`,
    `<meta name="twitter:image" content="${img}" />`,
  ];
  for (const block of cfg.jsonLd || []) {
    tags.push(`<script type="application/ld+json">${JSON.stringify(block).replace(/</g, '\\u003c')}</script>`);
  }
  return tags.join('\n    ');
}

function bodyFor(cfg) {
  const paras = (cfg.intro || []).map((p) => `<p>${esc(p)}</p>`).join('\n      ');
  const links = (cfg.links || []).map((l) => `<a href="${l.href}">${esc(l.label)}</a>`).join('\n        ');
  return `<main>
      <h1>${esc(cfg.h1)}</h1>
      ${paras}
      <nav aria-label="Key links">
        ${links}
      </nav>
    </main>`;
}

// For each route, write a crawlable SEO shell — UNLESS it was already fully
// prerendered (has a <title>), so the richer rendered HTML always wins and there
// are never duplicate tags.
async function ensureSeoShells(baseHtml, routes, cities) {
  let wrote = 0;
  for (const route of routes) {
    const cfg = seoFor(route, cities);
    if (!cfg) continue;
    const outDir = route === '/' ? dist : join(dist, route);
    const file = join(outDir, 'index.html');
    if (existsSync(file)) {
      const existing = await readFile(file, 'utf8');
      if (/<title>/i.test(existing)) continue; // already prerendered
    }
    let html = baseHtml.replace(/<\/head>/i, `    ${headTagsFor(cfg, route)}\n  </head>`);
    html = html.replace('<div id="root"></div>', `<div id="root">${bodyFor(cfg)}</div>`);
    await mkdir(outDir, { recursive: true });
    await writeFile(file, html, 'utf8');
    wrote++;
  }
  if (wrote) console.log(`  ↳ wrote ${wrote} browser-free SEO shells (title/meta/H1/JSON-LD)`);
}

// Routes to prerender / generate SEO shells for.
function routesToPrerender() {
  const staticRoutes = [
    '/', '/about', '/services', '/for-facilities', '/for-professionals',
    '/locations', '/provide-care', '/contact', '/resources', '/privacy-policy', '/terms', '/cookie-policy',
  ];
  return [...staticRoutes, ...loadCities().map((c) => `/care/${c.slug}`)];
}

function findLocalBrowserExecutable() {
  return LOCAL_BROWSER_CANDIDATES.find((candidate) => existsSync(candidate));
}

async function startServer() {
  const indexHtml = await readFile(join(dist, 'index.html'), 'utf8');
  const server = createServer(async (req, res) => {
    try {
      const urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
      const filePath = join(dist, urlPath);
      if (extname(urlPath) && existsSync(filePath)) {
        const buf = await readFile(filePath);
        res.writeHead(200, { 'Content-Type': MIME[extname(urlPath)] || 'application/octet-stream' });
        res.end(buf);
        return;
      }
      // SPA fallback — let the client router render the route
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(indexHtml);
    } catch {
      res.writeHead(500);
      res.end('error');
    }
  });
  await new Promise((r) => server.listen(PORT, r));
  return server;
}

async function main() {
  if (!existsSync(dist)) {
    console.error('✗ dist/ not found. Run `vite build` first.');
    process.exit(1);
  }

  const routes = routesToPrerender();
  const cities = loadCities();
  // Capture the bare built shell now (before any prerendered file overwrites it)
  // to use as the template for browser-free SEO shells.
  const baseHtml = await readFile(join(dist, 'index.html'), 'utf8');

  // Launch headless Chromium. On Vercel/CI, full puppeteer's bundled Chromium usually can't
  // run (missing system libraries), so prefer @sparticuz/chromium + puppeteer-core there.
  // Locally, prefer the bundled Puppeteer install, but fall back to an installed Chrome/Edge
  // binary so prerendering still works on machines without Puppeteer's managed browser cache.
  // ANY launch failure is non-fatal: we warn and let the build succeed (the site still ships
  // client-rendered, with per-page meta + sitemap).
  let browser;
  try {
    if (process.env.VERCEL || process.env.CI || process.env.USE_SPARTICUZ) {
      const chromium = (await import('@sparticuz/chromium')).default;
      const puppeteer = (await import('puppeteer-core')).default;
      browser = await puppeteer.launch({
        args: [...chromium.args, '--no-sandbox', '--disable-setuid-sandbox'],
        executablePath: await chromium.executablePath(),
        headless: true,
      });
    } else {
      const puppeteer = (await import('puppeteer')).default;
      const localExecutable = findLocalBrowserExecutable();
      browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
        ...(localExecutable ? { executablePath: localExecutable } : {}),
      });
    }
  } catch (e) {
    console.warn(`\n⚠ Prerender skipped — could not launch headless Chromium: ${e.message}`);
    console.warn('  Writing browser-free SEO shells so crawlers still get title/meta/H1/JSON-LD.\n');
    await ensureSeoShells(baseHtml, routes, cities);
    process.exit(0);
  }

  const server = await startServer();

  let ok = 0;
  try {
    for (const route of routes) {
      const page = await browser.newPage();
      try {
        await page.goto(`http://localhost:${PORT}${route}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
        // Give React 19 a tick to hoist <title>/<meta> into <head>.
        await new Promise((r) => setTimeout(r, 1500));
        const html = '<!DOCTYPE html>\n' + (await page.evaluate(() => document.documentElement.outerHTML));
        const outDir = route === '/' ? dist : join(dist, route);
        await mkdir(outDir, { recursive: true });
        await writeFile(join(outDir, 'index.html'), html, 'utf8');
        ok++;
        console.log(`  ✓ ${route}`);
      } catch (e) {
        console.warn(`  ✗ ${route} — ${e.message}`);
      } finally {
        await page.close();
      }
    }
  } finally {
    await browser.close();
    server.close();
  }
  // Safety net: any route that didn't fully prerender gets a browser-free SEO
  // shell (no-op for routes that did, so no duplicate tags).
  await ensureSeoShells(baseHtml, routes, cities);
  console.log(`\n✓ Prerendered ${ok}/${routes.length} routes into dist/`);
}

main();
