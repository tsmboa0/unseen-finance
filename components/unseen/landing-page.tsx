"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  EyeOff,
  Lock,
  Zap,
} from "lucide-react";
import {
  animate,
  m,
  useInView,
  useMotionValue,
  useReducedMotion,
  useTransform,
} from "framer-motion";
import {
  type ComponentType,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";
import { SiteShell } from "@/components/unseen/site-shell";
import { usePrivy } from "@privy-io/react-auth";

const HeroPhones = dynamic(() => import("@/components/unseen/hero-phones"), {
  ssr: false,
  loading: () => <div className="hero-carousel hero-carousel--loading" />,
});
const GatewayDemo = dynamic(
  () => import("@/components/unseen/demos/gateway-demo"),
  {
    ssr: false,
    loading: () => <DemoLoading />,
  },
);
const PayrollDemo = dynamic(
  () => import("@/components/unseen/demos/payroll-demo"),
  {
    ssr: false,
    loading: () => <DemoLoading />,
  },
);
const X402Demo = dynamic(() => import("@/components/unseen/demos/x402-demo"), {
  ssr: false,
  loading: () => <DemoLoading />,
});
const StorefrontDemo = dynamic(
  () => import("@/components/unseen/demos/storefront-demo"),
  {
    ssr: false,
    loading: () => <DemoLoading />,
  },
);
const TiplinkDemo = dynamic(
  () => import("@/components/unseen/demos/tiplink-demo"),
  {
    ssr: false,
    loading: () => <DemoLoading />,
  },
);
const ComplianceDemo = dynamic(
  () => import("@/components/unseen/demos/compliance-demo"),
  {
    ssr: false,
    loading: () => <DemoLoading />,
  },
);
const InvoiceDemo = dynamic(
  () => import("@/components/unseen/demos/invoice-demo"),
  {
    ssr: false,
    loading: () => <DemoLoading />,
  },
);

type TabId = "gateway" | "x402";

const TIMING = {
  eyebrow: 900,
  heading: 1000,
  subheading: 1200,
  actions: 1400,
  scene: 1600,
  stats: 1800,
} as const;

type DemoComponent = ComponentType<{ active?: boolean; large?: boolean }>;

type ProductCard = {
  slug: string;
  overline: string;
  title: string;
  className: string;
  Demo: DemoComponent;
};

const productRows: ProductCard[][] = [
  [
    {
      slug: "gateway",
      overline: "UNSEEN GATEWAY",
      title: "Accept payments with zero exposure",
      className: "product-card--gateway",
      Demo: GatewayDemo as DemoComponent,
    },
    {
      slug: "payroll",
      overline: "UNSEEN PAYROLL",
      title: "Pay your team. Leave no trace.",
      className: "product-card--payroll",
      Demo: PayrollDemo as DemoComponent,
    },
  ],
  [
    {
      slug: "x402",
      overline: "UNSEEN x402",
      title: "Monetize APIs and content on-chain",
      className: "product-card--x402",
      Demo: X402Demo as DemoComponent,
    },
    {
      slug: "storefronts",
      overline: "UNSEEN STOREFRONTS",
      title: "Launch a privacy-native storefront in minutes",
      className: "product-card--storefronts",
      Demo: StorefrontDemo as DemoComponent,
    },
  ],
  [
    {
      slug: "tiplinks",
      overline: "TIPLINKS & GIFT CARDS",
      title: "Send value anonymously. Gift privately.",
      className: "product-card--tiplinks",
      Demo: TiplinkDemo as DemoComponent,
    },
    {
      slug: "invoice",
      overline: "UNSEEN INVOICE",
      title: "Invoice clients. Get paid privately.",
      className: "product-card--invoice",
      Demo: InvoiceDemo as DemoComponent,
    },
    {
      slug: "compliance",
      overline: "UNSEEN COMPLIANCE",
      title: "Full privacy. Full compliance.",
      className: "product-card--compliance",
      Demo: ComplianceDemo as DemoComponent,
    },
  ],
];

const codeTabs = [
  {
    id: "gateway" as const,
    label: "gateway.ts",
    eyebrow: "Payment Gateway — Accept privately",
    demo: <GatewayDemo large />,
  },
  {
    id: "x402" as const,
    label: "x402.ts",
    eyebrow: "x402 — Monetize APIs on-chain",
    demo: <X402Demo large />,
  },
] as const;

type CodeToken = {
  className?: string;
  text: string;
};

const codeSnippets: Record<TabId, CodeToken[][]> = {
  gateway: [
    [
      { className: "code-keyword", text: "import" },
      { text: " { " },
      { className: "code-function", text: "UnseenGateway" },
      { text: " } " },
      { className: "code-keyword", text: "from" },
      { text: " " },
      { className: "code-string", text: "'@unseen-finance/sdk'" },
      { text: ";" },
    ],
    [{ text: "" }],
    [
      { className: "code-keyword", text: "const" },
      { text: " " },
      { className: "code-function", text: "gateway" },
      { text: " = " },
      { className: "code-keyword", text: "new" },
      { text: " " },
      { className: "code-function", text: "UnseenGateway" },
      { text: "({" },
    ],
    [
      { text: "  merchantId: " },
      { className: "code-string", text: "'mer_7xKP3mR2'" },
      { text: "," },
    ],
    [
      { text: "  privacy: " },
      { className: "code-string", text: "'shielded'" },
      { text: "," },
    ],
    [
      { text: "  network: " },
      { className: "code-string", text: "'mainnet-beta'" },
      { text: "," },
    ],
    [{ text: "});" }],
    [{ text: "" }],
    [{ className: "code-comment", text: "// Create a payment session" }],
    [
      { className: "code-keyword", text: "const" },
      { text: " " },
      { className: "code-function", text: "session" },
      { text: " = " },
      { className: "code-keyword", text: "await" },
      { text: " gateway." },
      { className: "code-function", text: "createSession" },
      { text: "({" },
    ],
    [
      { text: "  amount: " },
      { className: "code-number", text: "2.4" },
      { text: "," },
    ],
    [
      { text: "  currency: " },
      { className: "code-string", text: "'SOL'" },
      { text: "," },
    ],
    [
      { text: "  metadata: { orderId: " },
      { className: "code-string", text: "'order_882'" },
      { text: " }," },
    ],
    [{ text: "  onSuccess: (receipt) => {" }],
    [
      {
        className: "code-comment",
        text: "    // receipt.txHash - publicly verifiable",
      },
    ],
    [
      {
        className: "code-comment",
        text: "    // receipt.amount - shielded on-chain",
      },
    ],
    [
      { text: "    console." },
      { className: "code-function", text: "log" },
      { text: "(" },
      { className: "code-string", text: "'Proof:'" },
      { text: ", receipt.shieldProof);" },
    ],
    [{ text: "  }," }],
    [{ text: "});" }],
    [{ text: "" }],
    [{ className: "code-comment", text: "// Render checkout UI" }],
    [
      { text: "gateway." },
      { className: "code-function", text: "render" },
      { text: "(" },
      { className: "code-string", text: "'#checkout-container'" },
      { text: ", session);" },
    ],
  ],
  x402: [
    [
      { className: "code-keyword", text: "import" },
      { text: " { " },
      { className: "code-function", text: "UnseenX402" },
      { text: " } " },
      { className: "code-keyword", text: "from" },
      { text: " " },
      { className: "code-string", text: "'@unseen-finance/sdk'" },
      { text: ";" },
    ],
    [{ text: "" }],
    [{ className: "code-comment", text: "// Middleware for Next.js API routes" }],
    [
      { className: "code-keyword", text: "export const" },
      { text: " " },
      { className: "code-function", text: "withPaywall" },
      { text: " = UnseenX402." },
      { className: "code-function", text: "middleware" },
      { text: "({" },
    ],
    [
      { text: "  amount: " },
      { className: "code-number", text: "0.1" },
      { text: "," },
    ],
    [
      { text: "  currency: " },
      { className: "code-string", text: "'SOL'" },
      { text: "," },
    ],
    [
      { text: "  recipient: " },
      { className: "code-string", text: "'merchant.sol'" },
      { text: "," },
    ],
    [
      { text: "  privacy: " },
      { className: "code-string", text: "'shielded'" },
      { text: "," },
    ],
    [{ text: "});" }],
    [{ text: "" }],
    [{ className: "code-comment", text: "// In your API route:" }],
    [
      { className: "code-keyword", text: "export default" },
      { text: " " },
      { className: "code-function", text: "withPaywall" },
      { text: "(" },
      { className: "code-keyword", text: "async" },
      { text: " (req, res) => {" },
    ],
    [
      {
        className: "code-comment",
        text: "  // This handler only runs after payment verified",
      },
    ],
    [
      { text: "  " },
      { className: "code-keyword", text: "const" },
      { text: " " },
      { className: "code-function", text: "data" },
      { text: " = " },
      { className: "code-keyword", text: "await" },
      { text: " " },
      { className: "code-function", text: "fetchPremiumData" },
      { text: "();" },
    ],
    [
      { text: "  res." },
      { className: "code-function", text: "json" },
      { text: "({ data, paid: true });" },
    ],
    [{ text: "});" }],
    [{ className: "code-comment", text: "// Payment receipt is shielded." }],
    [
      {
        className: "code-comment",
        text: "// Access is instant after on-chain verification.",
      },
    ],
  ],
};

/* ─────────────────────────────────────────────────────────
 * PAGE CONTENT STORYBOARD
 *
 * Static shell (cursor, nav, footer) never re-animates.
 * Hero content and below-fold sections cascade in on mount.
 *
 *  900ms   eyebrow reveals + pulse chip
 * 1000ms   hero heading settles in
 * 1200ms   supporting copy fades up
 * 1400ms   CTA row enters
 * 1600ms   Three.js scene fades in
 * 1800ms   stats band slides up
 * ───────────────────────────────────────────────────────── */

export function LandingPage() {
  const reducedMotion = useReducedMotion();
  const [stage, setStage] = useState(0);
  const [activeTab, setActiveTab] = useState<TabId>("gateway");
  const [activeRow, setActiveRow] = useState<number>(-1);
  const { login } = usePrivy();

  useEffect(() => {
    const timers = [
      window.setTimeout(() => setStage(1), TIMING.eyebrow),
      window.setTimeout(() => setStage(2), TIMING.heading),
      window.setTimeout(() => setStage(3), TIMING.subheading),
      window.setTimeout(() => setStage(4), TIMING.actions),
      window.setTimeout(() => setStage(5), TIMING.scene),
      window.setTimeout(() => setStage(6), TIMING.stats),
    ];

    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, []);

  useEffect(() => {
    const panels = Array.from(
      document.querySelectorAll<HTMLElement>("[data-demo-panel]"),
    );

    if (panels.length === 0) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

        if (visible?.target instanceof HTMLElement) {
          const next = visible.target.dataset.demoPanel as TabId | undefined;

          if (next) {
            setActiveTab(next);
          }
        }
      },
      {
        threshold: [0.35, 0.5, 0.7],
        rootMargin: "-15% 0px -25% 0px",
      },
    );

    panels.forEach((panel) => observer.observe(panel));
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (reducedMotion) {
      setActiveRow(0);
      return;
    }

    const rows = Array.from(
      document.querySelectorAll<HTMLElement>("[data-product-row]"),
    );

    if (rows.length === 0) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

        if (visible?.target instanceof HTMLElement) {
          const raw = visible.target.dataset.productRow;
          const index = raw === undefined ? NaN : Number(raw);

          if (!Number.isNaN(index)) {
            setActiveRow(index);
          }
        }
      },
      {
        threshold: [0.2, 0.4, 0.6, 0.8],
        rootMargin: "-15% 0px -20% 0px",
      },
    );

    rows.forEach((row) => observer.observe(row));
    return () => observer.disconnect();
  }, [reducedMotion]);

  return (
    <SiteShell>
      <main className="landing-page">
        <AuroraBackdrop />

        <section className="hero-section">
          <div className="hero-grid">
            <div className="hero-copy">
              <m.div
                animate={{
                  opacity: stage >= 1 ? 1 : 0,
                  y: stage >= 1 ? 0 : 20,
                }}
                className="hero-eyebrow"
                transition={{ duration: reducedMotion ? 0 : 0.6 }}
              >
                <span className="hero-eyebrow__diamond">◈</span>
                The Gateway To
              </m.div>

              <m.h1
                animate={{
                  opacity: stage >= 2 ? 1 : 0,
                  y: stage >= 2 ? 0 : 24,
                }}
                className="hero-heading"
                transition={{ duration: reducedMotion ? 0 : 0.7 }}
              >
                {/* The Infrastructure for
                <br /> */}
                <m.span
                  animate={{
                    filter: stage >= 2 ? "blur(0px)" : "blur(8px)",
                    opacity: stage >= 2 ? 1 : 0,
                  }}
                  className="hero-heading__accent"
                  transition={{ duration: reducedMotion ? 0 : 0.8 }}
                >
                  Confidential
                </m.span>{" "}
                Payments For Businesses.
              </m.h1>

              <m.p
                animate={{
                  opacity: stage >= 3 ? 1 : 0,
                  y: stage >= 3 ? 0 : 16,
                }}
                className="hero-subheading"
                transition={{ duration: reducedMotion ? 0 : 0.6 }}
              >
                Unseen Finance gives businesses the tools to privately send, accept payments, and
                manage money on Solana. No
                exposure. No compromise.
              </m.p>

              <m.div
                animate={{
                  opacity: stage >= 4 ? 1 : 0,
                  y: stage >= 4 ? 0 : 12,
                }}
                className="hero-actions"
                transition={{ duration: reducedMotion ? 0 : 0.5 }}
              >
                <Link className="primary-link primary-link--hero" href="/products/gateway">
                  <span className="primary-link__label">Explore the Gateway</span>
                  <ArrowRight aria-hidden="true" className="button-arrow" size={16} />
                </Link>
                <Link className="hero-docs-link" href="/docs">
                  Read the Docs
                </Link>
              </m.div>

              <m.p
                animate={{ opacity: stage >= 4 ? 1 : 0 }}
                className="hero-proof"
                transition={{ delay: reducedMotion ? 0 : 0.1, duration: 0.5 }}
              >
                ◈ Powered by · Umbra Protocol · Arcium MPC
              </m.p>
            </div>

            <m.div
              animate={{ opacity: stage >= 5 ? 1 : 0, scale: stage >= 5 ? 1 : 0.98 }}
              className="hero-visual"
              transition={{ duration: reducedMotion ? 0 : 0.8 }}
            >
              <HeroPhones />
            </m.div>
          </div>
        </section>

        <m.section
          animate={{ opacity: stage >= 6 ? 1 : 0, y: stage >= 6 ? 0 : 24 }}
          className="stats-band"
          transition={{ duration: reducedMotion ? 0 : 0.6 }}
        >
          <div className="stats-band__marquee">
            <div className="stats-band__track">
              {Array.from({ length: 2 }).map((_, index) => (
                <div className="stats-band__items" key={index}>
                  <StatPill>$0 in leaked transaction data</StatPill>
                  <StatPill>Sub-400ms settlement on Solana</StatPill>
                  <StatPill>Zero-Knowledge by Default</StatPill>
                  <StatPill>6 Products. One Infrastructure.</StatPill>
                  <StatPill>Built for Solana Mainnet</StatPill>
                  <StatPill>Compliance-Ready Privacy</StatPill>
                </div>
              ))}
            </div>
          </div>
        </m.section>

        <section className="section-shell">
          <SectionHeader
            eyebrow="WHAT WE BUILD"
            heading={
              <>
                Every tool your business needs.
                {/* <br />
                All private. All on Solana. */}
              </>
            }
            subtext="Six products. One unified infrastructure. Built for merchants, developers, and enterprises who refuse to compromise on financial privacy."
          />

          <div className="product-rows">
            {productRows.map((rowCards, rowIndex) => {
              const isActive = reducedMotion || activeRow === rowIndex;
              return (
                <m.div
                  animate={
                    reducedMotion
                      ? { opacity: 1, filter: "blur(0px)" }
                      : {
                        opacity: isActive ? 1 : 0.18,
                        filter: isActive ? "blur(0px)" : "blur(3px)",
                      }
                  }
                  aria-hidden={!isActive}
                  className={`product-row${isActive ? " is-active" : " is-inactive"}`}
                  data-product-row={rowIndex}
                  initial={false}
                  key={rowIndex}
                  transition={{ duration: reducedMotion ? 0 : 0.55, ease: [0.4, 0, 0.2, 1] }}
                >
                  {rowCards.map((card, cardIndex) => (
                    <m.div
                      className={`product-card glass-card ${card.className}`}
                      initial={{ opacity: 0, scale: 0.96, y: 20 }}
                      key={card.slug}
                      transition={{ delay: cardIndex * 0.08, duration: 0.6 }}
                      viewport={{ amount: 0.2, once: true }}
                      whileInView={{ opacity: 1, scale: 1, y: 0 }}
                    >
                      <Link
                        className="product-card__link"
                        data-cursor-hover="true"
                        href={`/products/${card.slug}`}
                        tabIndex={isActive ? 0 : -1}
                      >
                        <div className="card-header">
                          <div>
                            <p className="card-overline">{card.overline}</p>
                            <h3 className="card-title">{card.title}</h3>
                          </div>
                          <span aria-hidden="true" className="expand-btn">
                            ↗
                          </span>
                        </div>
                        <div className="card-demo">
                          <card.Demo active={isActive} />
                        </div>
                      </Link>
                    </m.div>
                  ))}
                </m.div>
              );
            })}
          </div>
        </section>

        <section className="privacy-section">
          <div className="privacy-grid">
            <div>
              <div className="section-copy section-copy--left">
                <p className="section-copy__eyebrow">HOW IT WORKS</p>
                <h2>Privacy without complexity.</h2>
                <p>
                  Every transaction is shielded at the protocol level. No
                  configuration required.
                </p>
              </div>
              <div className="privacy-steps">
                {[
                  {
                    icon: Lock,
                    title: "Transaction Initiated",
                    body: "Your payment begins as a standard Solana transaction with full wallet support.",
                  },
                  {
                    icon: Zap,
                    title: "ZK-Shield Applied",
                    body: "A zero-knowledge proof is generated, mathematically concealing the amount and parties.",
                  },
                  {
                    icon: EyeOff,
                    title: "Shielded On-Chain",
                    body: "The transaction is recorded on Solana but all sensitive fields are cryptographically hidden.",
                  },
                  {
                    icon: CheckCircle2,
                    title: "Merchant Confirmed",
                    body: "The recipient receives cryptographic proof of payment — privately, instantly.",
                  },
                  {
                    icon: ClipboardList,
                    title: "Compliance Ready",
                    body: "Authorized disclosure reports are generated on demand for regulatory requirements.",
                  },
                ].map((step, index) => (
                  <m.div
                    className="privacy-step"
                    initial={{ opacity: 0, x: -20 }}
                    key={step.title}
                    transition={{ delay: index * 0.08, duration: 0.5 }}
                    viewport={{ amount: 0.3, once: true }}
                    whileInView={{ opacity: 1, x: 0 }}
                  >
                    <div className="privacy-step__icon">
                      <step.icon aria-hidden="true" size={18} />
                    </div>
                    <div>
                      <h3>{step.title}</h3>
                      <p>{step.body}</p>
                    </div>
                  </m.div>
                ))}
              </div>
            </div>

            <div className="privacy-visual">
              <PrivacyTunnel />
            </div>
          </div>
        </section>

        <section className="developer-section">
          <div className="developer-grid">
            <div className="developer-code">
              <div className="section-copy section-copy--left">
                <p className="section-copy__eyebrow">FOR DEVELOPERS</p>
                <h2>Build private payment flows in minutes.</h2>
                <p>
                  Clean TypeScript SDK. Typed APIs. Comprehensive documentation.
                </p>
              </div>

              <div className="code-panel">
                <div className="code-panel__chrome">
                  <div className="code-panel__dots">
                    <span />
                    <span />
                    <span />
                  </div>
                  <div className="code-panel__tabs">
                    {codeTabs.map((tab) => (
                      <button
                        className={`code-panel__tab ${activeTab === tab.id ? "is-active" : ""
                          }`}
                        data-cursor-hover="true"
                        key={tab.id}
                        onClick={() =>
                          document
                            .querySelector<HTMLElement>(
                              `[data-demo-panel="${tab.id}"]`,
                            )
                            ?.scrollIntoView({
                              behavior: "smooth",
                              block: "center",
                            })
                        }
                        type="button"
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="code-panel__body">
                  <CodeDisplay tab={activeTab} />
                </div>
              </div>

              <Link className="developer-docs-cta" href="/docs">
                <span>$ unseen docs open</span>
                <span className="developer-docs-cta__icon">→</span>
              </Link>
            </div>

            <div className="developer-demos">
              {codeTabs.map((tab) => (
                <div className="developer-demo-panel" data-demo-panel={tab.id} key={tab.id}>
                  <p className="developer-demo-panel__label">{tab.eyebrow}</p>
                  <div className="developer-demo-panel__frame glass-card">{tab.demo}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="ecosystem-section">
          <div className="section-copy section-copy--center">
            <h2>Built to integrate. Built to last.</h2>
          </div>
          <div className="integrations-marquee">
            <div className="integrations-marquee__track">
              {Array.from({ length: 2 }).map((_, index) => (
                <div className="integrations-marquee__items" key={index}>
                  {[
                    "Phantom",
                    "Solflare",
                    "Jupiter",
                    "Raydium",
                    "Orca",
                    "Marinade",
                    "Drift",
                    "Squads",
                    "Jito",
                    "Helium",
                    "Helius",
                    "Quicknode",
                  ].map((item) => (
                    <span className="integrations-marquee__item" key={`${index}-${item}`}>
                      {item}
                    </span>
                  ))}
                </div>
              ))}
            </div>
          </div>

          <div className="stats-grid">
            <AnimatedStat
              descriptor="Across all processed payments"
              label="In exposed transaction data"
              prefix="$"
              value={0}
            />
            <AnimatedStat
              descriptor="On Solana mainnet"
              label="Average settlement time"
              prefix="<"
              suffix="ms"
              value={400}
            />
            <AnimatedStat
              descriptor="One SDK. Zero compromise."
              label="Privacy-native products"
              value={6}
            />
          </div>
        </section>

        <section className="final-cta">
          <div className="final-cta__glow" />
          <div className="final-cta__content">
            <span className="final-cta__symbol">◈</span>
            <h2>
              The Future of Finance
              <br />
              <span className="hero-heading__accent">Has Nothing to Hide.</span>
            </h2>
            <div className="final-cta__actions">
              <Link className="primary-link primary-link--hero" href="/signup">
                <span className="primary-link__label">Start Building</span>
                <ArrowRight aria-hidden="true" className="button-arrow" size={16} />
              </Link>
              <Link className="hero-docs-link" href="/pricing">
                Talk to Sales
              </Link>
            </div>
            <p className="final-cta__login">
              Already have an account?{" "}
              <button
                onClick={() => login()}
                style={{
                  background: "none",
                  border: "none",
                  color: "inherit",
                  cursor: "pointer",
                  textDecoration: "underline",
                  font: "inherit",
                  padding: 0,
                }}
              >
                Log in ↗
              </button>
            </p>
          </div>
        </section>
      </main>
    </SiteShell>
  );
}

function SectionHeader({
  eyebrow,
  heading,
  subtext,
}: {
  eyebrow: string;
  heading: ReactNode;
  subtext: string;
}) {
  return (
    <div className="section-copy section-copy--center">
      <m.p
        className="section-copy__eyebrow"
        initial={{ opacity: 0, y: 24 }}
        transition={{ duration: 0.5 }}
        viewport={{ amount: 0.4, once: true }}
        whileInView={{ opacity: 1, y: 0 }}
      >
        {eyebrow}
      </m.p>
      <m.h2
        initial={{ opacity: 0, y: 24 }}
        transition={{ delay: 0.08, duration: 0.55 }}
        viewport={{ amount: 0.4, once: true }}
        whileInView={{ opacity: 1, y: 0 }}
      >
        {heading}
      </m.h2>
      <m.p
        initial={{ opacity: 0, y: 24 }}
        transition={{ delay: 0.16, duration: 0.55 }}
        viewport={{ amount: 0.4, once: true }}
        whileInView={{ opacity: 1, y: 0 }}
      >
        {subtext}
      </m.p>
    </div>
  );
}

function StatPill({ children }: { children: ReactNode }) {
  return (
    <span className="stats-band__pill">
      <span>◈</span>
      {children}
    </span>
  );
}

function AuroraBackdrop() {
  return (
    <div className="aurora-backdrop">
      <div className="aurora-backdrop__layer aurora-backdrop__layer--one" />
      <div className="aurora-backdrop__layer aurora-backdrop__layer--two" />
      <div className="aurora-backdrop__layer aurora-backdrop__layer--three" />
      <div className="aurora-backdrop__layer aurora-backdrop__layer--four" />
      <div className="aurora-backdrop__vignette" />
    </div>
  );
}

function DemoLoading() {
  return <div className="demo-loading" />;
}

function PrivacyTunnel() {
  return (
    <div className="privacy-tunnel glass-card">
      <svg
        aria-hidden="true"
        className="privacy-tunnel__svg"
        viewBox="0 0 320 400"
      >
        <defs>
          <linearGradient id="tunnelGradient" x1="0%" x2="100%" y1="0%" y2="100%">
            <stop offset="0%" stopColor="var(--color-violet-primary)" />
            <stop offset="100%" stopColor="var(--color-violet-glow)" />
          </linearGradient>
          <filter id="tunnelGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="8" />
          </filter>
        </defs>

        <rect className="privacy-tunnel__layer" height="88" rx="20" width="240" x="40" y="32" />
        <rect
          className="privacy-tunnel__shield"
          height="118"
          rx="28"
          width="240"
          x="40"
          y="142"
        />
        <rect className="privacy-tunnel__layer" height="92" rx="20" width="240" x="40" y="288" />

        <circle cx="160" cy="56" fill="url(#tunnelGradient)" filter="url(#tunnelGlow)" r="8">
          <animateMotion dur="6s" path="M 0 0 L 0 168 L 0 286" repeatCount="indefinite" />
          <animate
            attributeName="r"
            dur="6s"
            repeatCount="indefinite"
            values="8;8;12;10;10"
          />
        </circle>

        <text className="privacy-tunnel__label" x="64" y="66">
          Your Wallet → sends 2.4 SOL
        </text>
        <text className="privacy-tunnel__label" x="64" y="206">
          ZK Shield → amount concealed
        </text>
        <text className="privacy-tunnel__label" x="64" y="324">
          Solana Chain → transaction recorded [PRIVATE]
        </text>
      </svg>
      <p className="privacy-tunnel__note">
        Proof generated in &lt;50ms. Settlement in &lt;400ms.
      </p>
    </div>
  );
}

function AnimatedStat({
  descriptor,
  label,
  prefix = "",
  suffix = "",
  value,
}: {
  descriptor: string;
  label: string;
  prefix?: string;
  suffix?: string;
  value: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.5 });
  const motionValue = useMotionValue(0);
  const rounded = useTransform(motionValue, (latest) => Math.round(latest));
  const formatted = useTransform(rounded, (latest) => `${prefix}${latest}${suffix}`);

  useEffect(() => {
    if (!inView) {
      return;
    }

    const controls = animate(motionValue, value, {
      duration: 1.05,
      ease: [0.16, 1, 0.3, 1],
    });

    return () => controls.stop();
  }, [inView, motionValue, value]);

  return (
    <div className="stat-card glass-card" ref={ref}>
      <m.span className="stat-card__value">{value === 0 ? `${prefix}0` : formatted}</m.span>
      <p className="stat-card__label">{label}</p>
      <p className="stat-card__descriptor">{descriptor}</p>
    </div>
  );
}

function CodeDisplay({ tab }: { tab: TabId }) {
  return (
    <pre className="code-display">
      {codeSnippets[tab].map((line, index) => (
        <div className="code-display__line" key={`${tab}-${index}`}>
          {line.map((token, tokenIndex) => (
            <span
              className={token.className ?? "code-default"}
              key={`${tab}-${index}-${tokenIndex}`}
            >
              {token.text}
            </span>
          ))}
        </div>
      ))}
    </pre>
  );
}
