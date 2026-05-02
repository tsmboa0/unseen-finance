import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { requireApiKey, notFound } from "@/lib/auth";
import { verifyTransaction } from "@/lib/solana";
import { serializePayment, getMintInfo, isExpired, signWebhookPayload } from "@/lib/utils";

// ─── POST /api/v1/payments/:id/verify ────────────────────────────────────────
//
// Called by the merchant (via @unseen/sdk or directly) when the customer
// clicks "I have paid". Uses the stored tx signature to confirm on Solana.

type Params = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  // Auth
  const auth = await requireApiKey(request);
  if (auth instanceof NextResponse) return auth;
  const { merchant } = auth;

  const { id } = await params;

  // Fetch payment with merchant ownership check
  const payment = await prisma.payment.findFirst({
    where: { id, merchantId: merchant.id },
  });
  if (!payment) return notFound("Payment");

  // Already confirmed — return current state (idempotent)
  if (payment.status === "CONFIRMED") {
    return NextResponse.json(
      serializePayment({
        status: "confirmed",
        paymentId: payment.id,
        reference: payment.reference,
        txSignature: payment.txSignature,
        confirmedAmount: payment.submittedAmount,
        confirmedAt: payment.confirmedAt?.toISOString(),
      })
    );
  }

  // Expired or cancelled — nothing to verify
  if (payment.status === "EXPIRED" || payment.status === "CANCELLED") {
    return NextResponse.json(
      {
        status: payment.status.toLowerCase(),
        paymentId: payment.id,
        error: `Payment is ${payment.status.toLowerCase()}`,
      },
      { status: 409 }
    );
  }

  // Auto-expire if past expiry
  if (isExpired(payment.expiresAt)) {
    await prisma.payment.update({ where: { id }, data: { status: "EXPIRED" } });
    return NextResponse.json(
      { status: "expired", paymentId: id, error: "Payment has expired" },
      { status: 410 }
    );
  }

  // No tx submitted yet
  if (!payment.txSignature) {
    return NextResponse.json(
      {
        status: "pending",
        paymentId: id,
        error: "No transaction submitted yet. The customer may not have paid.",
      },
      { status: 200 }
    );
  }

  // ─── Verify on Solana ──────────────────────────────────────────────────────
  const result = await verifyTransaction(payment.txSignature);

  if (!result.confirmed) {
    return NextResponse.json(
      {
        status: "pending",
        paymentId: id,
        txSignature: payment.txSignature,
        error: result.reason,
      },
      { status: 200 }
    );
  }

  // ─── Amount check ──────────────────────────────────────────────────────────
  // Compare the submitted amount to the expected amount.
  // The checkout page (our own hosted page) reports the amount it used.
  if (
    payment.submittedAmount !== null &&
    payment.submittedAmount !== payment.amount
  ) {
    return NextResponse.json(
      {
        status: "amount_mismatch",
        paymentId: id,
        expected: payment.amount.toString(),
        received: payment.submittedAmount.toString(),
        error: "Transaction found but amount does not match the payment request.",
      },
      { status: 422 }
    );
  }

  // ─── Confirm payment ──────────────────────────────────────────────────────
  const confirmedAt = new Date();
  await prisma.payment.update({
    where: { id },
    data: { status: "CONFIRMED", confirmedAt },
  });

  // ─── Fire webhook (fire-and-forget) ───────────────────────────────────────
  const webhookUrl = payment.webhookUrl ?? merchant.webhookUrl;
  if (webhookUrl) {
    const mintInfo = getMintInfo(payment.mint);
    const payload = JSON.stringify({
      event: "payment.confirmed",
      paymentId: payment.id,
      reference: payment.reference,
      amount: payment.amount.toString(),
      mint: payment.mint,
      mintSymbol: mintInfo.symbol,
      txSignature: payment.txSignature,
      confirmedAt: confirmedAt.toISOString(),
      metadata: payment.metadata ? JSON.parse(payment.metadata) : null,
    });

    const signature = merchant.webhookSecret
      ? signWebhookPayload(merchant.webhookSecret, payload)
      : null;

    // Non-blocking
    fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Unseen-Webhook/1.0",
        ...(signature && { "X-Unseen-Signature": signature }),
      },
      body: payload,
    }).catch(() => {
      // TODO: queue for retry (BullMQ Phase 2)
      console.error("[webhook] Failed to deliver to", webhookUrl);
    });
  }

  return NextResponse.json(
    serializePayment({
      status: "confirmed",
      paymentId: payment.id,
      reference: payment.reference,
      amount: payment.amount,
      txSignature: payment.txSignature,
      confirmedAt: confirmedAt.toISOString(),
    })
  );
}
