import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { requirePrivyAuth } from "@/lib/privy";

type UtxoStatus = "claimable" | "claiming" | "claimed" | "claim_failed";

type UtxoKey = {
  treeIndex: number;
  insertionIndex: number;
};

type SyncUtxoInput = UtxoKey & {
  amount: number;
  currency: string;
  usdValue: number;
  sender?: string;
  age?: string;
  unlockerType?: string;
};

function coerceNonNegativeInt(value: unknown): number | null {
  if (typeof value === "number" && Number.isInteger(value) && value >= 0) return value;
  if (typeof value === "string" && /^\d+$/.test(value.trim())) return Number(value.trim());
  return null;
}

function isValidStatus(value: unknown): value is UtxoStatus {
  return value === "claimable" || value === "claiming" || value === "claimed" || value === "claim_failed";
}

function parseUtxoKeyFromId(id: string): UtxoKey | null {
  const m = /^utxo_(\d+)_(\d+)$/.exec(id.trim());
  if (!m) return null;
  return {
    treeIndex: Number(m[1]),
    insertionIndex: Number(m[2]),
  };
}

function rowToClient(row: {
  treeIndex: number;
  insertionIndex: number;
  amount: number;
  currency: string;
  usdValue: number;
  sender: string | null;
  age: string | null;
  status: string;
  unlockerType: string | null;
}) {
  return {
    id: `utxo_${row.treeIndex}_${row.insertionIndex}`,
    treeIndex: row.treeIndex,
    insertionIndex: row.insertionIndex,
    amount: row.amount,
    currency: row.currency,
    usdValue: row.usdValue,
    sender: row.sender ?? "",
    age: row.age ?? "",
    status: row.status,
    unlockerType: row.unlockerType ?? "",
  };
}

export async function GET(request: NextRequest) {
  const { merchant, error } = await requirePrivyAuth(request as unknown as Request);
  if (!merchant) {
    return NextResponse.json({ error: error ?? "Unauthorized" }, { status: 401 });
  }
  if (!merchant.walletAddress) {
    return NextResponse.json({ error: "No Solana wallet linked to this account" }, { status: 400 });
  }

  const rows = await prisma.umbraMerchantUtxo.findMany({
    where: {
      merchantId: merchant.id,
      network: merchant.network,
      walletAddress: merchant.walletAddress,
      status: { in: ["claimable", "claiming", "claim_failed"] },
    },
    orderBy: [{ treeIndex: "asc" }, { insertionIndex: "asc" }],
    select: {
      treeIndex: true,
      insertionIndex: true,
      amount: true,
      currency: true,
      usdValue: true,
      sender: true,
      age: true,
      status: true,
      unlockerType: true,
    },
  });

  return NextResponse.json({ utxos: rows.map(rowToClient) });
}

export async function POST(request: NextRequest) {
  const { merchant, error } = await requirePrivyAuth(request as unknown as Request);
  if (!merchant) {
    return NextResponse.json({ error: error ?? "Unauthorized" }, { status: 401 });
  }
  if (!merchant.walletAddress) {
    return NextResponse.json({ error: "No Solana wallet linked to this account" }, { status: 400 });
  }

  let body: { utxos?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const raw = Array.isArray(body.utxos) ? body.utxos : null;
  if (!raw) return NextResponse.json({ error: "utxos must be an array" }, { status: 400 });

  const utxos: SyncUtxoInput[] = [];
  for (const item of raw) {
    const i = item as Record<string, unknown>;
    const treeIndex = coerceNonNegativeInt(i.treeIndex);
    const insertionIndex = coerceNonNegativeInt(i.insertionIndex);
    const amount = typeof i.amount === "number" ? i.amount : Number(i.amount ?? NaN);
    const currency = typeof i.currency === "string" ? i.currency : "";
    const usdValue = typeof i.usdValue === "number" ? i.usdValue : Number(i.usdValue ?? NaN);
    if (
      treeIndex === null ||
      insertionIndex === null ||
      !Number.isFinite(amount) ||
      !currency ||
      !Number.isFinite(usdValue)
    ) {
      continue;
    }
    utxos.push({
      treeIndex,
      insertionIndex,
      amount,
      currency,
      usdValue,
      sender: typeof i.sender === "string" ? i.sender : "",
      age: typeof i.age === "string" ? i.age : "",
      unlockerType: typeof i.unlockerType === "string" ? i.unlockerType : "",
    });
  }

  if (utxos.length === 0) return NextResponse.json({ upserted: 0 });

  await prisma.$transaction(
    utxos.map((u) =>
      prisma.umbraMerchantUtxo.upsert({
        where: {
          merchantId_network_walletAddress_treeIndex_insertionIndex: {
            merchantId: merchant.id,
            network: merchant.network,
            walletAddress: merchant.walletAddress!,
            treeIndex: u.treeIndex,
            insertionIndex: u.insertionIndex,
          },
        },
        create: {
          merchantId: merchant.id,
          network: merchant.network,
          walletAddress: merchant.walletAddress!,
          treeIndex: u.treeIndex,
          insertionIndex: u.insertionIndex,
          amount: u.amount,
          currency: u.currency,
          usdValue: u.usdValue,
          sender: u.sender ?? "",
          age: u.age ?? "",
          unlockerType: u.unlockerType ?? "",
          status: "claimable",
          lastSeenAt: new Date(),
        },
        update: {
          amount: u.amount,
          currency: u.currency,
          usdValue: u.usdValue,
          sender: u.sender ?? "",
          age: u.age ?? "",
          unlockerType: u.unlockerType ?? "",
          lastSeenAt: new Date(),
        },
      }),
    ),
  );

  return NextResponse.json({ upserted: utxos.length });
}

export async function PATCH(request: NextRequest) {
  const { merchant, error } = await requirePrivyAuth(request as unknown as Request);
  if (!merchant) {
    return NextResponse.json({ error: error ?? "Unauthorized" }, { status: 401 });
  }
  if (!merchant.walletAddress) {
    return NextResponse.json({ error: "No Solana wallet linked to this account" }, { status: 400 });
  }

  let body: { ids?: unknown; status?: unknown; claimTxSignature?: unknown; claimError?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!isValidStatus(body.status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const ids = Array.isArray(body.ids) ? body.ids.filter((i): i is string => typeof i === "string") : [];
  const keys = ids.map(parseUtxoKeyFromId).filter((k): k is UtxoKey => Boolean(k));
  if (keys.length === 0) return NextResponse.json({ updated: 0 });

  const claimTxSignature = typeof body.claimTxSignature === "string" ? body.claimTxSignature : null;
  const claimError = typeof body.claimError === "string" ? body.claimError : null;
  const nextStatus: UtxoStatus = body.status;

  const updates = await prisma.$transaction(
    keys.map((k) =>
      prisma.umbraMerchantUtxo.updateMany({
        where: {
          merchantId: merchant.id,
          network: merchant.network,
          walletAddress: merchant.walletAddress!,
          treeIndex: k.treeIndex,
          insertionIndex: k.insertionIndex,
        },
        data: {
          status: nextStatus,
          claimTxSignature: nextStatus === "claimed" ? claimTxSignature : undefined,
          claimError: nextStatus === "claim_failed" ? claimError : undefined,
          claimedAt: nextStatus === "claimed" ? new Date() : undefined,
        },
      }),
    ),
  );

  const updated = updates.reduce((sum, u) => sum + u.count, 0);
  return NextResponse.json({ updated });
}
