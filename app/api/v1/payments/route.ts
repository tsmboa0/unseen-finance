import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/db";
import { requireApiKey, badRequest } from "@/lib/auth";
import {
  generatePaymentId,
  addSeconds,
  serializePayment,
  getMintInfo,
} from "@/lib/utils";
import { buildPaymentOptionalDataHash } from "@/lib/payment-optional-data";
import { mintPaymentToken } from "@/lib/payment-token";

// ─── Validation schema ────────────────────────────────────────────────────────

const CreatePaymentSchema = z.object({
  amount: z.number().int().positive(),          // raw token units
  mint: z.string().optional(),                  // default = USDC devnet
  reference: z.string().min(1).max(256),        // merchant's order ID
  description: z.string().max(512).optional(),
  expiresIn: z.number().int().min(60).max(86400).optional().default(3600),
  successUrl: z.string().url().optional(),
  cancelUrl: z.string().url().optional(),
  webhookUrl: z.string().url().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

const DEFAULT_MINT = "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU"; // USDC devnet

// ─── POST /api/v1/payments — Create a payment session ────────────────────────

export async function POST(request: NextRequest) {
  // Auth
  const auth = await requireApiKey(request);
  if (auth instanceof NextResponse) return auth;
  const { merchant } = auth;

  // Parse body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return badRequest("Invalid JSON body");
  }

  const parsed = CreatePaymentSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest("Validation failed", parsed.error.flatten().fieldErrors);
  }

  const data = parsed.data;
  const mint = data.mint ?? DEFAULT_MINT;
  const expiresAt = addSeconds(new Date(), data.expiresIn);
  const id = generatePaymentId();
  const expectedOptionalDataHash = buildPaymentOptionalDataHash({
    paymentId: id,
    reference: data.reference,
  });
  const checkoutBaseUrl =
    process.env.CHECKOUT_BASE_URL ?? "http://localhost:3000";

  const payment = await prisma.payment.create({
    data: {
      id,
      merchantId: merchant.id,
      amount: BigInt(data.amount),
      mint,
      reference: data.reference,
      description: data.description ?? null,
      metadata: data.metadata ? JSON.stringify(data.metadata) : null,
      successUrl: data.successUrl ?? null,
      cancelUrl: data.cancelUrl ?? null,
      webhookUrl: data.webhookUrl ?? null,
      status: "PENDING",
      expiresAt,
      expectedOptionalDataHash,
    },
  });

  const mintInfo = getMintInfo(mint);
  const paymentToken = mintPaymentToken({
    paymentId: payment.id,
    merchantId: merchant.id,
  });

  return NextResponse.json(
    serializePayment({
      id: payment.id,
      status: payment.status.toLowerCase(),
      amount: payment.amount,
      mint: payment.mint,
      mintSymbol: mintInfo.symbol,
      reference: payment.reference,
      description: payment.description,
      expectedOptionalDataHash: payment.expectedOptionalDataHash,
      paymentToken,
      checkoutUrl: `${checkoutBaseUrl}/pay/${payment.id}`,
      expiresAt: payment.expiresAt.toISOString(),
      createdAt: payment.createdAt.toISOString(),
    }),
    { status: 201 }
  );
}

// ─── GET /api/v1/payments — List payments ─────────────────────────────────────

const ListSchema = z.object({
  status: z.enum(["PENDING", "CONFIRMED", "EXPIRED", "CANCELLED"]).optional(),
  reference: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  cursor: z.string().optional(), // payment.id for cursor-based pagination
});

export async function GET(request: NextRequest) {
  const auth = await requireApiKey(request);
  if (auth instanceof NextResponse) return auth;
  const { merchant } = auth;

  const params = Object.fromEntries(request.nextUrl.searchParams);
  const parsed = ListSchema.safeParse(params);
  if (!parsed.success) {
    return badRequest("Invalid query params", parsed.error.flatten().fieldErrors);
  }

  const { status, reference, limit, cursor } = parsed.data;

  const payments = await prisma.payment.findMany({
    where: {
      merchantId: merchant.id,
      ...(status && { status }),
      ...(reference && { reference }),
    },
    orderBy: { createdAt: "desc" },
    take: limit + 1, // fetch one extra to determine if there's a next page
    ...(cursor && { cursor: { id: cursor }, skip: 1 }),
  });

  const hasMore = payments.length > limit;
  const items = hasMore ? payments.slice(0, limit) : payments;
  const nextCursor = hasMore ? items[items.length - 1].id : null;

  const checkoutBaseUrl =
    process.env.CHECKOUT_BASE_URL ?? "http://localhost:3000";

  return NextResponse.json(
    serializePayment({
      data: items.map((p) => ({
        txSignatures: p.txSignatures
          ? (() => {
              try {
                const value = JSON.parse(p.txSignatures) as unknown;
                return Array.isArray(value)
                  ? value.filter((v): v is string => typeof v === "string")
                  : [];
              } catch {
                return [];
              }
            })()
          : [],
        id: p.id,
        status: p.status.toLowerCase(),
        amount: p.amount,
        mint: p.mint,
        mintSymbol: getMintInfo(p.mint).symbol,
        reference: p.reference,
        description: p.description,
        txSignature: p.txSignature,
        expectedOptionalDataHash: p.expectedOptionalDataHash,
        submittedOptionalDataHash: p.submittedOptionalDataHash,
        checkoutUrl: `${checkoutBaseUrl}/pay/${p.id}`,
        expiresAt: p.expiresAt.toISOString(),
        confirmedAt: p.confirmedAt?.toISOString() ?? null,
        createdAt: p.createdAt.toISOString(),
      })),
      pagination: {
        limit,
        hasMore,
        nextCursor,
      },
    })
  );
}
