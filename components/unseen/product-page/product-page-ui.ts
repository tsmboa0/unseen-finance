import type { ProductSlug } from "@/components/unseen/site-content";

/** Marketing chrome specific to each product page (below demo + footer). */
export type ProductPageUi = {
  valueEyebrow: string;
  valueHeading: string;
  footerTitle: string;
  footerLead: string;
  sdkEyebrow: string;
  sdkHeading: string;
  sdkIntro: string;
  goDeeperEyebrow: string;
  goDeeperHeading: string;
  goDeeperIntro: string;
};

export const PRODUCT_PAGE_UI: Record<ProductSlug, ProductPageUi> = {
  gateway: {
    valueEyebrow: "Checkout → treasury",
    valueHeading: "One surface from cart to shielded settlement.",
    footerTitle: "Ship Gateway on your next storefront cycle?",
    footerLead:
      "Use the same payment and verify calls in devnet, then flip the network when your ops team is ready — references and webhooks carry through.",
    sdkEyebrow: "TypeScript first",
    sdkHeading: "A payment session, then verify.",
    sdkIntro:
      "This mirrors how teams embed checkout: create a payment, send customers to the hosted URL, and confirm on-chain when they pay.",
    goDeeperEyebrow: "Integrate when you are ready",
    goDeeperHeading: "Docs, environments, and pricing in one place.",
    goDeeperIntro:
      "Gateway uses the same Unseen workspace as the rest of the stack — no separate vendor for private settlement.",
  },
  payroll: {
    valueEyebrow: "Prepare · approve · run",
    valueHeading: "Payroll that respects signatures and sign-off.",
    footerTitle: "Align Payroll with your next close?",
    footerLead:
      "Dry-run batches against devnet, attach your signer policy, then promote when finance is comfortable with run history and notifications.",
    sdkEyebrow: "",
    sdkHeading: "",
    sdkIntro: "",
    goDeeperEyebrow: "APIs & dashboards",
    goDeeperHeading: "Wire runs without a bespoke payroll vendor.",
    goDeeperIntro:
      "Payroll lives beside Gateway and invoices in your merchant workspace — review limits, signing policy, and history in one place.",
  },
  x402: {
    valueEyebrow: "402 Payment Required",
    valueHeading: "Monetize routes without leaking who paid.",
    footerTitle: "Gate your highest-traffic API next?",
    footerLead:
      "Drop a session next to your existing gateway: return 402, send buyers to checkout, unlock after verify — all without new identity plumbing.",
    sdkEyebrow: "Edge-friendly",
    sdkHeading: "Session + redirect from your handler.",
    sdkIntro:
      "Keeps your route handlers thin: Unseen owns the private settlement story while your code stays focused on authz and entitlements.",
    goDeeperEyebrow: "Still shipping",
    goDeeperHeading: "Extend 402 flows with your existing edge stack.",
    goDeeperIntro:
      "Bring your rate limits, API keys, and product entitlements — Unseen supplies the payment session and shielded receipt path.",
  },
  storefronts: {
    valueEyebrow: "Catalog to confirmation",
    valueHeading: "Commerce where checkout matches how Solana wallets pay.",
    footerTitle: "Stand up a catalog-backed pilot?",
    footerLead:
      "Define SKUs via API, point traffic at hosted checkout, and tighten policies when you are ready to embed deeper widgets.",
    sdkEyebrow: "",
    sdkHeading: "",
    sdkIntro: "",
    goDeeperEyebrow: "Merchants & ops",
    goDeeperHeading: "From SKU import to hosted checkout URLs.",
    goDeeperIntro:
      "Documented APIs for catalog sync, orders, and checkout — design the front-end you want while Unseen hosts the wallet-safe path.",
  },
  tiplinks: {
    valueEyebrow: "Communities & campaigns",
    valueHeading: "Links and gifts that do not strip privacy by default.",
    footerTitle: "Run your next drop or tip drive on Tiplinks?",
    footerLead:
      "Issue claim codes from the dashboard, share wherever your audience lives, and keep memos and amounts off the public graph.",
    sdkEyebrow: "",
    sdkHeading: "",
    sdkIntro: "",
    goDeeperEyebrow: "Creators & programs",
    goDeeperHeading: "Gift cards, codes, and campaigns in one product family.",
    goDeeperIntro:
      "Tiplinks share infrastructure with gift cards and the public /redeem flow — fewer one-off scripts for your community team.",
  },
  invoice: {
    valueEyebrow: "AR · references · proof",
    valueHeading: "Invoices that finance can file — and settlement that stays private.",
    footerTitle: "Pilot Invoice with a small AR cohort?",
    footerLead:
      "Start with accounts that already tolerate crypto pay links, connect your ERP reference fields, then widen once collections playbooks hold.",
    sdkEyebrow: "",
    sdkHeading: "",
    sdkIntro: "",
    goDeeperEyebrow: "Finance systems",
    goDeeperHeading: "Export and reconcile like traditional AR — with private legs.",
    goDeeperIntro:
      "Line up invoice IDs with your ledger references, then trace settlement through verify payloads instead of explorer archaeology.",
  },
  compliance: {
    valueEyebrow: "Grants · scope · disclosure",
    valueHeading: "Compliance artifacts that match what you actually approved.",
    footerTitle: "Formalize disclosure with Compliance next?",
    footerLead:
      "Pair dashboard grants with the public auditor worksheet when third parties need a constrained view — without reopening every shielded transfer.",
    sdkEyebrow: "",
    sdkHeading: "",
    sdkIntro: "",
    goDeeperEyebrow: "Institutions",
    goDeeperHeading: "Dashboard disclosure plus the public auditor worksheet.",
    goDeeperIntro:
      "Use Compliance for scoped grants and PDFs; share the standalone /auditor tool when an external firm needs a narrow, reproducible view.",
  },
};
