// Generates public/sitemap.xml from the static marketing routes + the programmatic
// location pages in src/data/locations.json. Pure Node — runs automatically on `prebuild`.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const SITE = 'https://trulicares.com';
const today = new Date().toISOString().slice(0, 10);

// [path, changefreq, priority]
const staticRoutes = [
  ['/', 'weekly', '1.0'],
  ['/services', 'monthly', '0.9'],
  ['/for-facilities', 'monthly', '0.9'],
  ['/for-professionals', 'monthly', '0.9'],
  ['/find-care', 'monthly', '0.8'],
  ['/provide-care', 'monthly', '0.8'],
  ['/locations', 'weekly', '0.8'],
  ['/about', 'monthly', '0.7'],
  ['/resources', 'weekly', '0.7'],
  ['/contact', 'yearly', '0.5'],
  ['/privacy-policy', 'yearly', '0.3'],
  ['/terms', 'yearly', '0.3'],
  ['/cookie-policy', 'yearly', '0.3'],
];

const { cities } = JSON.parse(readFileSync(resolve(root, 'src/data/locations.json'), 'utf8'));
const locationRoutes = cities.map((c) => [`/care/${c.slug}`, 'monthly', '0.7']);

const urls = [...staticRoutes, ...locationRoutes]
  .map(
    ([path, changefreq, priority]) =>
      `  <url>\n    <loc>${SITE}${path}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>${changefreq}</changefreq>\n    <priority>${priority}</priority>\n  </url>`
  )
  .join('\n');

const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;

writeFileSync(resolve(root, 'public/sitemap.xml'), xml, 'utf8');
console.log(`✓ sitemap.xml written with ${staticRoutes.length + locationRoutes.length} URLs`);
