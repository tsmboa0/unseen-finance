import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { notFound, requirePaymentToken } from "@/lib/auth";

type Params = { params: Promise<{ id: string }> };

function parseTxSignatures(payment: { txSignature: string | null; txSignatures: string | null }): string[] {
  const parsed = payment.txSignatures
    ? (() => {
        try {
          const value = JSON.parse(payment.txSignatures) as unknown;
          return Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : [];
        } catch {
          return [];
        }
      })()
    : [];

  return Array.from(new Set([...parsed, ...(payment.txSignature ? [payment.txSignature] : [])]));
}

export async function GET(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const tokenAuth = await requirePaymentToken(request, id);
  if (tokenAuth instanceof NextResponse) return tokenAuth;

  const payment = await prisma.payment.findFirst({
    where: { id, merchantId: tokenAuth.merchantId },
  });
  if (!payment) return notFound("Payment");

  const txSignatures = parseTxSignatures(payment);
  return NextResponse.json({
    paymentId: payment.id,
    reference: payment.reference,
    txSignatures,
    count: txSignatures.length,
  });
}
