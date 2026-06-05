# SEO & Prerendering

## What's in place

- **Per-page metadata** via `src/components/Seo.tsx` (React 19 native `<title>`/`<meta>`/`<link>`
  hoisting + JSON-LD). Used on Home, About, Services, Resources, Contact, For-Facilities,
  For-Professionals, Locations, and every location landing page.
- **Structured data (JSON-LD):** Organization + WebSite (home), Service + BreadcrumbList
  (location pages), CollectionPage (locations directory).
- **Programmatic location pages:** `/care/:slug` (e.g. `/care/austin-tx`), generated from
  `src/data/locations.json`. A directory lives at `/locations`, linked from the footer
  (intentionally **not** in the main navbar). Add a city by adding one entry to
  `locations.json` — it's automatically picked up by the page, directory, and sitemap.
- **`robots.txt`** and **`sitemap.xml`** in `public/`. The sitemap is regenerated on every
  build by `scripts/generate-sitemap.mjs` (wired to the `prebuild` npm hook), so it always
  reflects the current routes + locations.

## Prerendering (static HTML for crawlers & social scrapers) — opt-in

The app is a client-rendered SPA. Googlebot renders JS, but social scrapers (Facebook,
LinkedIn, Slack, X) and faster/more-reliable indexing benefit from static HTML. The
`build:ssg` script snapshots each public route into `dist/<route>/index.html` using headless
Chromium — **no app refactor, works with any React/Router version.**

```bash
# one-time: install the headless browser (kept out of package.json so the default
# Vercel install stays light)
npm i -D puppeteer

# build + prerender
npm run build:ssg
```

This produces e.g. `dist/care/austin-tx/index.html` with full content + meta + JSON-LD.
Static files take precedence over the SPA catch-all rewrite in `vercel.json`, so prerendered
routes serve their HTML and everything else falls back to client rendering — **no vercel.json
change needed.**

### To enable on Vercel
Set the project's **Build Command** to `npm run build:ssg` and add `puppeteer` to
`devDependencies` (or an install step). If Chromium can't launch in the build image, switch to
`@sparticuz/chromium` + `puppeteer-core`. Until then, the default `npm run build` ships the
sitemap + client-rendered app exactly as before.

## Next steps for full national ranking
- Expand `locations.json` (more cities/states → more long-tail landing pages).
- Submit `sitemap.xml` in Google Search Console + Bing Webmaster Tools.
- Set up a Google Business Profile.
- Consider migrating to Next.js/Vike for true SSR if/when the app outgrows snapshot prerender.
