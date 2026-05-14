import type { Metadata } from "next";
import { PlaceholderPage } from "@/components/unseen/placeholder-page";
import { defaultOpenGraphImages, defaultTwitterImages } from "@/lib/seo-sharing";

export const metadata: Metadata = {
  title: "Start Building",
  description:
    "Provision merchants, create payment sessions, and ship shielded Solana commerce flows from one platform.",
  alternates: { canonical: "/signup" },
  openGraph: {
    url: "/signup",
    title: "Start Building · Unseen Finance",
    description:
      "Provision merchants, create payment sessions, and ship shielded Solana commerce flows from one platform.",
    type: "website",
    images: defaultOpenGraphImages(),
  },
  twitter: {
    card: "summary_large_image",
    title: "Start Building · Unseen Finance",
    description:
      "Provision merchants, create payment sessions, and ship shielded Solana commerce flows from one platform.",
    images: defaultTwitterImages(),
  },
};

export default function SignupPage() {
  return (
    <PlaceholderPage
      description="Provision merchants, create payment sessions, and ship shielded Solana commerce flows from one platform."
      eyebrow="Get started"
      title="Signup and onboarding are coming soon."
    />
  );
}
