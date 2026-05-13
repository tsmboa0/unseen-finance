import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PlaceholderPage } from "@/components/unseen/placeholder-page";
import {
  PRODUCT_SLUGS,
  productPages,
  type ProductSlug,
} from "@/components/unseen/site-content";

type ProductPageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateStaticParams() {
  return PRODUCT_SLUGS.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: ProductPageProps): Promise<Metadata> {
  const { slug } = await params;

  if (!PRODUCT_SLUGS.includes(slug as ProductSlug)) {
    return {};
  }

  return {
    title: productPages[slug as ProductSlug].title,
    description: productPages[slug as ProductSlug].description,
    alternates: { canonical: `/products/${slug}` },
    openGraph: {
      url: `/products/${slug}`,
      title: productPages[slug as ProductSlug].title,
      description: productPages[slug as ProductSlug].description,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: productPages[slug as ProductSlug].title,
      description: productPages[slug as ProductSlug].description,
    },
  };
}

export default async function ProductPlaceholderPage({
  params,
}: ProductPageProps) {
  const { slug } = await params;

  if (!PRODUCT_SLUGS.includes(slug as ProductSlug)) {
    notFound();
  }

  const product = productPages[slug as ProductSlug];

  return (
    <PlaceholderPage
      description={product.description}
      eyebrow={product.label}
      title={`${product.title} is coming soon.`}
    />
  );
}
