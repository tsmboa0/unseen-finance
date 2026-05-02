import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";

type Params = { params: Promise<{ slug: string }> };

// ─── GET /api/public/stores/[slug] — Public store data ───────────────────────
// No auth required — used by the customer-facing storefront.

export async function GET(_req: NextRequest, { params }: Params) {
  const { slug } = await params;

  const store = await prisma.store.findUnique({
    where: { slug },
    select: {
      id: true,
      name: true,
      slug: true,
      category: true,
      description: true,
      logoUrl: true,
      currency: true,
      privacy: true,
      status: true,
      merchant: {
        select: { apiKey: true, walletAddress: true },
      },
    },
  });

  if (!store || store.status !== "live") {
    return NextResponse.json({ error: "Store not found" }, { status: 404 });
  }

  // Don't expose merchant secrets
  return NextResponse.json({
    id: store.id,
    name: store.name,
    slug: store.slug,
    category: store.category,
    description: store.description,
    logoUrl: store.logoUrl,
    currency: store.currency,
    privacy: store.privacy,
    merchantWallet: store.merchant.walletAddress,
  });
}
