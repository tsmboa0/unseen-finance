/**
 * When set (e.g. `store.unseen.finance`), storefronts are exposed at
 * `https://{slug}.{NEXT_PUBLIC_STORE_BASE_HOST}/` via middleware rewrite.
 * When unset, use path URLs on the current origin: `/store/{slug}`.
 */
export function getStorefrontBaseHost(): string | null {
  const h = process.env.NEXT_PUBLIC_STORE_BASE_HOST?.trim();
  return h && h.length > 0 ? h : null;
}

/** Canonical home URL for a storefront (trailing slash). Safe in client components. */
export function getStorefrontHomeUrl(slug: string): string {
  const enc = encodeURIComponent(slug);
  const base = getStorefrontBaseHost();
  if (typeof window === "undefined") {
    if (base) return `https://${slug}.${base}/`;
    return `/store/${enc}`;
  }
  if (!base) {
    return `${window.location.origin}/store/${enc}`;
  }
  const protocol = window.location.protocol;
  const port = window.location.port ? `:${window.location.port}` : "";
  return `${protocol}//${slug}.${base}${port}/`;
}

/** Canonical public hostname+path for labels (stable for SSR; always https when using subdomain). */
export function getStorefrontPublicLabel(slug: string): string {
  const base = getStorefrontBaseHost();
  const enc = encodeURIComponent(slug);
  if (!base) {
    return `/store/${enc}`;
  }
  return `https://${slug}.${base}`;
}
