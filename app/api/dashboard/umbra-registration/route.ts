import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { requirePrivyAuthForDashboard } from "@/lib/privy";
import { dashboardApiRequireMerchant } from "@/lib/dashboard-api-auth";

/**
 * POST /api/dashboard/umbra-registration
 * Marks the merchant as Umbra-registered after the client completes on-chain registration.
 * Auth: Privy Bearer token (same as /api/dashboard/me).
 */
export async function POST(request: Request) {
  const auth = await requirePrivyAuthForDashboard(request);
  const gate = dashboardApiRequireMerchant(auth);
  if (gate instanceof NextResponse) return gate;
  const { merchant } = gate;

  if (!merchant.walletAddress) {
    return NextResponse.json({ error: "No Solana wallet linked to this account" }, { status: 400 });
  }

  const updated = await prisma.merchant.update({
    where: { id: merchant.id },
    data: {
      umbraRegistered: true,
      umbraRegisteredAt: new Date(),
    },
  });

  return NextResponse.json({
    umbraRegistered: updated.umbraRegistered,
    umbraRegisteredAt: updated.umbraRegisteredAt?.toISOString() ?? null,
  });
}
