import prisma from "@/lib/db";
import { notFound } from "next/navigation";
import { ProductDetailClient } from "./product-detail-client";

type Props = {
  params: Promise<{ slug: string; productId: string }>;
};

export default async function ProductDetailPage({ params }: Props) {
  const { slug, productId } = await params;

  const store = await prisma.store.findUnique({
    where: { slug },
    select: { id: true, name: true, slug: true, currency: true },
  });

  if (!store) notFound();

  const product = await prisma.product.findFirst({
    where: { id: productId, storeId: store.id, status: "active" },
  });

  if (!product) notFound();

  return (
    <ProductDetailClient
      product={{
        ...product,
        price: product.price.toString(),
      }}
      currency={store.currency}
      storeSlug={store.slug}
    />
  );
}
