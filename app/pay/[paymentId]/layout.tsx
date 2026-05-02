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
  // Standalone layout — no dashboard sidebar, no nav bar.
  // This page renders inside a wallet's in-app browser.
  return (
    <html lang="en" className="dark">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body style={{ margin: 0, padding: 0, background: "#0a0a0f" }}>
        {children}
      </body>
    </html>
  );
}
