const { join } = require('node:path');

/**
 * Puppeteer config.
 *
 * - Locally: download Chromium into a project-local .cache dir (so `npm run build:ssg` works
 *   on your machine).
 * - On Vercel: skip the heavy Chromium download entirely — the prerender step uses
 *   @sparticuz/chromium + puppeteer-core there instead (full puppeteer's bundled Chromium
 *   can't launch on Vercel's build image).
 *
 * @type {import('puppeteer').Configuration}
 */
module.exports = {
  cacheDirectory: join(__dirname, '.cache', 'puppeteer'),
  skipDownload: !!process.env.VERCEL,
};
