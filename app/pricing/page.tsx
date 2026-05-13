import type { Metadata } from "next";
import { PlaceholderPage } from "@/components/unseen/placeholder-page";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "Flexible commercial terms for builders, merchants, and institutions moving confidential payments at scale.",
  alternates: { canonical: "/pricing" },
  openGraph: {
    url: "/pricing",
    title: "Pricing · Unseen Finance",
    description:
      "Flexible commercial terms for builders, merchants, and institutions moving confidential payments at scale.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Pricing · Unseen Finance",
    description:
      "Flexible commercial terms for builders, merchants, and institutions moving confidential payments at scale.",
  },
};

export default function PricingPage() {
  return (
    <PlaceholderPage
      description="Flexible commercial terms for builders, merchants, and institutions moving confidential payments at scale."
      eyebrow="Pricing"
      title="Pricing details are coming soon."
    />
  );
}
