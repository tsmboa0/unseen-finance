import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/db";
import { badRequest, notFound } from "@/lib/auth";
import { isExpired } from "@/lib/utils";

// ─── POST /api/v1/payments/:id/submit-tx ─────────────────────────────────────
//
// Called by the HOSTED CHECKOUT PAGE (not the merchant server) after the
// user signs and submits the Umbra createUtxo transaction. Stores the
// tx signature so verifyPayment can later confirm it on-chain.
//
// No API key required — the payment ID is the authorisation token here,
// and the checkout page is our own hosted page.

type Params = { params: Promise<{ id: string }> };

const SubmitTxSchema = z.object({
  txSignature: z
    .string()
    .min(64)
    .max(100)
    .regex(/^[1-9A-HJ-NP-Za-km-z]+$/, "Must be a valid base58 Solana signature"),
  amount: z.number().int().positive(), // raw token units reported by checkout
});

export async function POST(request: NextRequest, { params }: Params) {
  const { id } = await params;

  // Parse body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return badRequest("Invalid JSON body");
  }

  const parsed = SubmitTxSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest("Validation failed", parsed.error.flatten().fieldErrors);
  }

  const { txSignature, amount } = parsed.data;

  // Find payment
  const payment = await prisma.payment.findUnique({ where: { id } });
  if (!payment) return notFound("Payment");

  // Guard: only PENDING payments can receive a tx
  if (payment.status !== "PENDING") {
    return NextResponse.json(
      {
        error: `Payment is already ${payment.status.toLowerCase()}`,
        code: "invalid_status",
      },
      { status: 409 }
    );
  }

  // Guard: expired
  if (isExpired(payment.expiresAt)) {
    await prisma.payment.update({ where: { id }, data: { status: "EXPIRED" } });
    return NextResponse.json(
      { error: "Payment has expired", code: "expired" },
      { status: 410 }
    );
  }

  // Guard: don't overwrite an existing signature (idempotency)
  if (payment.txSignature) {
    return NextResponse.json(
      { success: true, message: "Transaction already submitted" },
      { status: 200 }
    );
  }

  // Persist
  await prisma.payment.update({
    where: { id },
    data: {
      txSignature,
      submittedAmount: BigInt(amount),
    },
  });

  return NextResponse.json({ success: true, paymentId: id }, { status: 200 });
}
