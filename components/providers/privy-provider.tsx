"use client";

import { PrivyProvider } from "@privy-io/react-auth";
import type { ReactNode } from "react";

export function PrivyClientProvider({ children }: { children: ReactNode }) {
  return (
    <PrivyProvider
      appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID!}
      config={{
        // Email-first login for merchant dashboard — shows email OTP flow
        loginMethods: ["email"],
        appearance: {
          theme: "dark",
          accentColor: "#7b2fff",
          logo: "https://unseen.finance/logo.png",
        },
        // Create an embedded Solana wallet for email-only users automatically
        embeddedWallets: {
          solana: {
            createOnLogin: "users-without-wallets",
          },
        },
      }}
    >
      {children}
    </PrivyProvider>
  );
}
