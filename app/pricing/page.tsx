import type { Metadata } from "next";
import { PlaceholderPage } from "@/components/unseen/placeholder-page";

export const metadata: Metadata = {
  title: "Pricing",
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
