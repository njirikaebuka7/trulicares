// Opt-in static prerendering (SSG-style) for SEO.
//
// After `vite build`, this serves dist/ locally, loads each public route in headless
// Chromium, and writes the fully-rendered HTML back to dist/<route>/index.html. Crawlers and
// social scrapers then get complete HTML (content + meta + JSON-LD) without executing JS.
//
// Requires puppeteer (kept OUT of the default install so the normal Vercel build stays light):
//     npm i -D puppeteer
// Then build with:
//     npm run build:ssg
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

const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon', '.woff': 'font/woff', '.woff2': 'font/woff2', '.webp': 'image/webp',
  '.xml': 'application/xml', '.txt': 'text/plain',
};

// Routes to prerender. Skips API-driven (/resources) and interactive/auth flows.
function routesToPrerender() {
  const { cities } = JSON.parse(readFileSync(resolve(root, 'src/data/locations.json'), 'utf8'));
  const staticRoutes = [
    '/', '/about', '/services', '/for-facilities', '/for-professionals',
    '/locations', '/provide-care', '/contact', '/privacy-policy', '/terms', '/cookie-policy',
  ];
  return [...staticRoutes, ...cities.map((c) => `/care/${c.slug}`)];
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
  // Locally, use full puppeteer. ANY launch failure is non-fatal: we warn and let the build
  // succeed (the site still ships client-rendered, with per-page meta + sitemap).
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
      browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    }
  } catch (e) {
    console.warn(`\n⚠ Prerender skipped — could not launch headless Chromium: ${e.message}`);
    console.warn('  Build continues; the site ships client-rendered with per-page meta + sitemap.\n');
    process.exit(0);
  }

  const server = await startServer();

  let ok = 0;
  try {
    for (const route of routes) {
      const page = await browser.newPage();
      try {
        await page.goto(`http://localhost:${PORT}${route}`, { waitUntil: 'networkidle0', timeout: 30000 });
        // Give React 19 a tick to hoist <title>/<meta> into <head>.
        await new Promise((r) => setTimeout(r, 250));
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
  console.log(`\n✓ Prerendered ${ok}/${routes.length} routes into dist/`);
}

main();
