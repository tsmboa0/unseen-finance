import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProductPageView } from "@/components/unseen/product-page/product-page-view";
import {
  PRODUCT_SLUGS,
  productPages,
  type ProductSlug,
} from "@/components/unseen/site-content";
import { defaultOpenGraphImages, defaultTwitterImages } from "@/lib/seo-sharing";

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
      images: defaultOpenGraphImages(),
    },
    twitter: {
      card: "summary_large_image",
      title: productPages[slug as ProductSlug].title,
      description: productPages[slug as ProductSlug].description,
      images: defaultTwitterImages(),
    },
  };
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params;

  if (!PRODUCT_SLUGS.includes(slug as ProductSlug)) {
    notFound();
  }

  return <ProductPageView slug={slug as ProductSlug} />;
}
