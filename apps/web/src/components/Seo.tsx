/**
 * SEO / document-metadata component.
 *
 * Relies on React 19's native metadata hoisting: <title>, <meta> and <link> rendered
 * anywhere in the tree are automatically moved into <head>. JSON-LD is emitted as an inline
 * <script type="application/ld+json"> (search engines read it from anywhere in the DOM).
 *
 * No external dependency required.
 */

export const SITE_URL = 'https://www.trulicares.com';
const DEFAULT_IMAGE = `${SITE_URL}/logo.png`;

interface SeoProps {
  title: string;
  description: string;
  /** Pathname only, e.g. "/for-facilities" (used for canonical + og:url). */
  path?: string;
  image?: string;
  /** og:type — "website" (default) or "article". */
  type?: string;
  /** One or more JSON-LD structured-data objects. */
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
  noindex?: boolean;
}

export default function Seo({
  title,
  description,
  path = '',
  image = DEFAULT_IMAGE,
  type = 'website',
  jsonLd,
  noindex,
}: SeoProps) {
  const url = `${SITE_URL}${path}`;
  const blocks = jsonLd ? (Array.isArray(jsonLd) ? jsonLd : [jsonLd]) : [];

  return (
    <>
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={url} />
      {noindex && <meta name="robots" content="noindex,nofollow" />}

      {/* Open Graph */}
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content={type} />
      <meta property="og:url" content={url} />
      <meta property="og:image" content={image} />
      <meta property="og:site_name" content="TruliCares" />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />

      {blocks.map((block, i) => (
        <script
          key={i}
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: JSON.stringify(block) }}
        />
      ))}
    </>
  );
}

/** Shared Organization schema — drop into the home page. */
export const organizationSchema: Record<string, unknown> = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'TruliCares',
  url: SITE_URL,
  logo: `${SITE_URL}/logo.png`,
  description:
    'TruliCares connects families and healthcare facilities with trusted, verified caregivers and licensed nursing professionals across the United States.',
  sameAs: [
    'https://www.facebook.com/trulicares',
    'https://twitter.com/trulicares',
    'https://www.instagram.com/trulicares',
    'https://www.linkedin.com/company/trulicares',
  ],
  contactPoint: {
    '@type': 'ContactPoint',
    contactType: 'customer support',
    email: 'support@trulicares.com',
    areaServed: 'US',
    availableLanguage: 'English',
  },
};
