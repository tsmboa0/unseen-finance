import type { MetadataRoute } from "next";
import { PRODUCT_SLUGS } from "@/components/unseen/site-content";
import { getSiteUrl } from "@/lib/site-config";

const STATIC_PATHS = [
  "",
  "/pricing",
  "/signup",
  "/auditor",
  "/redeem",
] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  const base = getSiteUrl();
  const now = new Date();

  const staticEntries: MetadataRoute.Sitemap = STATIC_PATHS.map((path) => ({
    url: `${base}${path}`,
    lastModified: now,
    changeFrequency: path === "" ? "weekly" : "monthly",
    priority: path === "" ? 1 : 0.75,
  }));

  const productEntries: MetadataRoute.Sitemap = PRODUCT_SLUGS.map((slug) => ({
    url: `${base}/products/${slug}`,
    lastModified: now,
    changeFrequency: "monthly" as const,
    priority: 0.65,
  }));

  return [...staticEntries, ...productEntries];
}
