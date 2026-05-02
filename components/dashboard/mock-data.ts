const DAY = 1000 * 60 * 60 * 24;
const NOW = Date.UTC(2026, 3, 23, 14, 32, 0);

export type Product =
  | "gateway"
  | "payroll"
  | "x402"
  | "storefronts"
  | "tiplinks"
  | "invoice";

export type TxStatus = "shielded" | "pending" | "failed" | "released";
export type TxDirection = "in" | "out";

export type Transaction = {
  id: string;
  product: Product;
  direction: TxDirection;
  status: TxStatus;
  amount: number;
  currency: "USDC" | "SOL";
  counterparty: string;
  memo: string;
  txHash: string;
  timestamp: number;
};

export type Volume30dPoint = {
  t: number;
  inflow: number;
  outflow: number;
  shielded: number;
};

export type ProductBreakdown = {
  product: Product;
  label: string;
  volume: number;
  share: number;
};

export type PayrollRun = {
  id: string;
  memo: string;
  category: "Contractors" | "Employees" | "Advisors" | "Partners";
  recipientCount: number;
  total: number;
  currency: "USDC";
  status: "scheduled" | "running" | "settled" | "failed";
  scheduledFor: number;
  completedAt?: number;
};

export type Recipient = {
  id: string;
  handle: string;
  wallet: string;
  amount: number;
  currency: "USDC" | "SOL";
  role: string;
};

export type Storefront = {
  id: string;
  name: string;
  subdomain: string;
  currency: "USDC" | "SOL";
  privacy: "shielded" | "public";
  status: "live" | "paused" | "draft";
  orders30d: number;
  revenue30d: number;
  createdAt: number;
};

export type Tiplink = {
  id: string;
  label: string;
  amount: number;
  currency: "USDC" | "SOL";
  status: "active" | "claimed" | "expired";
  createdAt: number;
  url: string;
};

export type GiftCard = {
  id: string;
  recipient: string;
  amount: number;
  currency: "USDC";
  status: "active" | "redeemed" | "expired";
  createdAt: number;
  code: string;
};

export type Invoice = {
  id: string;
  number: string;
  client: string;
  email: string;
  amount: number;
  currency: "USDC";
  status: "draft" | "sent" | "paid" | "overdue";
  issuedAt: number;
  dueAt: number;
};

export type ComplianceReport = {
  id: string;
  title: string;
  range: { from: number; to: number };
  products: Product[];
  recipient: string;
  generatedAt: number;
  status: "ready" | "generating" | "expired";
  size: string;
};

export type ViewingKey = {
  id: string;
  label: string;
  scope: "account" | "product" | "address";
  scopeTarget: string;
  createdAt: number;
  expiresAt: number;
  shares: number;
};

export type ApiKey = {
  id: string;
  name: string;
  prefix: string;
  environment: "test" | "live";
  scopes: string[];
  createdAt: number;
  lastUsedAt?: number;
  status: "active" | "revoked";
  usage7d: number[];
};

export type TeamMember = {
  id: string;
  name: string;
  email: string;
  role: "Owner" | "Admin" | "Developer" | "Finance" | "Viewer";
  lastActiveAt: number;
  twoFA: boolean;
};

export const account = {
  name: "Atlas Labs",
  merchantId: "mer_test_9A4fL1pKX2",
  handle: "atlas-labs",
  plan: "Scale",
  wallet: "atlas.labs.sol",
  owner: {
    name: "Maya Okonjo",
    email: "maya@atlaslabs.xyz",
    avatarInitials: "MO",
    timezone: "GMT+01:00 · Lagos",
  },
  kybStatus: "Verified",
};

export const kpis = {
  totalVolume30d: 2_418_732.4,
  totalVolumeDelta: 18.6,
  shieldedShare: 94.8,
  shieldedShareDelta: 2.1,
  activeCustomers: 1_384,
  activeCustomersDelta: 9.2,
  avgSettlementMs: 412,
  avgSettlementDelta: -6.4,
};

export const volume30d: Volume30dPoint[] = buildVolumeSeries();

