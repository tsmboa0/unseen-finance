import prisma from "@/lib/db";
import { notFound } from "next/navigation";
import { StoreProductGrid } from "./store-products-client";

type Props = {
  params: Promise<{ slug: string }>;
};

export default async function StorePage({ params }: Props) {
  const { slug } = await params;

  const store = await prisma.store.findUnique({
    where: { slug },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      currency: true,
    },
  });

  if (!store) notFound();

  const products = await prisma.product.findMany({
    where: { storeId: store.id, status: "active" },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    select: {
      id: true,
      name: true,
      shortDesc: true,
      price: true,
      imageUrl: true,
      stock: true,
    },
  });

  const serialized = products.map((p) => ({
    ...p,
    price: p.price.toString(),
  }));

  return (
    <>
      {/* Hero */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{
          fontSize: 28,
          fontWeight: 800,
          color: "var(--color-text-primary)",
          margin: "0 0 8px",
          letterSpacing: "-0.02em",
        }}>
          {store.name}
        </h1>
        {store.description && (
          <p style={{ fontSize: 15, color: "var(--color-text-secondary)", margin: 0, lineHeight: 1.6 }}>
            {store.description}
          </p>
        )}
      </div>

      <StoreProductGrid
        products={serialized}
        currency={store.currency}
        storeSlug={store.slug}
      />
    </>
  );
}
