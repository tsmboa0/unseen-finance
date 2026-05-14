import type { Metadata } from "next";
import { LandingPage } from "@/components/unseen/landing-page";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

export default function HomePage() {
  return <LandingPage />;
}
