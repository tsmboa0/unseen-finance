import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import {
  PAYROLL_BATCH_COOLDOWN_MS,
  PAYROLL_BATCH_SIZE,
  PAYROLL_INTER_TX_MS,
  type PayrollCurrency,
} from "@/lib/payroll/constants";
import { resolvePrivySolanaEmbeddedWalletId } from "@/lib/payroll/resolve-privy-wallet-id";
import { getPayrollAppWalletAuthorizationContext } from "@/lib/payroll/privy-app-authorization";
import { createPayrollServerUmbraClient, depositPublicToRecipientEtaServer } from "@/lib/payroll/server-umbra-deposit";
import { getPrivyNodeClient, isPayrollDelegationApiEnabled } from "@/lib/privy-node";
import { requirePrivyAuth } from "@/lib/privy";

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function amountToDisplayString(n: number): string {
  return n.toFixed(6).replace(/\.?0+$/, "") || "0";
}

export async function POST(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  if (!isPayrollDelegationApiEnabled()) {
    return NextResponse.json({ error: "Payroll delegation is not enabled." }, { status: 404 });
  }

  const { merchant, error } = await requirePrivyAuth(request as unknown as Request);
  if (!merchant) return NextResponse.json({ error: error ?? "Unauthorized" }, { status: 401 });

  if (!merchant.walletAddress || !merchant.umbraRegistered) {
    return NextResponse.json(
      { error: "Complete Umbra registration and ensure wallet is set before payroll." },
      { status: 400 },
    );
  }

  const { id: runId } = await ctx.params;

  const run = await prisma.payrollRun.findFirst({
    where: { id: runId, merchantId: merchant.id },
    include: { items: { orderBy: { id: "asc" } } },
  });
  if (!run) return NextResponse.json({ error: "Payroll run not found" }, { status: 404 });

  const pendingItems = run.items.filter((i) => i.status === "pending");
  if (pendingItems.length === 0) {
    return NextResponse.json({ error: "No pending payroll items to execute" }, { status: 409 });
  }

  if (run.status === "awaiting_delegation" || run.status === "draft") {
    await prisma.payrollRun.update({ where: { id: run.id }, data: { status: "processing" } });
  } else if (run.status !== "processing") {
    return NextResponse.json(
      { error: `Run must be draft, awaiting_delegation, or processing (got ${run.status})` },
      { status: 409 },
    );
  }

  let authCtx: ReturnType<typeof getPayrollAppWalletAuthorizationContext>;
  try {
    authCtx = getPayrollAppWalletAuthorizationContext();
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Missing app authorization key";
    return NextResponse.json({ error: msg }, { status: 503 });
  }

  const privy = getPrivyNodeClient();
  const user = await privy.users().getByWalletAddress({ address: merchant.walletAddress });
  const walletId = resolvePrivySolanaEmbeddedWalletId(user, merchant.walletAddress);
  if (!walletId) {
    return NextResponse.json({ error: "Could not resolve Privy wallet id" }, { status: 400 });
  }

  const currency = (run.currency === "USDT" ? "USDT" : "USDC") as PayrollCurrency;
  let umbra: Awaited<ReturnType<typeof createPayrollServerUmbraClient>>;

  try {
    umbra = await createPayrollServerUmbraClient(privy, merchant, walletId, authCtx);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Umbra client error";
    console.error("[payroll][execute] createPayrollServerUmbraClient", e);
    return NextResponse.json({ error: msg }, { status: 502 });
  }

  let completedInBatch = 0;

  for (let idx = 0; idx < pendingItems.length; idx++) {
    const item = pendingItems[idx];
    try {
      const { txSignature } = await depositPublicToRecipientEtaServer({
        client: umbra,
        merchantNetwork: merchant.network,
        destinationAddress: item.destinationAddress,
        currency,
        amountDisplay: amountToDisplayString(item.amount),
      });
      await prisma.payrollRunItem.update({
        where: { id: item.id },
        data: { status: "completed", txHash: txSignature, error: null },
      });
      await prisma.dashboardEvent.create({
        data: {
          merchantId: merchant.id,
          network: merchant.network,
          walletAddress: merchant.walletAddress ?? null,
          category: "payroll",
          direction: "out",
          status: "completed",
          amount: item.amount,
          currency,
          counterparty: item.destinationAddress,
          memo: `Payroll: ${run.memo}`,
          txHash: txSignature ?? null,
        },
      });
      completedInBatch += 1;
    } catch (e) {
      const errMsg = e instanceof Error ? e.message : "Deposit failed";
      await prisma.payrollRunItem.update({
        where: { id: item.id },
        data: { status: "failed", error: errMsg },
      });
    }

    if (idx < pendingItems.length - 1) {
      await sleep(PAYROLL_INTER_TX_MS);
      if (completedInBatch >= PAYROLL_BATCH_SIZE) {
        completedInBatch = 0;
        await sleep(PAYROLL_BATCH_COOLDOWN_MS);
      }
    }
  }

  const fresh = await prisma.payrollRun.findFirst({
    where: { id: run.id },
    include: { items: true },
  });
  if (!fresh) {
    return NextResponse.json({ error: "Run disappeared" }, { status: 500 });
  }

  const ok = fresh.items.filter((i) => i.status === "completed");
  const failed = fresh.items.filter((i) => i.status === "failed");
  const successCount = ok.length;
  const totalAmount = ok.reduce((s, i) => s + i.amount, 0);
  let status: string;
  if (successCount === fresh.items.length) status = "completed";
  else if (successCount === 0) status = "failed";
  else status = "partial";

  await prisma.payrollRun.update({
    where: { id: run.id },
    data: { status, successCount, totalAmount },
  });

  return NextResponse.json({
    id: fresh.id,
    status,
    successCount,
    totalAmount,
    failedCount: failed.length,
  });
}
