"use client";

import Link from "next/link";

/** Public asset path. On-screen size is set in CSS — see `app/globals.css` (`.unseen-logo__img`), `app/pay/[paymentId]/checkout-client.tsx` (inline `<style>`), `app/store/[slug]/storefront.css`. */
export const UNSEEN_LOGO_DARK_SRC = "/unseen-logo-dark.png";

export function UnseenLogo({
  compact = false,
  href = "/",
}: {
  compact?: boolean;
  href?: string;
}) {
  return (
    <Link
      aria-label="Unseen Finance home"
      className={`unseen-logo ${compact ? "unseen-logo--compact" : ""}`}
      data-cursor-hover="true"
      href={href}
    >
      <img
        src={UNSEEN_LOGO_DARK_SRC}
        alt=""
        className="unseen-logo__img"
      />
    </Link>
  );
}
