import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { requirePrivyAuthForDashboard } from "@/lib/privy";
import { dashboardApiRequireMerchant } from "@/lib/dashboard-api-auth";

type EventInput = {
  category?: unknown;
  direction?: unknown;
  status?: unknown;
  amount?: unknown;
  currency?: unknown;
  counterparty?: unknown;
  memo?: unknown;
  txHash?: unknown;
  metadata?: unknown;
};

export async function POST(request: NextRequest) {
  const auth = await requirePrivyAuthForDashboard(request as unknown as Request);
  const gate = dashboardApiRequireMerchant(auth);
  if (gate instanceof NextResponse) return gate;
  const { merchant } = gate;

  let body: EventInput;
  try {
    body = (await request.json()) as EventInput;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const category = typeof body.category === "string" ? body.category : "";
  const direction = typeof body.direction === "string" ? body.direction : "in";
  const status = typeof body.status === "string" ? body.status : "completed";
  const amount = typeof body.amount === "number" ? body.amount : Number(body.amount ?? NaN);
  const currency = typeof body.currency === "string" ? body.currency : "";
  if (!category || !Number.isFinite(amount) || !currency) {
    return NextResponse.json({ error: "category, amount, currency are required" }, { status: 400 });
  }

  await prisma.dashboardEvent.create({
    data: {
      merchantId: merchant.id,
      network: merchant.network,
      walletAddress: merchant.walletAddress ?? null,
      category,
      direction,
      status,
      amount,
      currency,
      counterparty: typeof body.counterparty === "string" ? body.counterparty : null,
      memo: typeof body.memo === "string" ? body.memo : null,
      txHash: typeof body.txHash === "string" ? body.txHash : null,
      metadata:
        body.metadata && typeof body.metadata === "object"
          ? JSON.stringify(body.metadata)
          : typeof body.metadata === "string"
            ? body.metadata
            : null,
    },
  });

  return NextResponse.json({ ok: true });
}
