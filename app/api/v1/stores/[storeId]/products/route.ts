import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { requireApiKey } from "@/lib/auth";

type Params = { params: Promise<{ storeId: string }> };

// ─── GET /api/v1/stores/[storeId]/products ────────────────────────────────────

export async function GET(req: NextRequest, { params }: Params) {
  const auth = await requireApiKey(req);
  if (auth instanceof NextResponse) return auth;
  const { merchant } = auth;
  const { storeId } = await params;

  const store = await prisma.store.findFirst({ where: { id: storeId, merchantId: merchant.id } });
  if (!store) return NextResponse.json({ error: "Store not found" }, { status: 404 });

  const url = new URL(req.url);
  const status = url.searchParams.get("status");

  const products = await prisma.product.findMany({
    where: {
      storeId,
      ...(status ? { status } : {}),
    },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
  });

  return NextResponse.json({
    data: products.map((p) => ({ ...p, price: p.price.toString() })),
  });
}

// ─── POST /api/v1/stores/[storeId]/products ───────────────────────────────────

export async function POST(req: NextRequest, { params }: Params) {
  const auth = await requireApiKey(req);
  if (auth instanceof NextResponse) return auth;
  const { merchant } = auth;
  const { storeId } = await params;

  const store = await prisma.store.findFirst({ where: { id: storeId, merchantId: merchant.id } });
  if (!store) return NextResponse.json({ error: "Store not found" }, { status: 404 });

  let body: {
    name?: string;
    shortDesc?: string;
    longDesc?: string;
    price?: number;
    mint?: string;
    imageUrl?: string;
    sku?: string;
    stock?: number | null;
    sortOrder?: number;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { name, shortDesc, longDesc, price, mint, imageUrl, sku, stock, sortOrder = 0 } = body;

  if (!name?.trim()) return NextResponse.json({ error: "name is required" }, { status: 422 });
  if (price === undefined || price === null || price < 0) {
    return NextResponse.json({ error: "price is required and must be >= 0" }, { status: 422 });
  }

  const defaultMint = store.currency === "SOL"
    ? "So11111111111111111111111111111111111111112"
    : "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU";

  const product = await prisma.product.create({
    data: {
      storeId,
      name: name.trim(),
      shortDesc: shortDesc?.trim() || null,
      longDesc: longDesc?.trim() || null,
      price: BigInt(Math.round(price)),
      mint: mint || defaultMint,
      imageUrl: imageUrl || null,
      sku: sku?.trim() || null,
      stock: stock !== undefined ? stock : null,
      sortOrder,
      status: "active",
    },
  });

  return NextResponse.json({
    ...product,
    price: product.price.toString(),
  }, { status: 201 });
}
