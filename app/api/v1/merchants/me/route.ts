import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { requireApiKey } from "@/lib/auth";

// ─── GET /api/v1/merchants/me ─────────────────────────────────────────────────
//
// Returns the authenticated merchant's profile. Used by the dashboard
// to display account info, API key prefix, and wallet address.

export async function GET(request: NextRequest) {
  const auth = await requireApiKey(request);
  if (auth instanceof NextResponse) return auth;
  const { merchant } = auth;

  const full = await prisma.merchant.findUnique({
    where: { id: merchant.id },
    select: {
      id: true,
      name: true,
      email: true,
      walletAddress: true,
      apiKeyPrefix: true,
      network: true,
      webhookUrl: true,
      createdAt: true,
      // Never return apiKey or webhookSecret in full
    },
  });

  return NextResponse.json({
    id: full!.id,
    name: full!.name,
    email: full!.email,
    walletAddress: full!.walletAddress,
    apiKeyPrefix: full!.apiKeyPrefix,
    network: full!.network,
    webhookUrl: full!.webhookUrl,
    createdAt: full!.createdAt.toISOString(),
  });
}

// ─── PATCH /api/v1/merchants/me — Update webhook settings ────────────────────

export async function PATCH(request: NextRequest) {
  const auth = await requireApiKey(request);
  if (auth instanceof NextResponse) return auth;
  const { merchant } = auth;

  let body: { webhookUrl?: string; webhookSecret?: string } = {};
  try {
    body = await request.json();
  } catch {
    // ignore empty body
  }

  const updated = await prisma.merchant.update({
    where: { id: merchant.id },
    data: {
      ...(body.webhookUrl !== undefined && { webhookUrl: body.webhookUrl }),
      ...(body.webhookSecret !== undefined && { webhookSecret: body.webhookSecret }),
    },
  });

  return NextResponse.json({
    id: updated.id,
    webhookUrl: updated.webhookUrl,
    updatedAt: updated.updatedAt.toISOString(),
  });
}
