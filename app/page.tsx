import type { Metadata } from "next";
import { LandingPage } from "@/components/unseen/landing-page";

export const metadata: Metadata = {
  title: "UNSEEN FINANCE",
  description: "The Gateway to Confidential Finance on Solana.",
};

export default function HomePage() {
  return <LandingPage />;
}
