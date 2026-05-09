import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { notFound, requirePaymentToken } from "@/lib/auth";
import { verifyTransactions } from "@/lib/solana";
import { isExpired, serializePayment } from "@/lib/utils";

type Params = { params: Promise<{ id: string }> };

function getPaymentSignatures(payment: {
  txSignature: string | null;
  txSignatures: string | null;
}): string[] {
  const parsed = payment.txSignatures
    ? (() => {
        try {
          const value = JSON.parse(payment.txSignatures) as unknown;
          return Array.isArray(value)
            ? value.filter((v): v is string => typeof v === "string")
            : [];
        } catch {
          return [];
        }
      })()
    : [];
  return Array.from(new Set([...parsed, ...(payment.txSignature ? [payment.txSignature] : [])]));
}

export async function POST(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const tokenAuth = await requirePaymentToken(request, id);
  if (tokenAuth instanceof NextResponse) return tokenAuth;

  const payment = await prisma.payment.findFirst({
    where: { id, merchantId: tokenAuth.merchantId },
  });
  if (!payment) return notFound("Payment");

  if (payment.status === "CONFIRMED") {
    return NextResponse.json(
      serializePayment({
        status: "confirmed",
        paymentId: payment.id,
        reference: payment.reference,
        txSignature: payment.txSignature,
        txSignatures: getPaymentSignatures(payment),
        confirmedAmount: payment.submittedAmount,
        confirmedAt: payment.confirmedAt?.toISOString(),
      })
    );
  }

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

  if (isExpired(payment.expiresAt)) {
    await prisma.payment.update({ where: { id }, data: { status: "EXPIRED" } });
    return NextResponse.json(
      { status: "expired", paymentId: id, error: "Payment has expired" },
      { status: 410 }
    );
  }

  const signatures = getPaymentSignatures(payment);
  if (signatures.length === 0) {
    return NextResponse.json(
      {
        status: "pending",
        paymentId: id,
        error: "No transaction submitted yet. The customer may not have paid.",
      },
      { status: 200 }
    );
  }

  const verifyResult = await verifyTransactions(signatures);
  if (!verifyResult.anyConfirmed) {
    return NextResponse.json(
      {
        status: "pending",
        paymentId: id,
        txSignatures: signatures,
        error: verifyResult.reason ?? "No confirmed transaction yet.",
      },
      { status: 200 }
    );
  }

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

  if (
    payment.expectedOptionalDataHash &&
    payment.submittedOptionalDataHash &&
    payment.expectedOptionalDataHash.toLowerCase() !==
      payment.submittedOptionalDataHash.toLowerCase()
  ) {
    return NextResponse.json(
      {
        status: "optional_data_mismatch",
        paymentId: id,
        expectedOptionalDataHash: payment.expectedOptionalDataHash,
        submittedOptionalDataHash: payment.submittedOptionalDataHash,
        error:
          "Transaction found but optionalData hash does not match this payment.",
      },
      { status: 422 }
    );
  }

  if (payment.expectedOptionalDataHash && !payment.submittedOptionalDataHash) {
    return NextResponse.json(
      {
        status: "optional_data_missing",
        paymentId: id,
        expectedOptionalDataHash: payment.expectedOptionalDataHash,
        error: "optionalData hash missing from submitted transaction payload.",
      },
      { status: 422 }
    );
  }

  const confirmedAt = new Date();
  await prisma.payment.update({
    where: { id },
    data: {
      status: "CONFIRMED",
      confirmedAt,
      txSignature: verifyResult.confirmedSignature ?? payment.txSignature,
    },
  });

  return NextResponse.json(
    serializePayment({
      status: "confirmed",
      paymentId: payment.id,
      reference: payment.reference,
      amount: payment.amount,
      txSignature: verifyResult.confirmedSignature,
      txSignatures: signatures,
      confirmedAt: confirmedAt.toISOString(),
    })
  );
}
