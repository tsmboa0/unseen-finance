"use client";

import Link from "next/link";
import { m } from "framer-motion";
import type { ProductPageCopy } from "@/components/unseen/product-page/product-copy";
import type { ProductSlug } from "@/components/unseen/site-content";

type Props = {
  slug: ProductSlug;
  copy: ProductPageCopy;
  valueEyebrow: string;
  valueHeading: string;
};

const v = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0 },
};

export function ProductBelowFold({ slug, copy, valueEyebrow, valueHeading }: Props) {
  const sections = copy.sections;

  switch (slug) {
    case "gateway":
      return (
        <div className="product-below product-below--gateway">
          <section className="section-shell product-below__value">
            <m.div
              className="product-below__intro"
              initial={v.hidden}
              transition={{ duration: 0.45 }}
              viewport={{ amount: 0.35, once: true }}
              whileInView={v.show}
            >
              <p className="product-below__eyebrow">{valueEyebrow}</p>
              <h2 className="product-below__title">{valueHeading}</h2>
            </m.div>
            <ul className="product-below__card-grid">
              {copy.valueProps.map((text, i) => (
                <li className="glass-card product-below__value-card" key={text}>
                  <span className="product-below__value-kicker">0{i + 1}</span>
                  <p>{text}</p>
                </li>
              ))}
            </ul>
          </section>
          <section className="section-shell product-below__split-wrap">
            <div className="product-below__split-grid">
              {sections.map((section) => (
                <m.div
                  className="glass-card product-below__split-card"
                  initial={v.hidden}
                  key={section.title}
                  transition={{ duration: 0.45 }}
                  viewport={{ amount: 0.25, once: true }}
                  whileInView={v.show}
                >
                  <h2>{section.title}</h2>
                  <p>{section.body}</p>
                </m.div>
              ))}
            </div>
          </section>
        </div>
      );

    case "payroll":
      return (
        <div className="product-below product-below--payroll">
          <section className="section-shell product-below__value product-below__value--rail">
            <m.div
              className="product-below__intro product-below__intro--left"
              initial={v.hidden}
              transition={{ duration: 0.45 }}
              viewport={{ amount: 0.35, once: true }}
              whileInView={v.show}
            >
              <p className="product-below__eyebrow">{valueEyebrow}</p>
              <h2 className="product-below__title">{valueHeading}</h2>
            </m.div>
            <ol className="product-below__step-list">
              {copy.valueProps.map((text, i) => (
                <li className="product-below__step" key={text}>
                  <span className="product-below__step-num">{i + 1}</span>
                  <p>{text}</p>
                </li>
              ))}
            </ol>
          </section>
          {sections.map((section, idx) => (
            <section
              className={`section-shell product-below__band${idx % 2 === 1 ? " product-below__band--alt" : ""}`}
              key={section.title}
            >
              <m.div
                className="product-below__band-inner"
                initial={v.hidden}
                transition={{ duration: 0.45 }}
                viewport={{ amount: 0.3, once: true }}
                whileInView={v.show}
              >
                <h2>{section.title}</h2>
                <p>{section.body}</p>
              </m.div>
            </section>
          ))}
        </div>
      );

    case "x402":
      return (
        <div className="product-below product-below--x402">
          <section className="section-shell product-below__value">
            <m.div
              className="product-below__intro product-below__intro--mono"
              initial={v.hidden}
              transition={{ duration: 0.45 }}
              viewport={{ amount: 0.35, once: true }}
              whileInView={v.show}
            >
              <p className="product-below__eyebrow product-below__eyebrow--mono">{valueEyebrow}</p>
              <h2 className="product-below__title">{valueHeading}</h2>
            </m.div>
            <ul className="product-below__list-code">
              {copy.valueProps.map((text) => (
                <li key={text}>
                  <span aria-hidden className="product-below__prompt">
                    ~
                  </span>
                  {text}
                </li>
              ))}
            </ul>
          </section>
          <section className="section-shell product-below__terminal">
            <div className="product-below__terminal-chrome" aria-hidden>
              <span />
              <span />
              <span />
              <span className="product-below__terminal-title">handler.ts</span>
            </div>
            <div className="product-below__terminal-body">
              {sections.map((section) => (
                <div className="product-below__terminal-block" key={section.title}>
                  <h2>{section.title}</h2>
                  <p>{section.body}</p>
                </div>
              ))}
            </div>
          </section>
        </div>
      );

    case "storefronts":
      return (
        <div className="product-below product-below--storefronts">
          <section className="section-shell product-below__value">
            <m.div
              className="product-below__intro"
              initial={v.hidden}
              transition={{ duration: 0.45 }}
              viewport={{ amount: 0.35, once: true }}
              whileInView={v.show}
            >
              <p className="product-below__eyebrow">{valueEyebrow}</p>
              <h2 className="product-below__title">{valueHeading}</h2>
            </m.div>
            <ul className="product-below__shelf">
              {copy.valueProps.map((text) => (
                <li className="product-below__shelf-item" key={text}>
                  <span className="product-below__shelf-dot" aria-hidden />
                  {text}
                </li>
              ))}
            </ul>
          </section>
          <section className="section-shell product-below__magazine">
            {sections.map((section, idx) => (
              <m.article
                className={`product-below__magazine-col${idx === 1 ? " product-below__magazine-col--offset" : ""}`}
                initial={v.hidden}
                key={section.title}
                transition={{ duration: 0.45 }}
                viewport={{ amount: 0.25, once: true }}
                whileInView={v.show}
              >
                <h2>{section.title}</h2>
                <p>{section.body}</p>
              </m.article>
            ))}
          </section>
        </div>
      );

    case "tiplinks":
      return (
        <div className="product-below product-below--tiplinks">
          <section className="section-shell product-below__value">
            <m.div
              className="product-below__intro"
              initial={v.hidden}
              transition={{ duration: 0.45 }}
              viewport={{ amount: 0.35, once: true }}
              whileInView={v.show}
            >
              <p className="product-below__eyebrow">{valueEyebrow}</p>
              <h2 className="product-below__title">{valueHeading}</h2>
            </m.div>
            <ul className="product-below__tip-rows">
              {copy.valueProps.map((text) => (
                <li className="product-below__tip-row" key={text}>
                  <span className="product-below__tip-chev" aria-hidden>
                    ↗
                  </span>
                  {text}
                </li>
              ))}
            </ul>
          </section>
          <section className="section-shell product-below__narrow-stack">
            {sections.map((section) => (
              <m.div
                className="glass-card product-below__narrow-card"
                initial={v.hidden}
                key={section.title}
                transition={{ duration: 0.45 }}
                viewport={{ amount: 0.25, once: true }}
                whileInView={v.show}
              >
                <h2>{section.title}</h2>
                <p>{section.body}</p>
              </m.div>
            ))}
          </section>
        </div>
      );

    case "invoice":
      return (
        <div className="product-below product-below--invoice">
          <section className="section-shell product-below__value">
            <m.div
              className="product-below__intro product-below__intro--left"
              initial={v.hidden}
              transition={{ duration: 0.45 }}
              viewport={{ amount: 0.35, once: true }}
              whileInView={v.show}
            >
              <p className="product-below__eyebrow">{valueEyebrow}</p>
              <h2 className="product-below__title">{valueHeading}</h2>
            </m.div>
            <div className="product-below__ledger">
              {copy.valueProps.map((text) => (
                <div className="product-below__ledger-row" key={text}>
                  <span className="product-below__ledger-line" aria-hidden />
                  <p>{text}</p>
                </div>
              ))}
            </div>
          </section>
          <section className="section-shell product-below__invoice-prose">
            {sections.map((section) => (
              <m.div
                className="product-below__invoice-block"
                initial={v.hidden}
                key={section.title}
                transition={{ duration: 0.45 }}
                viewport={{ amount: 0.25, once: true }}
                whileInView={v.show}
              >
                <h2>{section.title}</h2>
                <p>{section.body}</p>
              </m.div>
            ))}
          </section>
        </div>
      );

    case "compliance":
      return (
        <div className="product-below product-below--compliance">
          <section className="section-shell product-below__value">
            <m.div
              className="product-below__intro"
              initial={v.hidden}
              transition={{ duration: 0.45 }}
              viewport={{ amount: 0.35, once: true }}
              whileInView={v.show}
            >
              <p className="product-below__eyebrow">{valueEyebrow}</p>
              <h2 className="product-below__title">{valueHeading}</h2>
            </m.div>
            <ul className="product-below__timeline">
              {copy.valueProps.map((text, i) => (
                <li className="product-below__timeline-item" key={text}>
                  <span className="product-below__timeline-node" aria-hidden />
                  <p>
                    <strong className="product-below__timeline-label">Point {i + 1}.</strong> {text}
                  </p>
                </li>
              ))}
            </ul>
          </section>
          <section className="section-shell product-below__compliance-lower">
            {sections.map((section) => (
              <m.div
                className="product-below__gov-block"
                initial={v.hidden}
                key={section.title}
                transition={{ duration: 0.45 }}
                viewport={{ amount: 0.25, once: true }}
                whileInView={v.show}
              >
                <h2>{section.title}</h2>
                <p>{section.body}</p>
              </m.div>
            ))}
            <aside className="glass-card product-below__auditor-callout">
              <p>
                <strong>External reviewers</strong> can use the loginless{" "}
                <Link href="/auditor">Auditor viewing-key report</Link> when they only need a bounded, reproducible PDF —
                alongside grants you issue from the Compliance dashboard.
              </p>
            </aside>
          </section>
        </div>
      );

    default:
      return null;
  }
}
