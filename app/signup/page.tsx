import type { Metadata } from "next";
import { PlaceholderPage } from "@/components/unseen/placeholder-page";

export const metadata: Metadata = {
  title: "Start Building",
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