export const productBreakdown: ProductBreakdown[] = [
  { product: "gateway", label: "Gateway", volume: 1_086_300, share: 44.9 },
  { product: "payroll", label: "Payroll", volume: 512_840, share: 21.2 },
  { product: "storefronts", label: "Storefronts", volume: 318_460, share: 13.2 },
  { product: "x402", label: "x402", volume: 241_820, share: 10.0 },
  { product: "invoice", label: "Invoice", volume: 152_010, share: 6.3 },
  { product: "tiplinks", label: "Tiplinks", volume: 107_302, share: 4.4 },
];

export const dailyVolume: { label: string; value: number }[] = [
  { label: "Mon", value: 86_400 },
  { label: "Tue", value: 102_500 },
  { label: "Wed", value: 94_200 },
  { label: "Thu", value: 118_900 },
  { label: "Fri", value: 132_400 },
  { label: "Sat", value: 71_300 },
  { label: "Sun", value: 58_200 },
];

export const transactions: Transaction[] = buildTransactions();

export const payrollRuns: PayrollRun[] = [
  {
    id: "run_3p92",
    memo: "April 2026 payroll",
    category: "Employees",
    recipientCount: 18,
    total: 124_600,
    currency: "USDC",
    status: "settled",
    scheduledFor: NOW - DAY * 2,
    completedAt: NOW - DAY * 2 + 1000 * 60 * 6,
  },
  {
    id: "run_3p87",
    memo: "Q1 advisor grants",
    category: "Advisors",
    recipientCount: 4,
    total: 38_000,
    currency: "USDC",
    status: "settled",
    scheduledFor: NOW - DAY * 11,
    completedAt: NOW - DAY * 11 + 1000 * 60 * 3,
  },
  {
    id: "run_3p80",
    memo: "March 2026 contractor batch",
    category: "Contractors",
    recipientCount: 26,
    total: 84_200,
    currency: "USDC",
    status: "settled",
    scheduledFor: NOW - DAY * 33,
    completedAt: NOW - DAY * 33 + 1000 * 60 * 8,
  },
  {
    id: "run_3p95",
    memo: "May 2026 payroll",
    category: "Employees",
    recipientCount: 18,
    total: 128_400,
    currency: "USDC",
    status: "scheduled",
    scheduledFor: NOW + DAY * 8,
  },
];

export const payrollTemplates = [
  {
    id: "tpl_core",
    name: "Core team — monthly",
    recipients: 18,
    lastUsed: NOW - DAY * 2,
  },
  {
    id: "tpl_contractors",
    name: "Contractor roster",
    recipients: 26,
    lastUsed: NOW - DAY * 33,
  },
  {
    id: "tpl_advisors",
    name: "Advisor grants",
    recipients: 4,
    lastUsed: NOW - DAY * 11,
  },
];

export const sampleRecipients: Recipient[] = [
  { id: "rcp_1", handle: "alex.sol", wallet: "al3X…K2Nq", amount: 4200, currency: "USDC", role: "Engineering" },
  { id: "rcp_2", handle: "jordan.sol", wallet: "jRdn…92aM", amount: 3800, currency: "USDC", role: "Design" },
  { id: "rcp_3", handle: "sam.sol", wallet: "s4mX…pW7e", amount: 5100, currency: "USDC", role: "Engineering" },
  { id: "rcp_4", handle: "priya.sol", wallet: "pRy4…ttQv", amount: 4800, currency: "USDC", role: "Product" },
  { id: "rcp_5", handle: "nadia.sol", wallet: "nDi4…k9Lj", amount: 4600, currency: "USDC", role: "Engineering" },
  { id: "rcp_6", handle: "leo.sol", wallet: "leoX…88Yq", amount: 3200, currency: "USDC", role: "Operations" },
];

export const storefronts: Storefront[] = [
  {
    id: "sf_atlas-merch",
    name: "Atlas Merch",
    subdomain: "merch.atlaslabs.xyz",
    currency: "USDC",
    privacy: "shielded",
    status: "live",
    orders30d: 482,
    revenue30d: 61_820,
    createdAt: NOW - DAY * 140,
  },
  {
    id: "sf_ghost-arcade",
    name: "Ghost Arcade",
    subdomain: "arcade.atlaslabs.xyz",
    currency: "SOL",
    privacy: "shielded",
    status: "live",
    orders30d: 214,
    revenue30d: 42_130,
    createdAt: NOW - DAY * 64,
  },
  {
    id: "sf_research-pass",
    name: "Research Pass",
    subdomain: "research.atlaslabs.xyz",
    currency: "USDC",
    privacy: "shielded",
    status: "paused",
    orders30d: 0,
    revenue30d: 0,
    createdAt: NOW - DAY * 202,
  },
  {
    id: "sf_founder-dropin",
    name: "Founder Drop-in",
    subdomain: "dropin.atlaslabs.xyz",
    currency: "USDC",
    privacy: "public",
    status: "draft",
    orders30d: 0,
    revenue30d: 0,
    createdAt: NOW - DAY * 5,
  },
];

