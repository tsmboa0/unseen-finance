import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { requireApiKey, notFound, badRequest } from "@/lib/auth";
import { serializePayment, getMintInfo, isExpired } from "@/lib/utils";

type Params = { params: Promise<{ id: string }> };

const checkoutBaseUrl =
  process.env.CHECKOUT_BASE_URL ?? "http://localhost:3000";

// ─── Shared: fetch payment and validate ownership ─────────────────────────────

async function getOwnedPayment(merchantId: string, paymentId: string) {
  return prisma.payment.findFirst({
    where: { id: paymentId, merchantId },
  });
}

function formatPayment(p: Awaited<ReturnType<typeof getOwnedPayment>>) {
  if (!p) return null;
  return serializePayment({
    id: p.id,
    status: p.status.toLowerCase(),
    amount: p.amount,
    mint: p.mint,
    mintSymbol: getMintInfo(p.mint).symbol,
    reference: p.reference,
    description: p.description,
    txSignature: p.txSignature,
    checkoutUrl: `${checkoutBaseUrl}/pay/${p.id}`,
    successUrl: p.successUrl,
    cancelUrl: p.cancelUrl,
    metadata: p.metadata ? JSON.parse(p.metadata) : null,
    expiresAt: p.expiresAt.toISOString(),
    confirmedAt: p.confirmedAt?.toISOString() ?? null,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  });
}

// ─── GET /api/v1/payments/:id ─────────────────────────────────────────────────

export async function GET(request: NextRequest, { params }: Params) {
  const auth = await requireApiKey(request);
  if (auth instanceof NextResponse) return auth;
  const { merchant } = auth;

  const { id } = await params;
  const payment = await getOwnedPayment(merchant.id, id);
  if (!payment) return notFound("Payment");

  // Auto-expire if past expiry
  if (payment.status === "PENDING" && isExpired(payment.expiresAt)) {
    await prisma.payment.update({
      where: { id },
      data: { status: "EXPIRED" },
    });
    payment.status = "EXPIRED";
  }

  return NextResponse.json(formatPayment(payment));
}

// ─── DELETE /api/v1/payments/:id — Cancel a pending payment ──────────────────

export async function DELETE(request: NextRequest, { params }: Params) {
  const auth = await requireApiKey(request);
  if (auth instanceof NextResponse) return auth;
  const { merchant } = auth;

  const { id } = await params;
  const payment = await getOwnedPayment(merchant.id, id);
  if (!payment) return notFound("Payment");

  if (payment.status !== "PENDING") {
    return badRequest(
      `Cannot cancel a payment with status "${payment.status.toLowerCase()}". Only PENDING payments can be cancelled.`
    );
  }

  const updated = await prisma.payment.update({
    where: { id },
    data: { status: "CANCELLED" },
  });

  return NextResponse.json(formatPayment(updated));
}
