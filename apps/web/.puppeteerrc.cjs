const { join } = require('node:path');

/**
 * Store Chromium inside the project (node_modules' sibling) so Vercel caches it with the
 * build and the prerender step can reliably find the browser. Without this, puppeteer
 * downloads to ~/.cache/puppeteer, which Vercel does not persist.
 * @type {import('puppeteer').Configuration}
 */
module.exports = {
  cacheDirectory: join(__dirname, '.cache', 'puppeteer'),
};
