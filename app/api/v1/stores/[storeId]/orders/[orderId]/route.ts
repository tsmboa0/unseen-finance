import { NextRequest, NextResponse } from "next/server";
import { requireApiKey } from "@/lib/auth";
import prisma from "@/lib/db";

type Params = { params: Promise<{ storeId: string; orderId: string }> };

// ─── PATCH /api/v1/stores/[storeId]/orders/[orderId] ─────────────────────────
// Allows merchants to update delivery status of an order.

export async function PATCH(request: NextRequest, { params }: Params) {
  const { storeId, orderId } = await params;
  const auth = await requireApiKey(request);
  if (auth instanceof NextResponse) return auth;
  const { merchant } = auth;

  // Confirm the store belongs to this merchant
  const store = await prisma.store.findFirst({
    where: { id: storeId, merchantId: merchant.id },
    select: { id: true },
  });
  if (!store) {
    return NextResponse.json({ error: "Store not found" }, { status: 404 });
  }

  const order = await prisma.order.findFirst({
    where: { id: orderId, storeId },
    select: { id: true, deliveryStatus: true },
  });
  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  let body: { deliveryStatus?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { deliveryStatus } = body;
  const validStatuses = ["received", "delivered"];
  if (!deliveryStatus || !validStatuses.includes(deliveryStatus)) {
    return NextResponse.json(
      { error: `deliveryStatus must be one of: ${validStatuses.join(", ")}` },
      { status: 422 },
    );
  }

  const updated = await prisma.order.update({
    where: { id: orderId },
    data: {
      deliveryStatus,
      deliveredAt: deliveryStatus === "delivered" ? new Date() : null,
    },
    select: {
      id: true,
      deliveryStatus: true,
      deliveredAt: true,
    },
  });

  return NextResponse.json(updated);
}
