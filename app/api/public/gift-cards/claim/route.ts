import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { hashClaimCode, normalizeClaimCode } from "@/lib/gift-cards/claim-code";
import {
  loadPublicGiftClaimBaselineMap,
  publicGiftRecipientKey,
  upsertPublicGiftClaimBaseline,
} from "@/lib/gift-cards/public-gift-claim-cursor";
import { createAndClaimSelfGiftUtxo } from "@/lib/gift-cards/umbra-gift-payout";
import { isValidSolanaAddress } from "@/lib/payroll-recipients";

export async function POST(request: Request) {
  let body: { code?: string; recipientAddress?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const raw = typeof body.code === "string" ? body.code : "";
  const recipientAddress = typeof body.recipientAddress === "string" ? body.recipientAddress.trim() : "";
  const normalized = normalizeClaimCode(raw);

  if (normalized.length < 8) {
    return NextResponse.json({ error: "Enter the full claim code" }, { status: 400 });
  }
  if (!recipientAddress || !isValidSolanaAddress(recipientAddress)) {
    return NextResponse.json({ error: "Connect a valid Solana wallet" }, { status: 400 });
  }

  const claimCodeHash = hashClaimCode(normalized);

  const gift = await prisma.giftCard.findUnique({ where: { claimCodeHash } });
  if (!gift) {
    return NextResponse.json({ error: "Invalid code" }, { status: 404 });
  }

  if (gift.expiresAt.getTime() < Date.now()) {
    if (gift.status === "active") {
      await prisma.giftCard.update({ where: { id: gift.id }, data: { status: "expired" } });
    }
    return NextResponse.json({ error: "This gift has expired" }, { status: 400 });
  }

  if (gift.status !== "active") {
    return NextResponse.json({ error: "This gift is not redeemable" }, { status: 400 });
  }

  const locked = await prisma.$transaction(async (tx) => {
    const g = await tx.giftCard.findFirst({
      where: { id: gift.id, status: "active" },
    });
    if (!g) return null;
    await tx.giftCard.update({
      where: { id: g.id },
      data: { status: "claim_pending", claimError: null },
    });
    return g;
  });

  if (!locked) {
    return NextResponse.json({ error: "This gift is not redeemable" }, { status: 409 });
  }

  const recipientKey = publicGiftRecipientKey(recipientAddress, gift.network);

  try {
    const claimedBaseline = await loadPublicGiftClaimBaselineMap(recipientKey, gift.network);
    const payout = await createAndClaimSelfGiftUtxo({
      merchantNetwork: gift.network,
      recipientAddress,
      faceAmountRaw: gift.faceAmountRaw,
      mint: gift.mint,
      claimedUtxoBaselineByTree: claimedBaseline,
    });

    await Promise.all([
      prisma.giftCard.update({
        where: { id: gift.id },
        data: {
          status: "claimed",
          createUtxoTxSig: payout.createTxSig,
          claimTxSig: payout.claimTxSig,
          claimedAt: new Date(),
        },
      }),
      upsertPublicGiftClaimBaseline({
        recipientKey,
        network: gift.network,
        treeIndex: payout.claimedTreeIndex,
        insertionIndex: BigInt(payout.claimedInsertionIndex),
      }),
    ]);

    return NextResponse.json({
      ok: true,
      claimTxSig: payout.claimTxSig,
      amountDisplay: gift.amountDisplay,
      memo: gift.memo,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Claim failed";
    await prisma.giftCard.update({
      where: { id: gift.id },
      data: {
        status: "active",
        claimError: message,
      },
    });
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
