import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { requireApiKey } from "@/lib/auth";

type Params = { params: Promise<{ storeId: string; productId: string }> };

// ─── GET /api/v1/stores/[storeId]/products/[productId] ───────────────────────

export async function GET(req: NextRequest, { params }: Params) {
  const auth = await requireApiKey(req);
  if (auth instanceof NextResponse) return auth;
  const { merchant } = auth;
  const { storeId, productId } = await params;

  const store = await prisma.store.findFirst({ where: { id: storeId, merchantId: merchant.id } });
  if (!store) return NextResponse.json({ error: "Store not found" }, { status: 404 });

  const product = await prisma.product.findFirst({ where: { id: productId, storeId } });
  if (!product) return NextResponse.json({ error: "Product not found" }, { status: 404 });

  return NextResponse.json({ ...product, price: product.price.toString() });
}

// ─── PATCH /api/v1/stores/[storeId]/products/[productId] ─────────────────────

export async function PATCH(req: NextRequest, { params }: Params) {
  const auth = await requireApiKey(req);
  if (auth instanceof NextResponse) return auth;
  const { merchant } = auth;
  const { storeId, productId } = await params;

  const store = await prisma.store.findFirst({ where: { id: storeId, merchantId: merchant.id } });
  if (!store) return NextResponse.json({ error: "Store not found" }, { status: 404 });

  const product = await prisma.product.findFirst({ where: { id: productId, storeId } });
  if (!product) return NextResponse.json({ error: "Product not found" }, { status: 404 });

  let body: Partial<{
    name: string;
    shortDesc: string;
    longDesc: string;
    price: number;
    imageUrl: string;
    sku: string;
    stock: number | null;
    sortOrder: number;
    status: string;
  }>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const updated = await prisma.product.update({
    where: { id: productId },
    data: {
      name: body.name?.trim() ?? product.name,
      shortDesc: body.shortDesc?.trim() ?? product.shortDesc,
      longDesc: body.longDesc?.trim() ?? product.longDesc,
      price: body.price !== undefined ? BigInt(Math.round(body.price)) : product.price,
      imageUrl: body.imageUrl ?? product.imageUrl,
      sku: body.sku?.trim() ?? product.sku,
      stock: body.stock !== undefined ? body.stock : product.stock,
      sortOrder: body.sortOrder ?? product.sortOrder,
      status: body.status ?? product.status,
    },
  });

  return NextResponse.json({ ...updated, price: updated.price.toString() });
}

// ─── DELETE /api/v1/stores/[storeId]/products/[productId] ────────────────────

export async function DELETE(req: NextRequest, { params }: Params) {
  const auth = await requireApiKey(req);
  if (auth instanceof NextResponse) return auth;
  const { merchant } = auth;
  const { storeId, productId } = await params;

  const store = await prisma.store.findFirst({ where: { id: storeId, merchantId: merchant.id } });
  if (!store) return NextResponse.json({ error: "Store not found" }, { status: 404 });

  const product = await prisma.product.findFirst({ where: { id: productId, storeId } });
  if (!product) return NextResponse.json({ error: "Product not found" }, { status: 404 });

  await prisma.product.update({ where: { id: productId }, data: { status: "archived" } });

  return NextResponse.json({ success: true, id: productId, status: "archived" });
}
