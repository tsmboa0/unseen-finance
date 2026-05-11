import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { hashClaimCode, normalizeClaimCode } from "@/lib/gift-cards/claim-code";

export async function POST(request: Request) {
  let body: { code?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const raw = typeof body.code === "string" ? body.code : "";
  const normalized = normalizeClaimCode(raw);
  if (normalized.length < 8) {
    return NextResponse.json({ valid: false, error: "Enter the full claim code" }, { status: 400 });
  }

  const claimCodeHash = hashClaimCode(normalized);
  const gift = await prisma.giftCard.findUnique({ where: { claimCodeHash } });

  if (!gift) {
    return NextResponse.json({ valid: false, error: "Invalid code" });
  }

  if (gift.expiresAt.getTime() < Date.now()) {
    if (gift.status === "active") {
      await prisma.giftCard.update({ where: { id: gift.id }, data: { status: "expired" } });
    }
    return NextResponse.json({ valid: false, error: "This gift has expired" });
  }

  if (gift.status !== "active") {
    const msg =
      gift.status === "claimed" ? "This gift was already claimed" : "This gift is not redeemable";
    return NextResponse.json({ valid: false, error: msg });
  }

  return NextResponse.json({
    valid: true,
    amountDisplay: gift.amountDisplay,
    memo: gift.memo,
    currency: "USDC",
    expiresAt: gift.expiresAt.toISOString(),
    network: gift.network,
  });
}
