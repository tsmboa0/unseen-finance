import prisma from "@/lib/db";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { StoreLayoutClient } from "./store-layout-client";

type Props = {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const store = await prisma.store.findUnique({
    where: { slug },
    select: { name: true, description: true, logoUrl: true },
  });
  const title = store?.name ?? "Store";
  const description =
    store?.description ?? "Shop with private payments powered by Unseen Finance";

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `/store/${slug}`,
      type: "website",
      ...(store?.logoUrl ? { images: [{ url: store.logoUrl, alt: title }] } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      ...(store?.logoUrl ? { images: [store.logoUrl] } : {}),
    },
  };
}

export default async function StoreLayout({ children, params }: Props) {
  const { slug } = await params;

  const store = await prisma.store.findUnique({
    where: { slug },
    select: {
      id: true,
      name: true,
      slug: true,
      logoUrl: true,
      currency: true,
      status: true,
      description: true,
    },
  });

  if (!store || store.status !== "live") {
    notFound();
  }

  return (
    <StoreLayoutClient store={store}>
      {children}
    </StoreLayoutClient>
  );
}
