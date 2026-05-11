import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import prisma from "@/lib/db";
import { Product } from "@prisma/client";
import { buildPaymentOptionalDataHash } from "@/lib/payment-optional-data";
import { mintPaymentToken } from "@/lib/payment-token";

type Params = { params: Promise<{ slug: string }> };

// ─── POST /api/public/stores/[slug]/checkout — Create payment for cart ───────
// Called by the storefront checkout page.
// Creates a Payment + Order, returns the paymentId for the @unseen/ui modal.

export async function POST(req: NextRequest, { params }: Params) {
  const { slug } = await params;
  const checkoutBaseUrl = process.env.CHECKOUT_BASE_URL ?? req.nextUrl.origin;

  const store = await prisma.store.findUnique({
    where: { slug },
    include: { merchant: { select: { id: true } } },
  });

  if (!store || store.status !== "live") {
    return NextResponse.json({ error: "Store not found or not live" }, { status: 404 });
  }

  let body: {
    items: { productId: string; qty: number }[];
    customerName?: string;
    customerEmail?: string;
    shippingAddress?: {
      addressLine: string;
      city: string;
      country: string;
      postalCode: string;
    };
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.items || !Array.isArray(body.items) || body.items.length === 0) {
    return NextResponse.json({ error: "items array is required" }, { status: 422 });
  }

  // Fetch products and validate
  const productIds = body.items.map((i) => i.productId);
  const products = await prisma.product.findMany({
    where: { id: { in: productIds }, storeId: store.id, status: "active" },
  });

  const productMap = new Map<string, Product>(products.map((p) => [p.id, p]));

  // Validate all items exist and compute total
  let totalAmount = BigInt(0);
  const orderItems: { productId: string; name: string; qty: number; price: string }[] = [];

  for (const item of body.items) {
    const product = productMap.get(item.productId);
    if (!product) {
      return NextResponse.json({ error: `Product ${item.productId} not found` }, { status: 422 });
    }
    if (product.stock !== null && product.stock < item.qty) {
      return NextResponse.json({ error: `Insufficient stock for "${product.name}"` }, { status: 422 });
    }
    const lineTotal = product.price * BigInt(item.qty);
    totalAmount += lineTotal;
    orderItems.push({
      productId: product.id,
      name: product.name,
      qty: item.qty,
      price: product.price.toString(),
    });
  }

  // Determine mint based on store currency (use Umbra-supported devnet addresses)
  const mint = store.currency === "SOL"
    ? "So11111111111111111111111111111111111111112"
    : "4oG4sjmopf5MzvTHLE8rpVJ2uyczxfsw2K84SUTpNDx7"; // USDC devnet

  // Create the payment session
  const reference = `order_${store.slug}_${Date.now()}`;
  const paymentId = randomUUID();
  const expectedOptionalDataHash = buildPaymentOptionalDataHash({
    paymentId,
    reference,
  });
  const payment = await prisma.payment.create({
    data: {
      id: paymentId,
      merchantId: store.merchant.id,
      amount: totalAmount,
      mint,
      reference,
      description: `Order from ${store.name} (${orderItems.length} item${orderItems.length > 1 ? "s" : ""})`,
      status: "PENDING",
      expectedOptionalDataHash,
      expiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes
    },
  });
  const paymentToken = mintPaymentToken({
    paymentId: payment.id,
    merchantId: store.merchant.id,
  });

  // Create the order
  await prisma.order.create({
    data: {
      storeId: store.id,
      paymentId: payment.id,
      customerName: body.customerName ?? null,
      customerEmail: body.customerEmail ?? null,
      shippingAddress: body.shippingAddress ? JSON.stringify(body.shippingAddress) : null,
      items: JSON.stringify(orderItems),
      totalAmount,
    },
  });

  // Decrement stock for items with finite stock
  for (const item of body.items) {
    const product = productMap.get(item.productId)!;
    if (product.stock !== null) {
      await prisma.product.update({
        where: { id: product.id },
        data: { stock: product.stock - item.qty },
      });
    }
  }

  return NextResponse.json({
    paymentId: payment.id,
    amount: totalAmount.toString(),
    currency: store.currency,
    reference,
    expiresAt: payment.expiresAt,
    paymentToken,
    checkoutUrl: `${checkoutBaseUrl}/pay/${payment.id}`,
  }, { status: 201 });
}
