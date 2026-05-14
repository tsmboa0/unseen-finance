import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { SiteShell } from "@/components/unseen/site-shell";
import { UNSEEN_DOCS_URL } from "@/lib/docs-url";
import { defaultOpenGraphImages, defaultTwitterImages } from "@/lib/seo-sharing";

const DESCRIPTION =
  "Simple tiers for confidential commerce on Solana: Gateway, Storefronts, Tiplinks, Payroll, Invoice, x402, and Compliance — plus the standalone auditor tools at /auditor — devnet to mainnet with usage-aligned fees.";

export const metadata: Metadata = {
  title: "Pricing",
  description: DESCRIPTION,
  alternates: { canonical: "/pricing" },
  openGraph: {
    url: "/pricing",
    title: "Pricing · Unseen Finance",
    description: DESCRIPTION,
    type: "website",
    images: defaultOpenGraphImages(),
  },
  twitter: {
    card: "summary_large_image",
    title: "Pricing · Unseen Finance",
    description: DESCRIPTION,
    images: defaultTwitterImages(),
  },
};

const TIERS = [
  {
    name: "Build",
    price: "$0",
    detail: "for development & proofs of concept",
    body: "Ship on devnet with the same TypeScript SDK and APIs you use in production. Ideal for integrations, demos, and wallet flows before you cut mainnet volume.",
    bullets: [
      "Devnet API keys & dashboard access",
      "Gateway, x402, storefront, and payroll APIs within fair-use limits",
      "Community support via docs & Discord",
    ],
    cta: { label: "Read the docs", href: UNSEEN_DOCS_URL, external: true },
    secondary: { label: "Request beta access", href: "/signup", external: false },
    featured: false,
  },
  {
    name: "Operate",
    price: "Usage-based",
    detail: "aligned to settled private volume",
    body:
      "When you route real customer or treasury flows on mainnet, pricing follows outcomes: shielded settlement through Gateway, storefront checkout, invoices, payroll runs, and paid API sessions (x402) — not seat-count theater.",
    bullets: [
      "Success-aligned fees on confirmed shielded settlement (see docs for current basis points & floors)",
      "Tiplinks & gift cards: issue and redeem within the same merchant workspace",
      "Email support & escalation path for production merchants",
    ],
    cta: { label: "Start integrating", href: UNSEEN_DOCS_URL, external: true },
    secondary: { label: "View products", href: "/#explore-products", external: false },
    featured: true,
  },
  {
    name: "Institution",
    price: "Custom",
    detail: "auditor workflows & governance-heavy teams",
    body:
      "For treasuries that need Umbra-scoped viewing keys, grant lifecycle, disclosure PDFs, and public auditor report exports — plus the throughput and review windows your policy team expects.",
    bullets: [
      "Compliance product & dashboard — grants, scoped keys, disclosure PDFs (see /products/compliance)",
      "Higher limits, SLAs, and security review support",
      "Optional procurement-friendly terms & vendor questionnaires",
    ],
    cta: { label: "Talk to us", href: "mailto:hello@unseen.finance", external: true },
    secondary: { label: "Open Auditor workspace", href: "/auditor", external: false },
    featured: false,
  },
] as const;

const METERED = [
  "Private card & wallet checkout (Gateway) — per successful settlement",
  "Hosted storefront & catalog — tied to checkout volume you actually clear",
  "Payroll batches — per executed run or per paid recipient (your workspace contract)",
  "HTTP 402 API access (x402) — metered on verified payment sessions",
  "Invoices & Tiplinks / gift cards — issuance and redemption within pooled merchant limits",
] as const;

export default function PricingPage() {
  return (
    <SiteShell footerMode="default">
      <main className="pricing-page">
        <div className="aurora-backdrop aurora-backdrop--subpage">
          <div className="aurora-backdrop__layer aurora-backdrop__layer--one" />
          <div className="aurora-backdrop__layer aurora-backdrop__layer--two" />
          <div className="aurora-backdrop__layer aurora-backdrop__layer--three" />
          <div className="aurora-backdrop__vignette" />
        </div>

        <section className="pricing-page__hero section-shell">
          <p className="pricing-page__eyebrow">Pricing</p>
          <h1>Confidential commerce, priced like infrastructure.</h1>
          <p className="pricing-page__lead">
            Unseen wraps Umbra shielded settlement, merchant APIs, and dashboard workflows — Gateway, Storefronts,
            Payroll, Invoice, Tiplinks & gift cards, x402, and Compliance. The public <Link href="/auditor">Auditor</Link>{" "}
            workspace is for institutional review flows that sit alongside your merchant stack.
          </p>
        </section>

        <section className="section-shell pricing-page__tiers-wrap">
          <div className="pricing-page__grid">
            {TIERS.map((tier) => (
              <div
                className={`pricing-page__tier glass-card${tier.featured ? " pricing-page__tier--featured" : ""}`}
                key={tier.name}
              >
                {tier.featured ? <span className="pricing-page__ribbon">Most teams</span> : null}
                <h2>{tier.name}</h2>
                <p className="pricing-page__price">{tier.price}</p>
                <p className="pricing-page__detail">{tier.detail}</p>
                <p className="pricing-page__body">{tier.body}</p>
                <ul className="pricing-page__bullets">
                  {tier.bullets.map((b) => (
                    <li key={b}>
                      <Check aria-hidden className="pricing-page__check" size={16} strokeWidth={2.5} />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
                <div className="pricing-page__tier-actions">
                  {tier.cta.external ? (
                    <a className="primary-link" href={tier.cta.href} rel="noopener noreferrer" target="_blank">
                      <span className="primary-link__label">{tier.cta.label}</span>
                      <ArrowRight aria-hidden className="button-arrow" size={16} />
                    </a>
                  ) : (
                    <Link className="primary-link" href={tier.cta.href}>
                      <span className="primary-link__label">{tier.cta.label}</span>
                      <ArrowRight aria-hidden className="button-arrow" size={16} />
                    </Link>
                  )}
                  {tier.secondary.external ? (
                    <a className="ghost-link" href={tier.secondary.href} rel="noopener noreferrer" target="_blank">
                      {tier.secondary.label}
                    </a>
                  ) : (
                    <Link className="ghost-link" href={tier.secondary.href}>
                      {tier.secondary.label}
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="section-shell pricing-page__meter">
          <div className="pricing-page__meter-inner glass-card">
            <h2>What “usage” means here</h2>
            <p className="pricing-page__meter-lead">
              We align fees to products that move value or unlock access — shielded Solana settlement, executed payroll,
              paid API sessions, and auditor tooling — so your bill grows with throughput and outcomes, not vanity
              dashboards.
            </p>
            <ul className="pricing-page__meter-list">
              {METERED.map((line) => (
                <li key={line}>
                  <Check aria-hidden className="pricing-page__check" size={18} strokeWidth={2.5} />
                  {line}
                </li>
              ))}
            </ul>
            <p className="pricing-page__note">
              Exact basis points, minimums, and beta allowances are published in the documentation and may vary by
              network and mint. Solana base fees pass through; Umbra proof and relayer costs sit where the docs specify
              for your integration path.
            </p>
            <Link className="primary-link pricing-page__docs-cta" href={UNSEEN_DOCS_URL} rel="noopener noreferrer" target="_blank">
              <span className="primary-link__label">Open pricing details in docs</span>
              <ArrowRight aria-hidden className="button-arrow" size={16} />
            </Link>
          </div>
        </section>
      </main>
    </SiteShell>
  );
}
