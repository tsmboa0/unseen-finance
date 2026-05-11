import { NextRequest, NextResponse } from "next/server";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/client";
import prisma from "@/lib/db";
import { requirePrivyAuth } from "@/lib/privy";

type ItemInput = {
  destinationAddress?: unknown;
  amount?: unknown;
  status?: unknown;
  txHash?: unknown;
  error?: unknown;
};

export async function POST(request: NextRequest) {
  const { merchant, error } = await requirePrivyAuth(request as unknown as Request);
  if (!merchant) return NextResponse.json({ error: error ?? "Unauthorized" }, { status: 401 });

  let body: {
    memo?: unknown;
    currency?: unknown;
    category?: unknown;
    items?: unknown;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const memo = typeof body.memo === "string" ? body.memo.trim() : "";
  const currency = typeof body.currency === "string" ? body.currency.trim().toUpperCase() : "";
  if (!memo) return NextResponse.json({ error: "memo is required" }, { status: 400 });
  if (currency !== "USDC" && currency !== "USDT") {
    return NextResponse.json({ error: "currency must be USDC or USDT" }, { status: 400 });
  }

  const category = typeof body.category === "string" && body.category.trim() ? body.category.trim() : null;
  const rawItems = Array.isArray(body.items) ? body.items : [];
  if (rawItems.length === 0) {
    return NextResponse.json({ error: "items array is required" }, { status: 400 });
  }

  const items: { destinationAddress: string; amount: number; status: string; txHash: string | null; error: string | null }[] = [];

  for (const raw of rawItems) {
    const it = raw as ItemInput;
    const dest = typeof it.destinationAddress === "string" ? it.destinationAddress.trim() : "";
    const amt = typeof it.amount === "number" ? it.amount : Number(it.amount);
    const st = typeof it.status === "string" ? it.status : "";
    if (!dest || !Number.isFinite(amt)) {
      return NextResponse.json({ error: "Each item needs destinationAddress and numeric amount" }, { status: 400 });
    }
    if (st !== "completed" && st !== "failed") {
      return NextResponse.json({ error: "Each item status must be completed or failed" }, { status: 400 });
    }
    items.push({
      destinationAddress: dest,
      amount: amt,
      status: st,
      txHash: typeof it.txHash === "string" && it.txHash ? it.txHash : null,
      error: typeof it.error === "string" && it.error ? it.error : null,
    });
  }

  const successCount = items.filter((i) => i.status === "completed").length;
  const totalAmount = items.filter((i) => i.status === "completed").reduce((s, i) => s + i.amount, 0);
  let status: string;
  if (successCount === items.length) status = "completed";
  else if (successCount === 0) status = "failed";
  else status = "partial";

  let run: Awaited<ReturnType<typeof prisma.payrollRun.create>>;
  try {
    run = await prisma.payrollRun.create({
      data: {
        merchantId: merchant.id,
        memo,
        currency,
        category,
        status,
        recipientCount: items.length,
        successCount,
        totalAmount,
        items: {
          create: items.map((i) => ({
            destinationAddress: i.destinationAddress,
            amount: i.amount,
            status: i.status,
            txHash: i.txHash,
            error: i.error,
          })),
        },
      },
      include: { items: true },
    });
  } catch (e) {
    if (e instanceof PrismaClientKnownRequestError && e.code === "P2021") {
      return NextResponse.json(
        {
          error:
            "Payroll tables are not in the database yet. Run: npx prisma migrate deploy",
        },
        { status: 503 },
      );
    }
    throw e;
  }

  return NextResponse.json({ id: run.id, status: run.status, successCount: run.successCount, totalAmount: run.totalAmount });
}