export const tiplinks: Tiplink[] = [
  { id: "tl_9a2", label: "Launch party thank-you", amount: 25, currency: "USDC", status: "active", createdAt: NOW - DAY * 1, url: "unseen.fi/tl/9a2v3x" },
  { id: "tl_78f", label: "Engineering standup", amount: 15, currency: "USDC", status: "claimed", createdAt: NOW - DAY * 3, url: "unseen.fi/tl/78fgq4" },
  { id: "tl_21c", label: "Hackathon prize", amount: 150, currency: "USDC", status: "active", createdAt: NOW - DAY * 6, url: "unseen.fi/tl/21ckm0" },
  { id: "tl_66p", label: "Design feedback", amount: 10, currency: "USDC", status: "active", createdAt: NOW - DAY * 7, url: "unseen.fi/tl/66pzr1" },
  { id: "tl_42j", label: "Podcast guest", amount: 200, currency: "USDC", status: "claimed", createdAt: NOW - DAY * 14, url: "unseen.fi/tl/42jybb" },
  { id: "tl_05k", label: "Referral reward", amount: 50, currency: "USDC", status: "expired", createdAt: NOW - DAY * 45, url: "unseen.fi/tl/05kxy7" },
];

export const giftCards: GiftCard[] = [
  { id: "gc_100_a", recipient: "priya@atlaslabs.xyz", amount: 100, currency: "USDC", status: "active", createdAt: NOW - DAY * 2, code: "GFT-5UQ1-KX82" },
  { id: "gc_50_b", recipient: "leo@atlaslabs.xyz", amount: 50, currency: "USDC", status: "redeemed", createdAt: NOW - DAY * 5, code: "GFT-2HRM-PZ18" },
  { id: "gc_250_c", recipient: "ana@external.xyz", amount: 250, currency: "USDC", status: "active", createdAt: NOW - DAY * 9, code: "GFT-8YD3-N4KL" },
  { id: "gc_25_d", recipient: "ken@external.xyz", amount: 25, currency: "USDC", status: "expired", createdAt: NOW - DAY * 95, code: "GFT-1XPQ-R9VB" },
];

export const invoices: Invoice[] = [
  { id: "inv_2026_041", number: "INV-2026-041", client: "Helix Partners", email: "billing@helixpartners.xyz", amount: 14_800, currency: "USDC", status: "paid", issuedAt: NOW - DAY * 6, dueAt: NOW + DAY * 4 },
  { id: "inv_2026_040", number: "INV-2026-040", client: "Kite Foundation", email: "ops@kitefoundation.xyz", amount: 9_500, currency: "USDC", status: "sent", issuedAt: NOW - DAY * 3, dueAt: NOW + DAY * 11 },
  { id: "inv_2026_039", number: "INV-2026-039", client: "Loom DAO", email: "treasury@loom.xyz", amount: 22_000, currency: "USDC", status: "overdue", issuedAt: NOW - DAY * 28, dueAt: NOW - DAY * 7 },
  { id: "inv_2026_038", number: "INV-2026-038", client: "Sable Studio", email: "ap@sablestudio.xyz", amount: 4_200, currency: "USDC", status: "paid", issuedAt: NOW - DAY * 38, dueAt: NOW - DAY * 22 },
  { id: "inv_2026_042", number: "INV-2026-042", client: "North Yard", email: "finance@northyard.xyz", amount: 11_600, currency: "USDC", status: "draft", issuedAt: NOW, dueAt: NOW + DAY * 14 },
];

