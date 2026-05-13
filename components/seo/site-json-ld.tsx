import {
  DEFAULT_DESCRIPTION,
  SEO_ASSETS,
  SITE_NAME,
  getSiteUrl,
} from "@/lib/site-config";

/** Organization + WebSite structured data for rich results. */
export function SiteJsonLd() {
  const base = getSiteUrl();
  const payload = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${base}/#organization`,
        name: SITE_NAME,
        description: DEFAULT_DESCRIPTION,
        url: base,
        logo: `${base}${SEO_ASSETS.logo}`,
      },
      {
        "@type": "WebSite",
        "@id": `${base}/#website`,
        name: SITE_NAME,
        description: DEFAULT_DESCRIPTION,
        url: base,
        publisher: { "@id": `${base}/#organization` },
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(payload) }}
    />
  );
}
