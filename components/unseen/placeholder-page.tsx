"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { SiteShell } from "@/components/unseen/site-shell";

export function PlaceholderPage({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <SiteShell footerMode="compact">
      <main className="placeholder-page">
        <div className="aurora-backdrop aurora-backdrop--subpage">
          <div className="aurora-backdrop__layer aurora-backdrop__layer--one" />
          <div className="aurora-backdrop__layer aurora-backdrop__layer--two" />
          <div className="aurora-backdrop__layer aurora-backdrop__layer--three" />
          <div className="aurora-backdrop__vignette" />
        </div>

        <section className="placeholder-page__hero">
          <div className="placeholder-page__eyebrow">{eyebrow}</div>
          <h1>{title}</h1>
          <p>{description}</p>

          <div className="placeholder-page__actions">
            <Link className="primary-link" href="/signup">
              <span className="primary-link__label">Start Building</span>
              <ArrowRight aria-hidden="true" className="button-arrow" size={16} />
            </Link>
            <Link className="ghost-link" href="/">
              Back to home
            </Link>
          </div>

          <div className="placeholder-page__card glass-card">
            <p className="placeholder-page__card-title">Coming soon</p>
            <p className="placeholder-page__card-copy">
              The full experience for this route is in active development.
            </p>
          </div>
        </section>
      </main>
    </SiteShell>
  );
}
