import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { requireApiKey } from "@/lib/auth";

type Params = { params: Promise<{ storeId: string }> };

// ─── GET /api/v1/stores/[storeId] ────────────────────────────────────────────

export async function GET(req: NextRequest, { params }: Params) {
  const auth = await requireApiKey(req);
  if (auth instanceof NextResponse) return auth;
  const { merchant } = auth;
  const { storeId } = await params;

  const store = await prisma.store.findFirst({
    where: { id: storeId, merchantId: merchant.id },
    include: { _count: { select: { products: true } } },
  });

  if (!store) return NextResponse.json({ error: "Store not found" }, { status: 404 });

  // Count only orders where the associated payment is CONFIRMED
  const confirmedOrderCount = await prisma.order.count({
    where: { storeId, payment: { status: "CONFIRMED" } },
  });

  return NextResponse.json({
    ...store,
    productCount: store._count.products,
    orderCount: confirmedOrderCount,
  });
}

// ─── PATCH /api/v1/stores/[storeId] ──────────────────────────────────────────

export async function PATCH(req: NextRequest, { params }: Params) {
  const auth = await requireApiKey(req);
  if (auth instanceof NextResponse) return auth;
  const { merchant } = auth;
  const { storeId } = await params;

  const store = await prisma.store.findFirst({ where: { id: storeId, merchantId: merchant.id } });
  if (!store) return NextResponse.json({ error: "Store not found" }, { status: 404 });

  let body: Partial<{
    name: string;
    category: string;
    description: string;
    logoUrl: string;
    currency: string;
    privacy: string;
    status: string;
  }>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const validStatuses = ["draft", "live", "paused"];
  if (body.status && !validStatuses.includes(body.status)) {
    return NextResponse.json({ error: `status must be one of: ${validStatuses.join(", ")}` }, { status: 422 });
  }

  const updated = await prisma.store.update({
    where: { id: storeId },
    data: {
      name: body.name?.trim() ?? store.name,
      category: body.category?.trim() ?? store.category,
      description: body.description?.trim() ?? store.description,
      logoUrl: body.logoUrl ?? store.logoUrl,
      currency: body.currency ?? store.currency,
      privacy: body.privacy ?? store.privacy,
      status: body.status ?? store.status,
    },
  });

  return NextResponse.json(updated);
}

// ─── DELETE /api/v1/stores/[storeId] ─────────────────────────────────────────

export async function DELETE(req: NextRequest, { params }: Params) {
  const auth = await requireApiKey(req);
  if (auth instanceof NextResponse) return auth;
  const { merchant } = auth;
  const { storeId } = await params;

  const store = await prisma.store.findFirst({ where: { id: storeId, merchantId: merchant.id } });
  if (!store) return NextResponse.json({ error: "Store not found" }, { status: 404 });

  await prisma.store.delete({ where: { id: storeId } });

  return NextResponse.json({ success: true });
}
