import type { Metadata } from "next";
import { PlaceholderPage } from "@/components/unseen/placeholder-page";

export const metadata: Metadata = {
  title: "Documentation",
};

export default function DocsPage() {
  return (
    <PlaceholderPage
      description="Guides, API references, SDK examples, and launch checklists for shielded Solana payment flows."
      eyebrow="Documentation"
      title="Developer docs are on the way."
    />
  );
}
