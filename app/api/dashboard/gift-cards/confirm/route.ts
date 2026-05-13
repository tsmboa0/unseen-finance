import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { requirePrivyAuthForDashboard } from "@/lib/privy";
import { dashboardApiRequireMerchant } from "@/lib/dashboard-api-auth";
import { generatePlainClaimCode, hashClaimCode, normalizeClaimCode } from "@/lib/gift-cards/claim-code";
import { verifySplTransferToAta } from "@/lib/gift-cards/verify-spl-funding";
import { giftAdminTokenAta, getGiftAdminSigner } from "@/lib/gift-cards/admin-wallet";
import { getDefaultSolanaEndpoints } from "@/lib/solana-endpoints";

export async function POST(request: Request) {
  const auth = await requirePrivyAuthForDashboard(request);
  const gate = dashboardApiRequireMerchant(auth);
  if (gate instanceof NextResponse) return gate;
  const { merchant } = gate;

  let body: { giftId?: string; fundingTxSignature?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const giftId = typeof body.giftId === "string" ? body.giftId.trim() : "";
  const fundingTxSignature = typeof body.fundingTxSignature === "string" ? body.fundingTxSignature.trim() : "";
  if (!giftId || !fundingTxSignature) {
    return NextResponse.json({ error: "giftId and fundingTxSignature are required" }, { status: 400 });
  }

  const gift = await prisma.giftCard.findFirst({
    where: { id: giftId, merchantId: merchant.id, status: "pending_funding" },
  });
  if (!gift) {
    return NextResponse.json({ error: "Gift not found or already confirmed" }, { status: 404 });
  }

  if (gift.expiresAt.getTime() < Date.now()) {
    await prisma.giftCard.update({
      where: { id: gift.id },
      data: { status: "expired" },
    });
    return NextResponse.json({ error: "This gift draft expired" }, { status: 400 });
  }

  const signer = await getGiftAdminSigner();
  const adminPubkey = String(signer.address);
  const payToAta = await giftAdminTokenAta(adminPubkey, gift.mint);
  const endpoints = getDefaultSolanaEndpoints(merchant.network);

  const ok = await verifySplTransferToAta({
    rpcUrl: endpoints.rpcUrl,
    signature: fundingTxSignature,
    expectedDestinationAta: payToAta,
    expectedMint: gift.mint,
    minimumAmountRaw: gift.fundAmountRaw,
  });

  if (!ok) {
    return NextResponse.json(
      {
        error:
          "Could not verify funding: ensure the transaction transfers enough USDC to the treasury ATA on the correct network.",
      },
      { status: 400 },
    );
  }

  let plainCode = "";
  let claimCodeHash = "";
  for (let attempt = 0; attempt < 8; attempt++) {
    plainCode = generatePlainClaimCode();
    claimCodeHash = hashClaimCode(normalizeClaimCode(plainCode));
    const clash = await prisma.giftCard.findUnique({ where: { claimCodeHash } });
    if (!clash) break;
    plainCode = "";
  }
  if (!plainCode) {
    return NextResponse.json({ error: "Could not allocate claim code" }, { status: 500 });
  }

  await prisma.giftCard.update({
    where: { id: gift.id },
    data: {
      claimCodeHash,
      claimCodePlain: plainCode,
      fundingTxSig: fundingTxSignature,
      status: "active",
      activatedAt: new Date(),
    },
  });

  await prisma.dashboardEvent.create({
    data: {
      merchantId: merchant.id,
      network: merchant.network,
      walletAddress: merchant.walletAddress,
      category: "tiplinks",
      direction: "out",
      status: "completed",
      amount: gift.amountDisplay,
      currency: "USDC",
      counterparty: "gift-card",
      memo: `Gift card ${plainCode.slice(0, 7)}… funded`,
      txHash: fundingTxSignature,
    },
  });

  return NextResponse.json({
    claimCode: plainCode,
    giftId: gift.id,
    message: "Gift card issued. Copy the code from the list anytime.",
  });
}
