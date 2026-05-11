/** Absolute site URL for checkout/PDF links (no trailing slash). */
export function appBaseUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "");
  if (explicit) return explicit;
  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) return vercel.startsWith("http") ? vercel.replace(/\/$/, "") : `https://${vercel.replace(/\/$/, "")}`;
  const checkout = process.env.CHECKOUT_BASE_URL?.trim().replace(/\/$/, "");
  if (checkout) return checkout;
  return "http://localhost:3000";
}
