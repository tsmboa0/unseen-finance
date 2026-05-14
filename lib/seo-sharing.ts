import { getSiteUrl, SEO_ASSETS, SITE_NAME, SITE_TAGLINE } from "./site-config";

/** Matches Next.js Open Graph image objects (subset). */
export type OpenGraphImageItem = {
  url: string | URL;
  secureUrl?: string | URL;
  alt?: string;
  type?: string;
  width?: number | string;
  height?: number | string;
};

/** Absolute hero URL for previews (OG / Twitter / WhatsApp). */
export function sharingHeroUrl(): string {
  return `${getSiteUrl()}${SEO_ASSETS.ogDefault}`;
}

/** Default OG images — spread into any segment that exports its own `openGraph` (Next replaces parent OG entirely). */
export function defaultOpenGraphImages(): OpenGraphImageItem[] {
  return [
    {
      url: sharingHeroUrl(),
      width: 1200,
      height: 630,
      alt: `${SITE_NAME} — ${SITE_TAGLINE}`,
    },
  ];
}

/** Default Twitter large-card image URLs. */
export function defaultTwitterImages(): string[] {
  return [sharingHeroUrl()];
}
