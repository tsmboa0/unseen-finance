import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/db";
import { badRequest, notFound, requirePaymentToken } from "@/lib/auth";
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

const Base58SignatureSchema = z
  .string()
  .min(64)
  .max(100)
  .regex(/^[1-9A-HJ-NP-Za-km-z]+$/, "Must be a valid base58 Solana signature");

const SubmitTxSchema = z
  .object({
    txSignature: Base58SignatureSchema.optional(),
    txSignatures: z.array(Base58SignatureSchema).min(1).optional(),
    amount: z.number().int().positive(), // raw token units reported by checkout
    optionalDataHash: z
      .string()
      .regex(/^[0-9a-f]{64}$/i, "optionalDataHash must be a 64-char hex string"),
  })
  .refine((value) => value.txSignature || value.txSignatures, {
    message: "txSignature or txSignatures is required",
    path: ["txSignatures"],
  });

export async function POST(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const tokenAuth = await requirePaymentToken(request, id);
  if (tokenAuth instanceof NextResponse) return tokenAuth;

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

  const { txSignature, txSignatures, amount, optionalDataHash } = parsed.data;
  const signatures = Array.from(
    new Set([...(txSignatures ?? []), ...(txSignature ? [txSignature] : [])])
  );

  // Find payment
  const payment = await prisma.payment.findUnique({ where: { id } });
  if (!payment) return notFound("Payment");
  if (payment.merchantId !== tokenAuth.merchantId) {
    return NextResponse.json(
      { error: "Payment token merchant mismatch", code: "unauthorized" },
      { status: 401 }
    );
  }

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
  if (payment.txSignature || payment.txSignatures) {
    return NextResponse.json(
      { success: true, message: "Transaction already submitted" },
      { status: 200 }
    );
  }

  // Persist
  await prisma.payment.update({
    where: { id },
    data: {
      txSignature: signatures[0] ?? null,
      txSignatures: JSON.stringify(signatures),
      submittedAmount: BigInt(amount),
      submittedOptionalDataHash: optionalDataHash.toLowerCase(),
    },
  });

  return NextResponse.json({ success: true, paymentId: id }, { status: 200 });
}
