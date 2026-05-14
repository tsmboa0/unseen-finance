import type { Metadata } from "next";
import { defaultOpenGraphImages, defaultTwitterImages } from "@/lib/seo-sharing";

export const metadata: Metadata = {
  title: "Redeem",
  description:
    "Redeem Unseen gift cards and shielded value on Solana with your wallet — fast, private checkout.",
  alternates: { canonical: "/redeem" },
  openGraph: {
    url: "/redeem",
    title: "Redeem · Unseen Finance",
    description:
      "Redeem Unseen gift cards and shielded value on Solana with your wallet — fast, private checkout.",
    type: "website",
    images: defaultOpenGraphImages(),
  },
  twitter: {
    card: "summary_large_image",
    title: "Redeem · Unseen Finance",
    description:
      "Redeem Unseen gift cards and shielded value on Solana with your wallet — fast, private checkout.",
    images: defaultTwitterImages(),
  },
};

export default function RedeemLayout({ children }: { children: React.ReactNode }) {
  return children;
}
