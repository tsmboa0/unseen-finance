import type { ProductSlug } from "@/components/unseen/site-content";

export type ProductPageCopy = {
  /** Line below the main H1. */
  subhead: string;
  /** Short intro under title block. */
  lead: string;
  /** Value bullets for merchants. */
  valueProps: string[];
  /** Deeper sections (heading + body). */
  sections: Array<{ title: string; body: string }>;
};

export const PRODUCT_PAGE_COPY: Record<ProductSlug, ProductPageCopy> = {
  gateway: {
    subhead: "Shielded checkout, public confidence.",
    lead:
      "Unseen Gateway turns every card and wallet payment into a shielded Solana settlement — your customers keep UX they trust while your treasury reduces leakage and front-running exposure.",
    valueProps: [
      "One hosted checkout that routes into Umbra — no need to expose invoice amounts in public mempools.",
      "Webhooks and verification APIs that align with how your ops team already reconciles.",
      "Built for teams moving real volume: references, metadata, and retries without sacrificing privacy defaults.",
    ],
    sections: [
      {
        title: "Operational payoff",
        body:
          "Operations teams see fewer spurious declines and less payment metadata surface area to CRMs, CS tools, and shared dashboards. Engineering keeps a single integration surface while compliance retains the controls they expect.",
      },
      {
        title: "Where it fits",
        body:
          "Use Gateway for subscriptions, e-commerce carts, and B2B invoicing that ties back to your existing order IDs. Pair with Compliance when you must prove activity without rebuilding your entire treasury stack.",
      },
    ],
  },
  payroll: {
    subhead: "Batch payouts with shielded legs.",
    lead:
      "Roll out team compensation that settles on Solana with cryptographic privacy — batch preparation, signer approvals, and auditable execution without passing raw salaries through public explorers.",
    valueProps: [
      "Prepare runs with structured payouts; shielded legs hide individual amounts while you retain internal accounting truth.",
      "Confirmation hooks line up with HRIS cycles so finance does not live in bespoke scripts.",
      "Multi-party approvals map cleanly to organizational reality (treasury + people ops).",
    ],
    sections: [
      {
        title: "Why teams adopt it",
        body:
          "Distributed teams in crypto-native orgs expect settlement assurances comparable to traditional payroll rails, without broadcasting compensation data. Payroll gives you a disciplined workflow that still speaks Solana speed.",
      },
      {
        title: "Next steps",
        body:
          "Start from a dry-run on devnet, connect signing policy to your governance model, then promote to mainnet volumes with the same Unseen API keys you already use for Gateway.",
      },
    ],
  },
  x402: {
    subhead: "HTTP 402 meets shielded settlement.",
    lead:
      "Monetize APIs and premium routes with on-chain payment — Unseen x402 pairs HTTP payment-required flows with private receipts so you can meter access without exposing payer graphs.",
    valueProps: [
      "Drop-in session creation next to your existing API gateway and reverse proxy.",
      "Works with usage-based pricing — each 402 challenges carries a reference you can reconcile in your billing warehouse.",
      "Shielded receipts reduce public linkage between wallet activity and subscriber identity.",
    ],
    sections: [
      {
        title: "Developer experience",
        body:
          "Your edge functions stay small: create a payment, redirect or deep-link to checkout, and unlock content after verify(). Rate limits, keys, and entitlements remain yours — Unseen handles the private settlement story.",
      },
      {
        title: "Business fit",
        body:
          "Ideal for infra, data, and AI endpoints moving from ad-hoc Stripe links to verifiable on-chain settlement with Solana-native economics.",
      },
    ],
  },
  storefronts: {
    subhead: "Privacy-native commerce in one surface.",
    lead:
      "Spin up catalog, cart, and hosted checkout experiences where settlement defaults to shielded flows — fewer pieces to duct-tape between storefront and wallet.",
    valueProps: [
      "Opinionated flows for catalog + checkout that match how Phantom and Solflare users actually pay.",
      "Hooks for inventory and fulfillment systems without leaking basket-level telemetry on-chain.",
      "Designed to pair with Gateway policies so treasury rules stay consistent across channels.",
    ],
    sections: [
      {
        title: "Merchant angle",
        body:
          "Small teams get a credible storefront without building bespoke checkout. Larger brands pilot new regions with privacy-forward payments without rewiring their entire ERP story on day one.",
      },
      {
        title: "Technical path",
        body:
          "Bootstrap store metadata via API, attach SKUs and media URLs, then route traffic to hosted checkout links until you embed deeper SDK flows.",
      },
    ],
  },
  tiplinks: {
    subhead: "Anonymous value, intentional messaging.",
    lead:
      "Send tips, gifts, and community rewards with links recipients can claim through familiar wallets — minimize the public breadcrumb trail while retaining enough structure for light-touch moderation.",
    valueProps: [
      "Purpose-built for creators, DAOs, and community programs running high volumes of small transfers.",
      "Optional expiries and memos keep operational guardrails without doxxing supporters.",
      "Pairs naturally with Gift Cards for longer-lived stored value use cases.",
    ],
    sections: [
      {
        title: "Operational clarity",
        body:
          "Community managers distribute links through socials and Discord without forcing every supporter through KYC-for-tips. Finance still gets aggregate visibility where Compliance policies allow disclosure.",
      },
      {
        title: "Implementation",
        body:
          "Create links server-side from your backend using the same Unseen client, attach campaign metadata, and route your front-end to the hosted claim experience in minutes.",
      },
    ],
  },
  invoice: {
    subhead: "Professional invoices, private settlement.",
    lead:
      "Generate invoices that read like traditional PDFs to your customers while routing settlement through shielded transfers — line-item privacy with public verification hooks for auditors when you need them.",
    valueProps: [
      "Structured line items, due dates, and customer references map to how finance already closes books.",
      "Counterparties pay through familiar wallet UX; you settle with less sensitive data on-chain.",
      "Exports and PDFs align with accounts-receivable workflows instead of generic crypto receipts.",
    ],
    sections: [
      {
        title: "Why finance cares",
        body:
          "AR teams reduce the risk of broadcasting contract pricing in explorers, while still proving payment to internal stakeholders with deterministic verification payloads.",
      },
      {
        title: "Rollout pattern",
        body:
          "Start with a handful of strategic accounts, connect ERP references to Unseen invoice IDs, and expand once your collections playbooks map cleanly to automated reminders.",
      },
    ],
  },
  compliance: {
    subhead: "Privacy with an audit trail you control.",
    lead:
      "Generate scoped disclosures for regulators and partners — tie authorized viewing windows to grants and mint ranges without reopening your entire mixer graph.",
    valueProps: [
      "Deterministic reporting artifacts that pair with your existing GRC processes.",
      "Scoped keys and time windows reduce the blast radius of any single disclosure event.",
      "Complements private commerce products when institutions demand proof without raw data dumps.",
    ],
    sections: [
      {
        title: "Institutional reality",
        body:
          "Compliance teams negotiate privacy versus oversight every day. Unseen Compliance encodes those negotiations into explicit grants — less spreadsheet archaeology, fewer ad-hoc exports.",
      },
      {
        title: "Operational integration",
        body:
          "Wire reports into your document management or auditor portals; regenerate when your legal window shifts without replaying sensitive raw data across email.",
      },
    ],
  },
};
