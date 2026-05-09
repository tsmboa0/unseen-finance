import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { requirePrivyAuth } from "@/lib/privy";
import type { DashboardOverview, Product, Transaction } from "@/lib/dashboard-types";

const DAY_MS = 24 * 60 * 60 * 1000;
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
    select: { id: true, totalAmount: true, createdAt: true },
  });

  const invoices = payments
    .filter((p) => productFromReference(p.reference) === "invoice")
    .map((p, idx) => ({
      id: p.id,
      number: `INV-${new Date(p.createdAt).getUTCFullYear()}-${String(idx + 1).padStart(3, "0")}`,
      client: p.reference ?? "Client",
      email: merchant.email ?? "",
      amount: Number(p.amount) / 1_000_000,
      currency: "USDC" as const,
      status: (
        p.status === "CONFIRMED" ? "paid" : p.status === "PENDING" ? "sent" : p.status === "EXPIRED" ? "overdue" : "draft"
      ) as "draft" | "sent" | "paid" | "overdue",
      issuedAt: p.createdAt.getTime(),
      dueAt: p.createdAt.getTime() + 7 * DAY_MS,
    }));

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
    },
    volume30d,
    productBreakdown,
    dailyVolume,
    transactions,
    payrollRuns: [],
    payrollTemplates: [],
    sampleRecipients: [],
    tiplinks: [],
    giftCards: [],
    invoices,
    complianceReports: [],
    viewingKeys: [],
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
      orders30d: orders.filter((o) => o.createdAt.getTime() >= from30d).length,
      revenue30d: orders.reduce((sum, o) => sum + Number(o.totalAmount) / 1_000_000, 0),
      createdAt: s.createdAt.getTime(),
    })),
  });
}
