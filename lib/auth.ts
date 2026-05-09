import { NextRequest, NextResponse } from "next/server";
import prisma from "./db";
import { verifyPaymentToken } from "./payment-token";

// ─── Types ───────────────────────────────────────────────────────────────────

export type MerchantContext = {
  id: string;
  name: string;
  apiKey: string;
  network: string;
  walletAddress: string | null;
  webhookUrl: string | null;
  webhookSecret: string | null;
};

// ─── Middleware ───────────────────────────────────────────────────────────────

/**
 * Extracts and validates the Bearer API key from the Authorization header.
 * Returns the merchant context on success, or a NextResponse error on failure.
 *
 * Usage in route handlers:
 *   const auth = await requireApiKey(req);
 *   if (auth instanceof NextResponse) return auth;
 *   const { merchant } = auth;
 */
export async function requireApiKey(
  request: NextRequest
): Promise<{ merchant: MerchantContext } | NextResponse> {
  const authHeader = request.headers.get("authorization");

  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json(
      { error: "Missing Authorization header. Use: Bearer usk_...", code: "unauthorized" },
      { status: 401 }
    );
  }

  const apiKey = authHeader.slice(7).trim();

  if (!apiKey) {
    return NextResponse.json(
      { error: "Empty API key", code: "unauthorized" },
      { status: 401 }
    );
  }

  const merchant = await prisma.merchant.findUnique({
    where: { apiKey },
    select: {
      id: true,
      name: true,
      apiKey: true,
      network: true,
      walletAddress: true,
      webhookUrl: true,
      webhookSecret: true,
    },
  });

  if (!merchant) {
    return NextResponse.json(
      { error: "Invalid API key", code: "unauthorized" },
      { status: 401 }
    );
  }

  return { merchant };
}

// ─── Error Helpers ───────────────────────────────────────────────────────────

export function apiError(message: string, status: number, code?: string) {
  return NextResponse.json({ error: message, code: code ?? "error" }, { status });
}

export function notFound(resource = "Resource") {
  return NextResponse.json(
    { error: `${resource} not found`, code: "not_found" },
    { status: 404 }
  );
}

export function badRequest(message: string, details?: unknown) {
  return NextResponse.json(
    { error: message, code: "bad_request", details },
    { status: 400 }
  );
}

// ─── Checkout Payment Token Auth ─────────────────────────────────────────────

export async function requirePaymentToken(
  request: NextRequest,
  paymentId: string
): Promise<{ merchantId: string } | NextResponse> {
  const token =
    request.headers.get("x-unseen-payment-token") ??
    request.nextUrl.searchParams.get("paymentToken") ??
    "";

  if (!token) {
    return NextResponse.json(
      { error: "Missing payment token", code: "unauthorized" },
      { status: 401 }
    );
  }

  const payload = verifyPaymentToken(token);
  if (!payload) {
    return NextResponse.json(
      { error: "Invalid payment token", code: "unauthorized" },
      { status: 401 }
    );
  }
  if (payload.paymentId !== paymentId) {
    return NextResponse.json(
      { error: "Payment token does not match payment", code: "unauthorized" },
      { status: 401 }
    );
  }

  return { merchantId: payload.merchantId };
}
