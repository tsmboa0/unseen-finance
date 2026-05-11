import { NextRequest, NextResponse } from "next/server";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/client";
import { Prisma } from "@prisma/client";
import prisma from "@/lib/db";
import { appBaseUrl } from "@/lib/invoice/app-base-url";
import { invoicePayAbsoluteUrl } from "@/lib/invoice/invoice-pay-url";
import { requirePrivyAuth } from "@/lib/privy";
import type {
  ComplianceReport,
  DashboardOverview,
  GiftCard,
  Invoice,
  PayrollRun,
  Product,
  ScopedViewingKey,
  ScopedViewingKeyScope,
  Transaction,
  ViewingKey,
} from "@/lib/dashboard-types";

const DAY_MS = 24 * 60 * 60 * 1000;

function formatBytesUi(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MB`;
}
const PRODUCT_LABELS: Record<Product, string> = {
  gateway: "Gateway",
  payroll: "Payroll",
  storefronts: "Storefronts",
  x402: "x402",
  invoice: "Invoice",
  tiplinks: "Tiplinks",
  transfer: "Transfer",
  claim: "Claim",
  shield: "Shield",
  unshield: "Unshield",
  payment: "Payment",
};

function productFromReference(reference: string | null): Product {
  const v = (reference ?? "").toLowerCase();
  if (v.includes("payroll")) return "payroll";
  if (v.includes("invoice")) return "invoice";
  if (v.includes("tip")) return "tiplinks";
  if (v.includes("store")) return "storefronts";
  if (v.includes("x402")) return "x402";
  return "gateway";
}

function txStatusFromPayment(status: string): Transaction["status"] {
  if (status === "CONFIRMED") return "shielded";
  if (status === "EXPIRED" || status === "CANCELLED") return "failed";
  return "pending";
}

function txStatusFromEvent(category: string, status: string): Transaction["status"] {
  if (status === "failed") return "failed";
  if (status === "pending") return "pending";
  if (category === "claim") return "claimed";
  if (category === "transfer") return "transferred";
  if (category === "unshield") return "unshielded";
  if (category === "payroll") return "released";
  return "shielded";
}

function startOfUtcDay(ts: number): number {
  const d = new Date(ts);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

export async function GET(request: NextRequest) {
  const { merchant, error } = await requirePrivyAuth(request as unknown as Request);
  if (!merchant) return NextResponse.json({ error: error ?? "Unauthorized" }, { status: 401 });

  const merchantCreatedAt = merchant.createdAt.getTime();
  const now = Date.now();
  const from30d = Math.max(merchantCreatedAt, now - 30 * DAY_MS);
  const from7d = Math.max(merchantCreatedAt, now - 6 * DAY_MS);

  const payments = await prisma.payment.findMany({
    where: { merchantId: merchant.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      amount: true,
      mint: true,
      reference: true,
      description: true,
      status: true,
      txSignature: true,
      createdAt: true,
      confirmedAt: true,
    },
  });

  const claimedUtxos = merchant.walletAddress
    ? await prisma.umbraMerchantUtxo.findMany({
        where: {
          merchantId: merchant.id,
          network: merchant.network,
          walletAddress: merchant.walletAddress,
          status: "claimed",
        },
        orderBy: { claimedAt: "desc" },
        select: {
          id: true,
          amount: true,
          currency: true,
          sender: true,
          treeIndex: true,
          insertionIndex: true,
          claimTxSignature: true,
          claimedAt: true,
          updatedAt: true,
        },
      })
    : [];

  const dashboardEvents = await prisma.dashboardEvent.findMany({
    where: { merchantId: merchant.id, createdAt: { gte: new Date(merchantCreatedAt) } },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      category: true,
      direction: true,
      status: true,
      amount: true,
      currency: true,
      counterparty: true,
      memo: true,
      txHash: true,
      createdAt: true,
    },
  });

  const paymentTransactions: Transaction[] = payments.map((p) => {
    const timestamp = (p.confirmedAt ?? p.createdAt).getTime();
    const product = productFromReference(p.reference);
    const amount = Number(p.amount) / 1_000_000;
    const currency: "USDC" | "SOL" = p.mint.toLowerCase().includes("sol") ? "SOL" : "USDC";
    return {
      id: p.id,
      product,
      direction: "in",
      status: txStatusFromPayment(p.status),
      amount,
      currency,
      counterparty: p.reference ?? "Unknown",
      memo: p.description ?? p.reference ?? "Payment",
      txHash: p.txSignature ? `${p.txSignature.slice(0, 4)}…${p.txSignature.slice(-4)}` : "—",
      timestamp,
    };
  });

  const claimTransactions: Transaction[] = claimedUtxos.map((u) => ({
    id: `claim_${u.id}`,
    product: "gateway",
    direction: "in",
    status: "claimed",
    amount: u.amount,
    currency: u.currency === "SOL" ? "SOL" : "USDC",
    counterparty: u.sender || "Umbra claim",
    memo: `Claimed UTXO ${u.treeIndex}:${u.insertionIndex}`,
    txHash: u.claimTxSignature ? `${u.claimTxSignature.slice(0, 4)}…${u.claimTxSignature.slice(-4)}` : "—",
    timestamp: (u.claimedAt ?? u.updatedAt).getTime(),
  }));

  const eventTransactions: Transaction[] = dashboardEvents.map((e) => ({
    id: `evt_${e.id}`,
    product: (["gateway","payroll","x402","storefronts","tiplinks","invoice","transfer","claim","shield","unshield","payment"].includes(e.category)
      ? e.category
      : "payment") as Product,
    direction: e.direction === "out" ? "out" : "in",
    status: txStatusFromEvent(e.category, e.status),
    amount: e.amount,
    currency: e.currency === "SOL" ? "SOL" : e.currency === "USDT" ? "USDT" : "USDC",
    counterparty: e.counterparty ?? "Unknown",
    memo: e.memo ?? e.category,
    txHash: e.txHash ? `${e.txHash.slice(0, 4)}…${e.txHash.slice(-4)}` : "—",
    timestamp: e.createdAt.getTime(),
  }));

  const transactions: Transaction[] = [...paymentTransactions, ...claimTransactions, ...eventTransactions].sort(
    (a, b) => b.timestamp - a.timestamp,
  );

  const tx30d = transactions.filter((t) => t.timestamp >= from30d);
  const totalVolume30d = tx30d.reduce((s, t) => s + t.amount, 0);
  const shieldedVolume30d = tx30d.filter((t) => t.status === "shielded").reduce((s, t) => s + t.amount, 0);
  const shieldedShare = totalVolume30d > 0 ? (shieldedVolume30d / totalVolume30d) * 100 : 0;

  const volumeByDay = new Map<number, { inflow: number; outflow: number; shielded: number }>();
  for (const t of tx30d) {
    const day = startOfUtcDay(t.timestamp);
    const v = volumeByDay.get(day) ?? { inflow: 0, outflow: 0, shielded: 0 };
    if (t.direction === "in") v.inflow += t.amount;
    else v.outflow += t.amount;
    if (t.status === "shielded") v.shielded += t.amount;
    volumeByDay.set(day, v);
  }

  const volume30d = Array.from({ length: 30 }).map((_, i) => {
    const dayTs = startOfUtcDay(from30d + i * DAY_MS);
    const v = volumeByDay.get(dayTs) ?? { inflow: 0, outflow: 0, shielded: 0 };
    return { t: dayTs, ...v };
  });

  const dailyVolume = Array.from({ length: 7 }).map((_, i) => {
    const ts = startOfUtcDay(from7d + i * DAY_MS);
    const d = new Date(ts);
    const label = d.toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" });
    const value = (volumeByDay.get(ts)?.inflow ?? 0) + (volumeByDay.get(ts)?.outflow ?? 0);
    return { label, value };
  });

  const productTotals = new Map<Product, number>();
  for (const t of tx30d) productTotals.set(t.product, (productTotals.get(t.product) ?? 0) + t.amount);
  const productBreakdown = (Array.from(productTotals.entries()) as [Product, number][])
    .map(([product, volume]) => ({
      product,
      label: PRODUCT_LABELS[product],
      volume,
      share: totalVolume30d > 0 ? (volume / totalVolume30d) * 100 : 0,
    }))
    .sort((a, b) => b.volume - a.volume);

  const stores = await prisma.store.findMany({
    where: { merchantId: merchant.id },
    select: { id: true, name: true, createdAt: true, status: true, currency: true },
    orderBy: { createdAt: "desc" },
  });

  const orders = await prisma.order.findMany({
    where: { store: { merchantId: merchant.id } },
    select: {
      id: true,
      totalAmount: true,
      createdAt: true,
      payment: { select: { status: true, confirmedAt: true } },
    },
  });

  const confirmedOrders = orders.filter((o) => o.payment.status === "CONFIRMED");
  const newOrderCutoff = now - 48 * 60 * 60 * 1000;
  const newStorefrontOrders = confirmedOrders.filter(
    (o) => o.payment.confirmedAt && o.payment.confirmedAt.getTime() > newOrderCutoff,
  ).length;

  type MerchantInvoiceWithPay = Prisma.MerchantInvoiceGetPayload<{
    include: { payment: { select: { id: true; status: true } } };
  }>;
  let merchantInvoicesRows: MerchantInvoiceWithPay[] = [];
  try {
    merchantInvoicesRows = await prisma.merchantInvoice.findMany({
      where: { merchantId: merchant.id },
      orderBy: { createdAt: "desc" },
      take: 80,
      include: { payment: { select: { id: true, status: true } } },
    });
  } catch (e) {
    if (!(e instanceof PrismaClientKnownRequestError) || e.code !== "P2021") throw e;
  }

  const appPublic = appBaseUrl();
  const invoices = merchantInvoicesRows.map((inv) => {
    const pay = inv.payment;
    let status: Invoice["status"] = "draft";
    if (pay?.status === "CONFIRMED") status = "paid";
    else if (pay?.status === "EXPIRED" || pay?.status === "CANCELLED") status = "overdue";
    else if (pay?.status === "PENDING") {
      status = inv.dueAt.getTime() < Date.now() ? "overdue" : "sent";
    }
    return {
      id: inv.id,
      number: inv.invoiceNumber,
      client: inv.clientName,
      email: inv.clientEmail ?? "",
      amount: inv.subtotalDisplay,
      currency: (inv.currency === "USDT" ? "USDT" : "USDC") as Invoice["currency"],
      status,
      issuedAt: inv.issuedAt.getTime(),
      dueAt: inv.dueAt.getTime(),
      paymentId: inv.paymentId,
      checkoutUrl: inv.paymentId ? invoicePayAbsoluteUrl(appPublic, inv.paymentId) : null,
    };
  });

  let payrollRunRows: Awaited<ReturnType<typeof prisma.payrollRun.findMany>> = [];
  try {
    payrollRunRows = await prisma.payrollRun.findMany({
      where: { merchantId: merchant.id },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
  } catch (e) {
    // Migration not applied yet (e.g. PayrollRun table missing)
    if (!(e instanceof PrismaClientKnownRequestError) || e.code !== "P2021") throw e;
  }

  const payrollRuns: PayrollRun[] = payrollRunRows.map((r) => {
    let category: PayrollRun["category"] = "Employees";
    if (r.category === "Contractors" || r.category === "Advisors" || r.category === "Partners") {
      category = r.category;
    }
    const ts = r.createdAt.getTime();
    return {
      id: r.id,
      memo: r.memo,
      category,
      recipientCount: r.recipientCount,
      total: r.totalAmount,
      currency: r.currency === "USDT" ? "USDT" : "USDC",
      status: r.status as PayrollRun["status"],
      scheduledFor: ts,
      completedAt: ts,
      successCount: r.successCount,
    };
  });

  const notifications = transactions.slice(0, 6).map((t) => ({
    id: t.id,
    title: `${PRODUCT_LABELS[t.product]} payment ${t.status}`,
    body: `${t.memo} • ${t.amount.toFixed(2)} ${t.currency}`,
    timestamp: t.timestamp,
    unread: t.status === "pending",
  }));

  const team = [
    {
      id: merchant.id,
      name: merchant.ownerName ?? merchant.name,
      email: merchant.email ?? "",
      role: "Owner" as const,
      lastActiveAt: now,
      twoFA: true,
    },
  ];

  const allGatewayTxns = transactions.filter(
    (t) => t.product === "gateway" && t.status === "shielded",
  ).length;
  const allPayrollTxns = transactions.filter(
    (t) => t.product === "payroll",
  ).length;
  const allTiplinks = transactions.filter(
    (t) => t.product === "tiplinks",
  ).length;
  const allInvoices = merchantInvoicesRows.length;

  let giftCardRows: Awaited<ReturnType<typeof prisma.giftCard.findMany>> = [];
  try {
    giftCardRows = await prisma.giftCard.findMany({
      where: { merchantId: merchant.id },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
  } catch (e) {
    if (!(e instanceof PrismaClientKnownRequestError) || e.code !== "P2021") throw e;
  }

  const giftCards: GiftCard[] = giftCardRows.map((g) => {
    let status: GiftCard["status"] = "active";
    if (g.status === "claimed") status = "redeemed";
    else if (g.status === "expired") status = "expired";
    else if (g.status === "pending_funding") status = "pending";
    else if (g.status === "claim_failed" || g.status === "funding_failed") status = "failed";
    return {
      id: g.id,
      memo: g.memo,
      amount: g.amountDisplay,
      currency: "USDC" as const,
      status,
      createdAt: g.createdAt.getTime(),
      code: `····${g.id.slice(-6)}`,
      claimCode: g.claimCodePlain ?? null,
    };
  });

  let complianceGrantRows: Awaited<ReturnType<typeof prisma.complianceGrant.findMany>> = [];
  let complianceReportRows: Awaited<ReturnType<typeof prisma.complianceDisclosureReport.findMany>> = [];
  try {
    complianceGrantRows = await prisma.complianceGrant.findMany({
      where: { merchantId: merchant.id },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    complianceReportRows = await prisma.complianceDisclosureReport.findMany({
      where: { merchantId: merchant.id },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
  } catch (e) {
    if (!(e instanceof PrismaClientKnownRequestError) || e.code !== "P2021") throw e;
  }

  const complianceReports: ComplianceReport[] = complianceReportRows.map((r) => {
    let products: Product[] = [];
    try {
      const parsed = JSON.parse(r.productsJson) as unknown;
      if (Array.isArray(parsed)) {
        products = parsed.filter((p): p is Product => typeof p === "string");
      }
    } catch {
      products = [];
    }

    let status: ComplianceReport["status"] = "ready";
    if (r.status === "generating") status = "generating";
    else if (r.status === "expired") status = "expired";

    const approx = r.approxSizeBytes ?? 48_000;
    return {
      id: r.id,
      title: r.title,
      range: { from: r.dateFrom.getTime(), to: r.dateTo.getTime() },
      products: products.length > 0 ? products : (["gateway", "payroll", "storefronts", "x402", "invoice", "tiplinks"] as Product[]),
      recipient: r.recipientEmail ?? "—",
      generatedAt: r.generatedAt.getTime(),
      status,
      size: formatBytesUi(approx),
      pdfPath: `/api/dashboard/compliance/reports/${r.id}/pdf`,
    };
  });

  let scopedViewingKeyRows: Awaited<ReturnType<typeof prisma.umbraScopedViewingKey.findMany>> = [];
  try {
    scopedViewingKeyRows = await prisma.umbraScopedViewingKey.findMany({
      where: { merchantId: merchant.id },
      orderBy: { createdAt: "desc" },
      take: 200,
    });
  } catch (e) {
    if (!(e instanceof PrismaClientKnownRequestError) || e.code !== "P2021") throw e;
  }

  const scopedViewingKeys: ScopedViewingKey[] = scopedViewingKeyRows.map((row) => {
    const scope = row.scope as ScopedViewingKeyScope;
    return {
      id: row.id,
      label: row.label,
      scope,
      mintAddress: row.mintAddress,
      year: row.year ?? undefined,
      month: row.month ?? undefined,
      day: row.day ?? undefined,
      hour: row.hour ?? undefined,
      minute: row.minute ?? undefined,
      second: row.second ?? undefined,
      keyHex: row.keyHex,
      createdAt: row.createdAt.getTime(),
    };
  });

  const viewingKeys: ViewingKey[] = complianceGrantRows.map((g) => {
    const w = g.receiverWallet;
    const short = w.length > 12 ? `${w.slice(0, 4)}…${w.slice(-4)}` : w;
    const tenYears = 10 * 365 * DAY_MS;
    return {
      id: g.id,
      label: g.label,
      scope: "account" as const,
      scopeTarget: short,
      createdAt: g.createdAt.getTime(),
      expiresAt: g.revokedAt?.getTime() ?? g.createdAt.getTime() + tenYears,
      shares: g.status === "active" ? 1 : 0,
      grantStatus: g.status === "active" ? "active" : "revoked",
      receiverWallet: g.receiverWallet,
      receiverX25519Hex: g.receiverX25519Hex,
      nonceDecimal: g.nonceDecimal,
      onChainGrantExists: g.lastChainCheckExists ?? null,
      lastChainCheckAt: g.lastChainCheckAt?.getTime() ?? null,
      createTxSignature: g.createTxSignature,
      revokeTxSignature: g.revokeTxSignature,
    };
  });

  const overview: DashboardOverview = {
    kpis: {
      totalVolume30d,
      totalVolumeDelta: 0,
      shieldedShare,
      shieldedShareDelta: 0,
      activeCustomers: new Set(transactions.map((t) => t.counterparty)).size,
      activeCustomersDelta: 0,
      avgSettlementMs: 0,
      avgSettlementDelta: 0,
      gatewayTxns: allGatewayTxns,
      payrollTxns: allPayrollTxns,
      storefrontOrders: confirmedOrders.length,
      newStorefrontOrders,
      tiplinksTotal: allTiplinks,
      invoicesTotal: allInvoices,
    },
    volume30d,
    productBreakdown,
    dailyVolume,
    transactions,
    payrollRuns,
    payrollTemplates: [],
    sampleRecipients: [],
    tiplinks: [],
    giftCards,
    invoices,
    complianceReports,
    viewingKeys,
    scopedViewingKeys,
    team,
    notifications,
  };

  return NextResponse.json({
    overview,
    stores: stores.map((s) => ({
      id: s.id,
      name: s.name,
      subdomain: s.id,
      currency: s.currency,
      privacy: "shielded",
      status: s.status,
      orders30d: confirmedOrders.filter((o) => o.createdAt.getTime() >= from30d).length,
      revenue30d: confirmedOrders.reduce((sum, o) => sum + Number(o.totalAmount) / 1_000_000, 0),
      createdAt: s.createdAt.getTime(),
    })),
  });
}
