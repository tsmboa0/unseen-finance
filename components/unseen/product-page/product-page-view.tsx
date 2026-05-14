"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ProductBelowFold } from "@/components/unseen/product-page/product-below-fold";
import { ProductCodeDisplay } from "@/components/unseen/product-page/code-display";
import { PRODUCT_PAGE_COPY } from "@/components/unseen/product-page/product-copy";
import { PRODUCT_PAGE_UI } from "@/components/unseen/product-page/product-page-ui";
import {
  PRODUCT_CODE_FILE_LABEL,
  PRODUCT_CODE_SNIPPETS,
  type SdkProductSlug,
} from "@/components/unseen/product-page/product-code-snippets";
import { ProductDemo } from "@/components/unseen/product-page/product-demos";
import { SiteShell } from "@/components/unseen/site-shell";
import { productPages, type ProductSlug } from "@/components/unseen/site-content";
import { UNSEEN_DOCS_URL } from "@/lib/docs-url";

function sdkSlugFromProduct(slug: ProductSlug): SdkProductSlug | null {
  return slug === "gateway" || slug === "x402" ? slug : null;
}

export function ProductPageView({ slug }: { slug: ProductSlug }) {
  const product = productPages[slug];
  const copy = PRODUCT_PAGE_COPY[slug];
  const ui = PRODUCT_PAGE_UI[slug];
  const sdkSlug = sdkSlugFromProduct(slug);
  const showSdkSection = sdkSlug !== null;
  const codeLines = sdkSlug ? PRODUCT_CODE_SNIPPETS[sdkSlug] : null;
  const codeFile = sdkSlug ? PRODUCT_CODE_FILE_LABEL[sdkSlug] : null;

  return (
    <SiteShell footerMode="default">
      <main className={`product-detail-page product-detail-page--${slug}`}>
        <div className="aurora-backdrop aurora-backdrop--subpage">
          <div className="aurora-backdrop__layer aurora-backdrop__layer--one" />
          <div className="aurora-backdrop__layer aurora-backdrop__layer--two" />
          <div className="aurora-backdrop__layer aurora-backdrop__layer--three" />
          <div className="aurora-backdrop__vignette" />
        </div>

        <section className="section-shell product-detail-page__hero-shell">
          <div className="product-detail-page__hero">
            <p className="product-detail-page__eyebrow">{product.label}</p>
            <h1>{product.title}</h1>
            <p className="product-detail-page__subhead">{copy.subhead}</p>
            <p className="product-detail-page__lead">{copy.lead}</p>
          </div>

          <div className={`product-detail-page__demo-wrap product-detail-page__demo-wrap--${slug}`}>
            <div className="glass-card product-detail-page__demo-card">
              <div className={`card-demo product-detail-page__demo-inner product-detail-page__demo-inner--${slug}`}>
                <ProductDemo slug={slug} />
              </div>
            </div>
          </div>
        </section>

        <ProductBelowFold
          copy={copy}
          slug={slug}
          valueEyebrow={ui.valueEyebrow}
          valueHeading={ui.valueHeading}
        />

        {showSdkSection && codeLines && codeFile ? (
          <section
            className={`section-shell product-detail-page__code-section product-detail-page__code-section--sdk product-detail-page__code-section--${slug}`}
          >
            <div className="section-copy section-copy--center">
              <p className="section-copy__eyebrow">{ui.sdkEyebrow}</p>
              <h2>{ui.sdkHeading}</h2>
              <p className="product-detail-page__code-intro">{ui.sdkIntro}</p>
            </div>

            <div className="code-panel product-detail-page__sdk-panel">
              <div className="code-panel__chrome">
                <div className="code-panel__dots">
                  <span />
                  <span />
                  <span />
                </div>
                <div className="code-panel__tabs">
                  <span className="code-panel__tab is-active" tabIndex={-1}>
                    {codeFile}
                  </span>
                </div>
              </div>
              <div className="code-panel__body">
                <ProductCodeDisplay lines={codeLines} />
              </div>
            </div>

            <div className="product-detail-page__actions">
              <Link
                className="developer-docs-cta product-detail-page__docs-cta"
                href={UNSEEN_DOCS_URL}
                rel="noopener noreferrer"
                target="_blank"
              >
                <span>$ unseen docs open</span>
                <span className="developer-docs-cta__icon">→</span>
              </Link>
              <Link className="ghost-link product-detail-page__ghost" href="/pricing">
                View pricing
              </Link>
              <Link className="ghost-link product-detail-page__ghost" href="/#explore-products">
                All products
              </Link>
            </div>
          </section>
        ) : (
          <section
            className={`section-shell product-detail-page__code-section product-detail-page__code-section--no-sdk product-detail-page__code-section--${slug}`}
          >
            <div className="section-copy section-copy--center">
              <p className="section-copy__eyebrow">{ui.goDeeperEyebrow}</p>
              <h2>{ui.goDeeperHeading}</h2>
              <p className="product-detail-page__code-intro">{ui.goDeeperIntro}</p>
            </div>
            <div className="product-detail-page__actions">
              <Link
                className="developer-docs-cta product-detail-page__docs-cta"
                href={UNSEEN_DOCS_URL}
                rel="noopener noreferrer"
                target="_blank"
              >
                <span>$ unseen docs open</span>
                <span className="developer-docs-cta__icon">→</span>
              </Link>
              <Link className="ghost-link product-detail-page__ghost" href="/pricing">
                View pricing
              </Link>
              <Link className="ghost-link product-detail-page__ghost" href="/#explore-products">
                All products
              </Link>
            </div>
          </section>
        )}

        <section className="section-shell product-detail-page__footer-cta">
          <div className={`glass-card product-detail-page__footer-card product-detail-page__footer-card--${slug}`}>
            <h3>{ui.footerTitle}</h3>
            <p>{ui.footerLead}</p>
            <div className="product-detail-page__footer-actions">
              <Link
                className="primary-link"
                href={UNSEEN_DOCS_URL}
                rel="noopener noreferrer"
                target="_blank"
              >
                <span className="primary-link__label">Open documentation</span>
                <ArrowRight aria-hidden="true" className="button-arrow" size={16} />
              </Link>
              <Link className="hero-docs-link" href="/">
                Back to home
              </Link>
            </div>
          </div>
        </section>
      </main>
    </SiteShell>
  );
}
