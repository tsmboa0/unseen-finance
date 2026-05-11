import { UNSEEN_DOCS_URL } from "@/lib/docs-url";

export const productPages = {
  gateway: {
    label: "Gateway",
    title: "Unseen Gateway",
    description:
      "Privacy-native payment acceptance for merchants that want confidential settlement on Solana.",
  },
  payroll: {
    label: "Payroll",
    title: "Unseen Payroll",
    description:
      "Confidential team compensation with shielded transfers, instant confirmation, and operational control.",
  },
  x402: {
    label: "x402",
    title: "Unseen x402",
    description:
      "On-chain API monetization with paywalls, access control, and shielded payment receipts.",
  },
  storefronts: {
    label: "Storefronts",
    title: "Unseen Storefronts",
    description:
      "Launch privacy-native commerce experiences with checkout, catalog, and wallet flows already wired.",
  },
  tiplinks: {
    label: "Tiplinks",
    title: "Tiplinks & Gift Cards",
    description:
      "Anonymous value transfer for creators, communities, and gifting experiences built on Solana.",
  },
  invoice: {
    label: "Invoice",
    title: "Unseen Invoice",
    description:
      "Issue professional invoices and get paid privately on Solana — with shielded amounts, public verification, and zero counterparty exposure.",
  },
  compliance: {
    label: "Compliance",
    title: "Unseen Compliance",
    description:
      "Authorized disclosure and reporting for institutions that need privacy without losing auditability.",
  },
} as const;

export type ProductSlug = keyof typeof productPages;

export const PRODUCT_SLUGS = Object.keys(productPages) as ProductSlug[];

export const pageLinks = [
  { label: "Explore Gateway", href: "/products/gateway" },
  { label: "Read Documentation", href: UNSEEN_DOCS_URL },
  { label: "View Pricing", href: "/pricing" },
  { label: "Start Building", href: UNSEEN_DOCS_URL },
  { label: "Contact Sales", href: "/pricing" },
  { label: "System Status", href: "https://status.unseenfi.com" },
] as const;
