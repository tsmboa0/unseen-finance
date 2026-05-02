import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";

type Params = { params: Promise<{ slug: string }> };

// ─── GET /api/public/stores/[slug]/products — Public product listing ─────────

export async function GET(_req: NextRequest, { params }: Params) {
  const { slug } = await params;

  const store = await prisma.store.findUnique({
    where: { slug },
    select: { id: true, status: true },
  });

  if (!store || store.status !== "live") {
    return NextResponse.json({ error: "Store not found" }, { status: 404 });
  }

  const products = await prisma.product.findMany({
    where: { storeId: store.id, status: "active" },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    select: {
      id: true,
      name: true,
      shortDesc: true,
      longDesc: true,
      price: true,
      imageUrl: true,
      stock: true,
    },
  });

  return NextResponse.json({
    data: products.map((p) => ({
      ...p,
      price: p.price.toString(),
    })),
  });
}
