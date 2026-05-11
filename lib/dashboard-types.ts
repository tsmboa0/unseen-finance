export type Product =
  | "gateway"
  | "payroll"
  | "x402"
  | "storefronts"
  | "tiplinks"
  | "invoice"
  | "transfer"
  | "claim"
  | "shield"
  | "unshield"
  | "payment";
export type TxStatus =
  | "shielded"
  | "pending"
  | "failed"
  | "released"
  | "claimed"
  | "transferred"
  | "unshielded";
export type TxDirection = "in" | "out";

export type Transaction = {
  id: string;
  product: Product;
  direction: TxDirection;
  status: TxStatus;
  amount: number;
  currency: "USDC" | "USDT" | "SOL";
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
  currency: "USDC" | "USDT";
  /** Lifecycle includes server-delegation runs (draft → awaiting_delegation → processing → terminal). */
  status:
    | "draft"
    | "awaiting_delegation"
    | "processing"
    | "completed"
    | "partial"
    | "failed";
  scheduledFor: number;
  completedAt?: number;
  successCount?: number;
};

export type Recipient = {
  id: string;
  handle: string;
  wallet: string;
  amount: number;
  currency: "USDC" | "SOL";
  role: string;
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
  memo: string;
  amount: number;
  currency: "USDC";
  status: "active" | "redeemed" | "expired" | "pending" | "failed";
  createdAt: number;
  /** Short internal ref (id suffix). */
  code: string;
  /** Full redeemable code when issued; null while still awaiting funding. */
  claimCode: string | null;
};

export type Invoice = {
  id: string;
  number: string;
  client: string;
  email: string;
  amount: number;
  currency: "USDC" | "USDT";
  status: "draft" | "sent" | "paid" | "overdue";
  issuedAt: number;
  dueAt: number;
  paymentId: string | null;
  checkoutUrl: string | null;
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
  /** Authenticated PDF download path (relative to app origin). */
  pdfPath: string;
};

export type ViewingKey = {
  id: string;
  label: string;
  scope: "account" | "product" | "address";
  scopeTarget: string;
  createdAt: number;
  expiresAt: number;
  shares: number;
  /** Maps to persisted Umbra compliance grant when present. */
  grantStatus?: "active" | "revoked";
  receiverWallet?: string;
  receiverX25519Hex?: string;
  nonceDecimal?: string;
  onChainGrantExists?: boolean | null;
  lastChainCheckAt?: number | null;
  createTxSignature?: string | null;
  revokeTxSignature?: string | null;
};

/** Umbra Poseidon viewing key scope (mint- and UTC calendar–scoped). */
export type ScopedViewingKeyScope =
  | "mint"
  | "yearly"
  | "monthly"
  | "daily"
  | "hourly"
  | "minute"
  | "second";

export type ScopedViewingKey = {
  id: string;
  label: string;
  scope: ScopedViewingKeyScope;
  mintAddress: string;
  year?: number;
  month?: number;
  day?: number;
  hour?: number;
  minute?: number;
  second?: number;
  keyHex: string;
  createdAt: number;
};

export type TeamMember = {
  id: string;
  name: string;
  email: string;
  role: "Owner" | "Admin" | "Developer" | "Finance" | "Viewer";
  lastActiveAt: number;
  twoFA: boolean;
};

export type NotificationItem = {
  id: string;
  title: string;
  body: string;
  timestamp: number;
  unread: boolean;
};

export type DashboardOverview = {
  kpis: {
    totalVolume30d: number;
    totalVolumeDelta: number;
    shieldedShare: number;
    shieldedShareDelta: number;
    activeCustomers: number;
    activeCustomersDelta: number;
    avgSettlementMs: number;
    avgSettlementDelta: number;
    // Product-level counts (all-time)
    gatewayTxns: number;
    payrollTxns: number;
    storefrontOrders: number;
    newStorefrontOrders: number;  // confirmed in last 48h
    tiplinksTotal: number;
    invoicesTotal: number;
  };
  volume30d: Volume30dPoint[];
  productBreakdown: ProductBreakdown[];
  dailyVolume: { label: string; value: number }[];
  transactions: Transaction[];
  payrollRuns: PayrollRun[];
  payrollTemplates: { id: string; name: string; recipients: number; lastUsed: number }[];
  sampleRecipients: Recipient[];
  tiplinks: Tiplink[];
  giftCards: GiftCard[];
  invoices: Invoice[];
  complianceReports: ComplianceReport[];
  viewingKeys: ViewingKey[];
  /** Locally derived Umbra BN254 viewing keys (dashboard export only). */
  scopedViewingKeys: ScopedViewingKey[];
  team: TeamMember[];
  notifications: NotificationItem[];
};
