import { NextRequest, NextResponse } from "next/server";
import { requireApiKey } from "@/lib/auth";
import prisma from "@/lib/db";

type Params = { params: Promise<{ storeId: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  const { storeId } = await params;
  const auth = await requireApiKey(request);
  if (auth instanceof NextResponse) return auth;
  const { merchant } = auth;

  // Ensure the store belongs to this merchant
  const store = await prisma.store.findFirst({
    where: { id: storeId, merchantId: merchant.id },
    select: { id: true, currency: true },
  });
  if (!store) {
    return NextResponse.json({ error: "Store not found" }, { status: 404 });
  }

  const page = Math.max(1, Number(request.nextUrl.searchParams.get("page") ?? "1"));
  const statusFilter = request.nextUrl.searchParams.get("status"); // "confirmed" | "all"
  const limit = 50;
  const newCutoff = new Date(Date.now() - 48 * 60 * 60 * 1000);

  // Default: only show CONFIRMED orders (the ones that actually completed payment)
  const where = statusFilter === "all"
    ? { storeId }
    : { storeId, payment: { status: "CONFIRMED" } };

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      include: {
        payment: {
          select: { status: true, confirmedAt: true, txSignature: true },
        },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.order.count({ where }),
  ]);

  const data = orders.map((o) => {
    const confirmedAt = o.payment.confirmedAt;
    const isNew = o.payment.status === "CONFIRMED" && confirmedAt !== null && confirmedAt > newCutoff;
    return {
      id: o.id,
      createdAt: o.createdAt.toISOString(),
      customerName: o.customerName,
      customerEmail: o.customerEmail,
      shippingAddress: o.shippingAddress ? JSON.parse(o.shippingAddress) : null,
      items: JSON.parse(o.items) as { productId: string; name: string; qty: number; price: string }[],
      totalAmount: o.totalAmount.toString(),
      currency: store.currency,
      paymentStatus: o.payment.status.toLowerCase(),
      confirmedAt: confirmedAt?.toISOString() ?? null,
      txSignature: o.payment.txSignature,
      deliveryStatus: o.deliveryStatus,
      deliveredAt: o.deliveredAt?.toISOString() ?? null,
      isNew,
    };
  });

  const newCount = data.filter((o) => o.isNew).length;

  return NextResponse.json({ data, total, page, limit, newCount });
}
