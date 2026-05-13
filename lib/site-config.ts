/**
 * Canonical site URL for metadata, OG tags, sitemap, and JSON-LD.
 * Override per deployment with NEXT_PUBLIC_SITE_URL (no trailing slash).
 */
export function getSiteUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (raw) return raw.replace(/\/$/, "");
  return "https://unseen.finance";
}

export const SITE_NAME = "Unseen Finance";

export const SITE_TAGLINE = "The gateway to confidential finance on Solana.";

export const DEFAULT_DESCRIPTION =
  "Shielded payments, payroll, and commerce on Solana — built for merchants and builders who need confidential settlement without sacrificing UX.";

/** Paths resolved against metadataBase (same files at https://unseen.finance/...). */
export const SEO_ASSETS = {
  ogDefault: "/unseen-hero-section.png",
  logo: "/unseen-logo-dark.png",
  icon: "/icon.png",
  appleTouchIcon: "/apple-icon.png",
} as const;