export const complianceReports: ComplianceReport[] = [
  {
    id: "rep_q1_audit",
    title: "Q1 2026 auditor package",
    range: { from: NOW - DAY * 94, to: NOW - DAY * 3 },
    products: ["gateway", "payroll", "storefronts"],
    recipient: "audit@kpmg-prism.xyz",
    generatedAt: NOW - DAY * 3,
    status: "ready",
    size: "2.4 MB",
  },
  {
    id: "rep_march_payroll",
    title: "March payroll disclosure",
    range: { from: NOW - DAY * 44, to: NOW - DAY * 14 },
    products: ["payroll"],
    recipient: "compliance@atlaslabs.xyz",
    generatedAt: NOW - DAY * 13,
    status: "ready",
    size: "812 KB",
  },
  {
    id: "rep_fincen_jan",
    title: "FinCEN SAR supplement",
    range: { from: NOW - DAY * 152, to: NOW - DAY * 122 },
    products: ["gateway"],
    recipient: "legal@northyard.xyz",
    generatedAt: NOW - DAY * 119,
    status: "expired",
    size: "1.1 MB",
  },
];

export const viewingKeys: ViewingKey[] = [
  {
    id: "vk_finance",
    label: "Finance controller (read-only)",
    scope: "account",
    scopeTarget: "All products",
    createdAt: NOW - DAY * 48,
    expiresAt: NOW + DAY * 180,
    shares: 3,
  },
  {
    id: "vk_gateway_eu",
    label: "EU auditor · Gateway",
    scope: "product",
    scopeTarget: "Gateway",
    createdAt: NOW - DAY * 22,
    expiresAt: NOW + DAY * 70,
    shares: 1,
  },
  {
    id: "vk_payroll_key",
    label: "Payroll compliance key",
    scope: "product",
    scopeTarget: "Payroll",
    createdAt: NOW - DAY * 9,
    expiresAt: NOW + DAY * 356,
    shares: 2,
  },
];

export const apiKeys: ApiKey[] = [
  {
    id: "key_live_main",
    name: "Production · server",
    prefix: "uns_live_9pK2",
    environment: "live",
    scopes: ["gateway.write", "payroll.write", "invoice.write", "webhooks"],
    createdAt: NOW - DAY * 312,
    lastUsedAt: NOW - 1000 * 60 * 4,
    status: "active",
    usage7d: [8_240, 9_410, 10_120, 9_880, 11_420, 12_140, 11_980],
  },
  {
    id: "key_live_cron",
    name: "Nightly reconciliation",
    prefix: "uns_live_k81Z",
    environment: "live",
    scopes: ["reports.read", "transactions.read"],
    createdAt: NOW - DAY * 96,
    lastUsedAt: NOW - 1000 * 60 * 60 * 14,
    status: "active",
    usage7d: [120, 118, 122, 114, 125, 121, 119],
  },
  {
    id: "key_test_local",
    name: "Staging · Maya",
    prefix: "uns_test_t32K",
    environment: "test",
    scopes: ["gateway.write", "payroll.write", "reports.read"],
    createdAt: NOW - DAY * 44,
    lastUsedAt: NOW - 1000 * 60 * 60 * 2,
    status: "active",
    usage7d: [620, 540, 810, 710, 420, 960, 480],
  },
  {
    id: "key_test_mobile",
    name: "Mobile SDK · internal",
    prefix: "uns_test_m90a",
    environment: "test",
    scopes: ["tiplinks.write"],
    createdAt: NOW - DAY * 26,
    lastUsedAt: NOW - 1000 * 60 * 60 * 32,
    status: "active",
    usage7d: [80, 92, 101, 86, 77, 64, 58],
  },
  {
    id: "key_test_legacy",
    name: "Deprecated payroll test",
    prefix: "uns_test_rvkx",
    environment: "test",
    scopes: ["payroll.write"],
    createdAt: NOW - DAY * 180,
    status: "revoked",
    usage7d: [0, 0, 0, 0, 0, 0, 0],
  },
];

