"use client";

import type { ReactNode } from "react";
import { PrivyProvider } from "@privy-io/react-auth";
import { createSolanaRpc, createSolanaRpcSubscriptions } from "@solana/kit";
import { usePathname } from "next/navigation";

const mainnetHttp = process.env.NEXT_PUBLIC_SOLANA_RPC_MAINNET ?? "https://api.mainnet-beta.solana.com";
const mainnetWs = process.env.NEXT_PUBLIC_SOLANA_RPC_MAINNET_WS ?? "wss://api.mainnet-beta.solana.com";
const devnetHttp = process.env.NEXT_PUBLIC_SOLANA_RPC_DEVNET ?? "https://api.devnet.solana.com";
const devnetWs = process.env.NEXT_PUBLIC_SOLANA_RPC_DEVNET_WS ?? "wss://api.devnet.solana.com";

export function PrivyClientProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  // Hosted checkout relies on wallet in-app browser injection, not Privy embedded wallets.
  // Skipping Privy here avoids HTTPS-only embedded-wallet runtime errors on LAN HTTP testing.
  if (pathname?.startsWith("/pay/")) {
    return <>{children}</>;
  }

  return (
    <PrivyProvider
      appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID!}
      config={{
        loginMethods: ["email"],
        appearance: {
          theme: "light",
          accentColor: "#7b2fff",
          logo: "https://unseen.finance/logo.png",
        },
        embeddedWallets: {
          solana: {
            createOnLogin: "users-without-wallets",
          },
        },
        solana: {
          rpcs: {
            "solana:devnet": {
              rpc: createSolanaRpc(devnetHttp),
              rpcSubscriptions: createSolanaRpcSubscriptions(devnetWs),
            },
            "solana:mainnet": {
              rpc: createSolanaRpc(mainnetHttp),
              rpcSubscriptions: createSolanaRpcSubscriptions(mainnetWs),
            }
          },
        },
      }}
    >
      {children}
    </PrivyProvider>
  );
}
