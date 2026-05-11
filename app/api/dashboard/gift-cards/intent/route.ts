import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import prisma from "@/lib/db";
import { requirePrivyAuth } from "@/lib/privy";
import { GIFT_MAX_FACE_RAW, GIFT_MIN_FACE_RAW, fundTotalRawForFace, giftMint, platformFeeRawForFace } from "@/lib/gift-cards/constants";
import { giftAdminTokenAta, getGiftAdminSigner } from "@/lib/gift-cards/admin-wallet";
import { toPayrollRawUnits } from "@/lib/payroll/constants";
import { getDefaultSolanaEndpoints } from "@/lib/solana-endpoints";

const DEFAULT_VALIDITY_DAYS = 90;
const MAX_MEMO = 500;

export async function POST(request: Request) {
  const { merchant, error } = await requirePrivyAuth(request);
  if (!merchant) return NextResponse.json({ error: error ?? "Unauthorized" }, { status: 401 });

  let body: { amount?: string; memo?: string; validityDays?: number };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const amountStr = typeof body.amount === "string" ? body.amount.trim() : "";
  const memo = typeof body.memo === "string" ? body.memo.trim().slice(0, MAX_MEMO) : "";
  const validityDays =
    typeof body.validityDays === "number" && Number.isFinite(body.validityDays)
      ? Math.min(365, Math.max(1, Math.floor(body.validityDays)))
      : DEFAULT_VALIDITY_DAYS;

  if (!amountStr || !memo) {
    return NextResponse.json({ error: "amount and memo are required" }, { status: 400 });
  }

  let faceRaw: bigint;
  try {
    faceRaw = toPayrollRawUnits(amountStr, 6);
  } catch {
    return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
  }

  if (faceRaw < GIFT_MIN_FACE_RAW || faceRaw > GIFT_MAX_FACE_RAW) {
    return NextResponse.json(
      { error: "Amount out of allowed range for gift cards." },
      { status: 400 },
    );
  }

  const platformFeeRaw = platformFeeRawForFace(faceRaw);
  const fundAmountRaw = fundTotalRawForFace(faceRaw);
  const mint = giftMint("USDC", merchant.network);
  const signer = await getGiftAdminSigner();
  const adminPubkey = String(signer.address);
  const payToAssociatedTokenAccount = await giftAdminTokenAta(adminPubkey, mint);
  const endpoints = getDefaultSolanaEndpoints(merchant.network);

  const pendingHash = `pending_${randomBytes(24).toString("hex")}`;
  const amountDisplay = Number(amountStr);
  if (!Number.isFinite(amountDisplay) || amountDisplay <= 0) {
    return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
  }

  const expiresAt = new Date(Date.now() + validityDays * 24 * 60 * 60 * 1000);

  const gift = await prisma.giftCard.create({
    data: {
      merchantId: merchant.id,
      network: merchant.network,
      status: "pending_funding",
      amountDisplay,
      faceAmountRaw: faceRaw,
      fundAmountRaw,
      platformFeeRaw,
      mint,
      memo,
      claimCodeHash: pendingHash,
      expiresAt,
    },
  });

  return NextResponse.json({
    giftId: gift.id,
    fundAmountRaw: fundAmountRaw.toString(),
    platformFeeRaw: platformFeeRaw.toString(),
    faceAmountRaw: faceRaw.toString(),
    mint,
    payToWallet: adminPubkey,
    payToAssociatedTokenAccount,
    rpcUrl: endpoints.rpcUrl,
    expiresAt: expiresAt.toISOString(),
  });
}