export const team: TeamMember[] = [
  { id: "mem_maya", name: "Maya Okonjo", email: "maya@atlaslabs.xyz", role: "Owner", lastActiveAt: NOW - 1000 * 60 * 4, twoFA: true },
  { id: "mem_sam", name: "Sam Alvarado", email: "sam@atlaslabs.xyz", role: "Admin", lastActiveAt: NOW - 1000 * 60 * 60 * 5, twoFA: true },
  { id: "mem_priya", name: "Priya Varghese", email: "priya@atlaslabs.xyz", role: "Developer", lastActiveAt: NOW - 1000 * 60 * 60 * 30, twoFA: true },
  { id: "mem_leo", name: "Leo Fernandez", email: "leo@atlaslabs.xyz", role: "Finance", lastActiveAt: NOW - 1000 * 60 * 60 * 76, twoFA: false },
  { id: "mem_nadia", name: "Nadia Faraz", email: "nadia@atlaslabs.xyz", role: "Viewer", lastActiveAt: NOW - 1000 * 60 * 60 * 148, twoFA: true },
];

export const notifications = [
  {
    id: "ntf_1",
    title: "Payroll run settled",
    body: "18 shielded transfers completed in 5m 46s.",
    timestamp: NOW - 1000 * 60 * 22,
    unread: true,
  },
  {
    id: "ntf_2",
    title: "New viewing key granted",
    body: "EU auditor · Gateway (expires in 70 days).",
    timestamp: NOW - 1000 * 60 * 60 * 6,
    unread: true,
  },
  {
    id: "ntf_3",
    title: "Invoice #INV-2026-041 paid",
    body: "14,800 USDC received from Helix Partners.",
    timestamp: NOW - 1000 * 60 * 60 * 28,
    unread: false,
  },
];

function buildVolumeSeries(): Volume30dPoint[] {
  const points: Volume30dPoint[] = [];
  for (let i = 29; i >= 0; i--) {
    const t = NOW - DAY * i;
    const trend = 60_000 + (29 - i) * 1800;
    const wobble = Math.sin(i * 0.9) * 18_000 + Math.cos(i * 0.45) * 12_000;
    const inflow = Math.max(18_000, trend + wobble + (i % 5 === 0 ? 32_000 : 0));
    const outflow = Math.max(12_000, inflow * (0.58 + Math.sin(i * 0.6) * 0.08));
    const shielded = inflow + outflow - Math.max(1_500, Math.abs(Math.sin(i)) * 4_000);
    points.push({
      t,
      inflow: Math.round(inflow),
      outflow: Math.round(outflow),
      shielded: Math.round(shielded),
    });
  }
  return points;
}

