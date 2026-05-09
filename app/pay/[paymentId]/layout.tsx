import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Unseen Pay — Checkout",
  description: "Complete your private payment with Unseen Pay",
};

export default function PayLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Route-scoped wrapper only. Root layout owns html/head/body.
  return (
    <div style={{ margin: 0, padding: 0 }}>
      {children}
    </div>
  );
}
