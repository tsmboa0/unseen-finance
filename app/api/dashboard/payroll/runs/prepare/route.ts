import { NextRequest, NextResponse } from "next/server";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/client";
import prisma from "@/lib/db";
import { isPayrollDelegationApiEnabled } from "@/lib/privy-node";
import { requirePrivyAuthForDashboard } from "@/lib/privy";
import { dashboardApiRequireMerchant } from "@/lib/dashboard-api-auth";
import type { PayrollCurrency } from "@/lib/payroll/constants";

type ItemIn = { destinationAddress?: unknown; amount?: unknown };

export async function POST(request: NextRequest) {
  if (!isPayrollDelegationApiEnabled()) {
    return NextResponse.json({ error: "Payroll delegation is not enabled." }, { status: 404 });
  }

  const auth = await requirePrivyAuthForDashboard(request as unknown as Request);
  const gate = dashboardApiRequireMerchant(auth);
  if (gate instanceof NextResponse) return gate;
  const { merchant } = gate;

  let body: { memo?: unknown; currency?: unknown; category?: unknown; items?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const memo = typeof body.memo === "string" ? body.memo.trim() : "";
  const currencyRaw = typeof body.currency === "string" ? body.currency.trim().toUpperCase() : "";
  if (!memo) return NextResponse.json({ error: "memo is required" }, { status: 400 });
  if (currencyRaw !== "USDC" && currencyRaw !== "USDT") {
    return NextResponse.json({ error: "currency must be USDC or USDT" }, { status: 400 });
  }
  const currency = currencyRaw as PayrollCurrency;

  const category = typeof body.category === "string" && body.category.trim() ? body.category.trim() : null;
  const rawItems = Array.isArray(body.items) ? body.items : [];
  if (rawItems.length === 0) {
    return NextResponse.json({ error: "items array is required" }, { status: 400 });
  }

  const items: { destinationAddress: string; amount: number }[] = [];
  for (const raw of rawItems) {
    const it = raw as ItemIn;
    const dest = typeof it.destinationAddress === "string" ? it.destinationAddress.trim() : "";
    const amt = typeof it.amount === "number" ? it.amount : Number(it.amount);
    if (!dest || !Number.isFinite(amt) || amt <= 0) {
      return NextResponse.json(
        { error: "Each item needs destinationAddress and positive numeric amount" },
        { status: 400 },
      );
    }
    items.push({ destinationAddress: dest, amount: amt });
  }

  try {
    const run = await prisma.payrollRun.create({
      data: {
        merchantId: merchant.id,
        memo,
        currency,
        category,
        status: "draft",
        recipientCount: items.length,
        successCount: 0,
        totalAmount: 0,
        items: {
          create: items.map((i) => ({
            destinationAddress: i.destinationAddress,
            amount: i.amount,
            status: "pending",
          })),
        },
      },
      include: { items: true },
    });

    return NextResponse.json({
      id: run.id,
      status: run.status,
      recipientCount: run.recipientCount,
    });
  } catch (e) {
    if (e instanceof PrismaClientKnownRequestError && e.code === "P2021") {
      return NextResponse.json(
        { error: "Payroll tables are not in the database yet. Run: npx prisma migrate deploy" },
        { status: 503 },
      );
    }
    throw e;
  }
}
