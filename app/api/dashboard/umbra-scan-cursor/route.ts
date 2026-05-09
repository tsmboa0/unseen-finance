import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { requirePrivyAuth } from "@/lib/privy";

type CursorResponse = {
  treeIndex: number;
  nextInsertionIndex: number;
};

function coerceInt(value: unknown): number | null {
  if (typeof value === "number" && Number.isInteger(value)) return value;
  if (typeof value === "string" && value.trim() !== "" && /^-?\d+$/.test(value.trim())) return Number(value);
  return null;
}

export async function GET(request: NextRequest) {
  const { merchant, error } = await requirePrivyAuth(request as unknown as Request);
  if (!merchant) {
    return NextResponse.json({ error: error ?? "Unauthorized" }, { status: 401 });
  }
  if (!merchant.walletAddress) {
    return NextResponse.json({ error: "No Solana wallet linked to this account" }, { status: 400 });
  }

  const row = await prisma.umbraUtxoScanCursor.upsert({
    where: {
      merchantId_network_walletAddress: {
        merchantId: merchant.id,
        network: merchant.network,
        walletAddress: merchant.walletAddress,
      },
    },
    create: {
      merchantId: merchant.id,
      network: merchant.network,
      walletAddress: merchant.walletAddress,
      treeIndex: 0,
      nextInsertionIndex: 0,
    },
    update: {},
    select: { treeIndex: true, nextInsertionIndex: true },
  });

  const nextInsertionIndex = Math.max(0, row.nextInsertionIndex ?? 0);
  const out: CursorResponse = {
    treeIndex: 0,
    nextInsertionIndex,
  };
  return NextResponse.json(out);
}

export async function POST(request: NextRequest) {
  const { merchant, error } = await requirePrivyAuth(request as unknown as Request);
  if (!merchant) {
    return NextResponse.json({ error: error ?? "Unauthorized" }, { status: 401 });
  }
  if (!merchant.walletAddress) {
    return NextResponse.json({ error: "No Solana wallet linked to this account" }, { status: 400 });
  }

  let body: { treeIndex?: unknown; nextInsertionIndex?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const nextInsertionIndex = body.nextInsertionIndex === undefined ? null : coerceInt(body.nextInsertionIndex);

  if (nextInsertionIndex === null) {
    return NextResponse.json({ error: "nextInsertionIndex must be an integer" }, { status: 400 });
  }
  if (nextInsertionIndex < 0) {
    return NextResponse.json({ error: "nextInsertionIndex must be >= 0" }, { status: 400 });
  }

  /** Client scans Merkle tree 0 only; persist cursor for tree 0 regardless of body.treeIndex. */
  const treeIndex = 0;

  const updated = await prisma.umbraUtxoScanCursor.upsert({
    where: {
      merchantId_network_walletAddress: {
        merchantId: merchant.id,
        network: merchant.network,
        walletAddress: merchant.walletAddress,
      },
    },
    create: {
      merchantId: merchant.id,
      network: merchant.network,
      walletAddress: merchant.walletAddress,
      treeIndex,
      nextInsertionIndex,
    },
    update: { treeIndex, nextInsertionIndex },
    select: { treeIndex: true, nextInsertionIndex: true },
  });

  const out: CursorResponse = {
    treeIndex: updated.treeIndex,
    nextInsertionIndex: updated.nextInsertionIndex,
  };
  return NextResponse.json(out);
}