function buildTransactions(): Transaction[] {
  const seed: Array<Partial<Transaction> & Pick<Transaction, "product" | "direction" | "amount">> = [
    { product: "gateway", direction: "in", amount: 2_450.4, counterparty: "stripe-bridge", memo: "Order #882", status: "shielded" },
    { product: "payroll", direction: "out", amount: 4_200, counterparty: "alex.sol", memo: "April payroll · engineering", status: "shielded" },
    { product: "payroll", direction: "out", amount: 3_800, counterparty: "jordan.sol", memo: "April payroll · design", status: "shielded" },
    { product: "storefronts", direction: "in", amount: 128.5, counterparty: "merch.atlaslabs", memo: "Order · Ghost tee", status: "shielded" },
    { product: "gateway", direction: "in", amount: 980, counterparty: "checkout-session", memo: "Order #881", status: "shielded" },
    { product: "x402", direction: "in", amount: 0.4, counterparty: "api-client-42", memo: "Quote endpoint · 4 calls", status: "shielded" },
    { product: "invoice", direction: "in", amount: 14_800, counterparty: "Helix Partners", memo: "INV-2026-041", status: "shielded" },
    { product: "tiplinks", direction: "out", amount: 25, counterparty: "claim-link", memo: "Launch party thank-you", status: "released" },
    { product: "gateway", direction: "in", amount: 520, counterparty: "checkout-session", memo: "Order #880", status: "pending" },
    { product: "storefronts", direction: "in", amount: 64, counterparty: "arcade.atlaslabs", memo: "Order · Glitch pin", status: "shielded" },
    { product: "payroll", direction: "out", amount: 5_100, counterparty: "sam.sol", memo: "April payroll · engineering", status: "shielded" },
    { product: "invoice", direction: "in", amount: 22_000, counterparty: "Loom DAO", memo: "INV-2026-039", status: "failed" },
    { product: "x402", direction: "in", amount: 1.2, counterparty: "api-client-07", memo: "Quote endpoint · 12 calls", status: "shielded" },
    { product: "tiplinks", direction: "in", amount: 50, counterparty: "funding-wallet", memo: "Referral reward top-up", status: "shielded" },
    { product: "gateway", direction: "in", amount: 340.5, counterparty: "checkout-session", memo: "Order #879", status: "shielded" },
    { product: "storefronts", direction: "in", amount: 212, counterparty: "merch.atlaslabs", memo: "Order · Ghost hoodie", status: "shielded" },
    { product: "payroll", direction: "out", amount: 4_800, counterparty: "priya.sol", memo: "April payroll · product", status: "shielded" },
    { product: "gateway", direction: "in", amount: 1_600, counterparty: "checkout-session", memo: "Order #878", status: "shielded" },
    { product: "invoice", direction: "in", amount: 9_500, counterparty: "Kite Foundation", memo: "INV-2026-040", status: "pending" },
    { product: "storefronts", direction: "in", amount: 96, counterparty: "arcade.atlaslabs", memo: "Order · Patch pack", status: "shielded" },
    { product: "x402", direction: "in", amount: 0.8, counterparty: "api-client-17", memo: "Search endpoint · 8 calls", status: "shielded" },
    { product: "tiplinks", direction: "out", amount: 15, counterparty: "claim-link", memo: "Engineering standup", status: "released" },
    { product: "payroll", direction: "out", amount: 3_200, counterparty: "leo.sol", memo: "April payroll · operations", status: "shielded" },
    { product: "gateway", direction: "in", amount: 740, counterparty: "checkout-session", memo: "Order #877", status: "shielded" },
    { product: "storefronts", direction: "in", amount: 58, counterparty: "merch.atlaslabs", memo: "Order · Sticker pack", status: "shielded" },
  ];

  return seed.map((s, i) => {
    const timestamp = NOW - i * 1000 * 60 * 47 - (i % 4) * 1000 * 60 * 8;
    return {
      id: `tx_${i.toString().padStart(4, "0")}`,
      product: s.product,
      direction: s.direction,
      status: (s.status ?? "shielded") as TxStatus,
      amount: s.amount,
      currency: (s.product === "x402" ? "SOL" : "USDC") as "USDC" | "SOL",
      counterparty: s.counterparty ?? "",
      memo: s.memo ?? "",
      txHash: deterministicHash(i),
      timestamp,
    };
  });
}

function deterministicHash(seed: number): string {
  const alphabet = "0123456789abcdef";
  let a = (seed * 2654435761) >>> 0;
  const roll = () => {
    a = ((a * 1103515245) + 12345) >>> 0;
    return a;
  };
  const take = (n: number) => {
    let s = "";
    for (let i = 0; i < n; i++) s += alphabet[roll() % 16];
    return s;
  };
  return `${take(8)}…${take(4)}`;
}

// ─── Wallet Balances ─────────────────────────────────────────────────────────

export type WalletBalance = {
  currency: "SOL" | "USDC";
  amount: number;
  usdValue: number;
};

export type UTXO = {
  id: string;
  amount: number;
  currency: "SOL" | "USDC";
  usdValue: number;
  age: string;
  sender: string;
  status: "claimable" | "claiming" | "claimed";
};

export const publicBalances: WalletBalance[] = [
  { currency: "SOL", amount: 24.831, usdValue: 4_218.27 },
  { currency: "USDC", amount: 12_450.0, usdValue: 12_450.0 },
];

export const shieldedBalances: WalletBalance[] = [
  { currency: "SOL", amount: 8.42, usdValue: 1_431.40 },
  { currency: "USDC", amount: 5_280.0, usdValue: 5_280.0 },
];

export const unclaimedUtxos: UTXO[] = [
  { id: "utxo_1", amount: 2.5, currency: "SOL", usdValue: 425.0, age: "2h ago", sender: "7xKp…3nRf", status: "claimable" },
  { id: "utxo_2", amount: 1_200.0, currency: "USDC", usdValue: 1_200.0, age: "5h ago", sender: "Bq4R…mKw2", status: "claimable" },
  { id: "utxo_3", amount: 0.8, currency: "SOL", usdValue: 136.0, age: "1d ago", sender: "9aFx…pL7s", status: "claimable" },
  { id: "utxo_4", amount: 350.0, currency: "USDC", usdValue: 350.0, age: "2d ago", sender: "Hm3K…vQ9z", status: "claimable" },
];
