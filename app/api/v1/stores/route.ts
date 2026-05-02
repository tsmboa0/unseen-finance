import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { requireApiKey } from "@/lib/auth";

// ─── GET /api/v1/stores — List merchant's stores ──────────────────────────────

export async function GET(req: NextRequest) {
  const auth = await requireApiKey(req);
  if (auth instanceof NextResponse) return auth;
  const { merchant } = auth;

  const stores = await prisma.store.findMany({
    where: { merchantId: merchant.id },
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { products: true, orders: true } },
    },
  });

  return NextResponse.json({
    data: stores.map((s) => ({
      id: s.id,
      name: s.name,
      slug: s.slug,
      category: s.category,
      description: s.description,
      logoUrl: s.logoUrl,
      currency: s.currency,
      privacy: s.privacy,
      status: s.status,
      productCount: s._count.products,
      orderCount: s._count.orders,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
    })),
  });
}

// ─── POST /api/v1/stores — Create a store ────────────────────────────────────

export async function POST(req: NextRequest) {
  const auth = await requireApiKey(req);
  if (auth instanceof NextResponse) return auth;
  const { merchant } = auth;

  let body: {
    name?: string;
    slug?: string;
    category?: string;
    description?: string;
    logoUrl?: string;
    currency?: string;
    privacy?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { name, slug, category, description, logoUrl, currency = "USDC", privacy = "shielded" } = body;

  if (!name?.trim()) return NextResponse.json({ error: "name is required" }, { status: 422 });
  if (!slug?.trim()) return NextResponse.json({ error: "slug is required" }, { status: 422 });

  if (!/^[a-z0-9-]+$/.test(slug)) {
    return NextResponse.json({ error: "slug must be lowercase letters, numbers, and hyphens only" }, { status: 422 });
  }

  const existing = await prisma.store.findUnique({ where: { slug } });
  if (existing) {
    return NextResponse.json({ error: "This slug is already taken" }, { status: 409 });
  }

  const store = await prisma.store.create({
    data: {
      merchantId: merchant.id,
      name: name.trim(),
      slug: slug.trim().toLowerCase(),
      category: category?.trim() || null,
      description: description?.trim() || null,
      logoUrl: logoUrl || null,
      currency,
      privacy,
      status: "draft",
    },
  });

  return NextResponse.json(store, { status: 201 });
}
