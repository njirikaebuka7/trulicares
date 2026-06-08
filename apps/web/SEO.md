# SEO & Prerendering

## What's in place

- **Per-page metadata** via `src/components/Seo.tsx` (React 19 native `<title>`, `<meta>`, and `<link>`
  hoisting plus JSON-LD). Used on Home, About, Services, Resources, Contact, For-Facilities,
  For-Professionals, Locations, and every location landing page.
- **Structured data (JSON-LD):** Organization + WebSite (home), Service + BreadcrumbList
  (location pages), CollectionPage (locations directory).
- **Programmatic location pages:** `/care/:slug` (for example `/care/austin-tx`), generated from
  `src/data/locations.json`. A directory lives at `/locations`, linked from the footer
  (intentionally **not** in the main navbar). Add a city by adding one entry to
  `locations.json` and it is automatically picked up by the page, directory, and sitemap.
- **`robots.txt`** and **`sitemap.xml`** in `public/`. The sitemap is regenerated on every
  build by `scripts/generate-sitemap.mjs` (wired to the `prebuild` npm hook), so it always
  reflects the current routes and locations.

## Prerendering (static HTML for crawlers & social scrapers)

The app is a client-rendered SPA. Googlebot renders JS, but social scrapers (Facebook,
LinkedIn, Slack, X) and faster, more reliable indexing benefit from static HTML. The default
production `build` snapshots each public route into `dist/<route>/index.html` using headless
Chromium. That means crawlers can see the page content, canonical tag, meta description, and
JSON-LD before JavaScript runs.

```bash
# build + prerender
npm run build
```

This produces files like `dist/care/austin-tx/index.html` with full content plus metadata.
Static files take precedence over the SPA catch-all rewrite in `vercel.json`, so prerendered
routes serve their HTML and everything else falls back to client rendering.

### On Vercel

Use the normal `npm run build` command so public routes are prerendered during deploy. If
Chromium cannot launch in the build image, the script falls back to `@sparticuz/chromium` plus
`puppeteer-core`.

## Next steps for full national ranking

- Expand `locations.json` with more cities and states to create more long-tail landing pages.
- Submit `sitemap.xml` in Google Search Console and Bing Webmaster Tools.
- Set up a Google Business Profile.
- Consider migrating to Next.js or Vike for true SSR if the app outgrows snapshot prerendering.
