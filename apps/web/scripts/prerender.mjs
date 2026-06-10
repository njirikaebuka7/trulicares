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

// ── Browser-free SEO fallback ────────────────────────────────────────────────
// Headless Chromium cannot always launch in CI/Vercel build containers. If
// prerendering is skipped or the homepage fails, we still inject the homepage's
// critical SEO tags into dist/index.html so crawlers (Bing, social, AI) never see
// a blank shell. Mirrors what <Seo> renders on the home route.
const SITE_URL = 'https://www.trulicares.com';
const HOME_TITLE = 'TruliCares — Find Trusted, Verified Caregivers & Healthcare Staffing';
const HOME_DESC =
  'TruliCares helps families find verified caregivers for child, senior, and adult care, and helps healthcare facilities hire licensed nursing professionals across the United States.';

function baselineHeadTags() {
  const org = {
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
  const website = {
    '@context': 'https://schema.org', '@type': 'WebSite', name: 'TruliCares', url: SITE_URL,
    potentialAction: {
      '@type': 'SearchAction', target: `${SITE_URL}/caregivers?search={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
  };
  return [
    `<title>${HOME_TITLE}</title>`,
    `<meta name="description" content="${HOME_DESC}" />`,
    `<link rel="canonical" href="${SITE_URL}/" />`,
    `<meta name="robots" content="index,follow" />`,
    `<meta property="og:title" content="${HOME_TITLE}" />`,
    `<meta property="og:description" content="${HOME_DESC}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:url" content="${SITE_URL}/" />`,
    `<meta property="og:image" content="${SITE_URL}/logo.png" />`,
    `<meta property="og:site_name" content="TruliCares" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${HOME_TITLE}" />`,
    `<meta name="twitter:description" content="${HOME_DESC}" />`,
    `<meta name="twitter:image" content="${SITE_URL}/logo.png" />`,
    `<script type="application/ld+json">${JSON.stringify(org)}</script>`,
    `<script type="application/ld+json">${JSON.stringify(website)}</script>`,
  ].join('\n    ');
}

// Ensures dist/index.html has a <title>. If prerendering already produced one,
// this is a no-op (so there's never a duplicate title); otherwise it injects the
// homepage baseline tags before </head>.
async function ensureHomepageSeo() {
  const file = join(dist, 'index.html');
  if (!existsSync(file)) return;
  let html = await readFile(file, 'utf8');
  if (/<title>/i.test(html)) return; // prerender succeeded — leave it alone
  html = html.replace(/<\/head>/i, `    ${baselineHeadTags()}\n  </head>`);
  await writeFile(file, html, 'utf8');
  console.log('  ↳ injected baseline homepage SEO into dist/index.html (browser-free fallback)');
}

// Routes to prerender. Skips API-driven (/resources) and interactive/auth flows.
function routesToPrerender() {
  const { cities } = JSON.parse(readFileSync(resolve(root, 'src/data/locations.json'), 'utf8'));
  const staticRoutes = [
    '/', '/about', '/services', '/for-facilities', '/for-professionals',
    '/locations', '/provide-care', '/contact', '/privacy-policy', '/terms', '/cookie-policy',
  ];
  return [...staticRoutes, ...cities.map((c) => `/care/${c.slug}`)];
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
    console.warn('  Injecting baseline homepage SEO so crawlers still get title/meta/JSON-LD.\n');
    await ensureHomepageSeo();
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
  // Safety net: if the homepage route itself failed, index.html could still be a
  // bare shell — inject the baseline so it's never naked for crawlers.
  await ensureHomepageSeo();
  console.log(`\n✓ Prerendered ${ok}/${routes.length} routes into dist/`);
}

main();
