/**
 * RPC endpoints for Umbra + Privy embedded-wallet flows.
 * Override with NEXT_PUBLIC_SOLANA_RPC_* env vars in production.
 */

export type UmbraSolanaNetwork = "mainnet" | "devnet";

/** CAIP-2-style cluster IDs used by Privy Wallet Standard hooks when `chain` is set on each request. */
export type PrivySolanaWalletStandardChain = "solana:mainnet" | "solana:devnet" | "solana:testnet";

export function merchantNetworkToUmbra(network: string): UmbraSolanaNetwork {
  return network === "mainnet" ? "mainnet" : "devnet";
}

export function umbraNetworkToPrivySolanaChain(
  umbraNetwork: UmbraSolanaNetwork,
): PrivySolanaWalletStandardChain {
  return umbraNetwork === "mainnet" ? "solana:mainnet" : "solana:devnet";
}

/** Umbra indexer HTTP API — override with `NEXT_PUBLIC_UMBRA_INDEXER_URL`. */
export function getDefaultUmbraIndexerUrl(network: string): string {
  const override = process.env.NEXT_PUBLIC_UMBRA_INDEXER_URL?.trim();
  if (override) return override;
  const umbraNetwork = merchantNetworkToUmbra(network);
  return umbraNetwork === "mainnet"
    ? "https://utxo-indexer.api.umbraprivacy.com"
    : "https://utxo-indexer.api-devnet.umbraprivacy.com";
}

/** Umbra relayer HTTP API — override with `NEXT_PUBLIC_UMBRA_RELAYER_URL`. */
export function getDefaultUmbraRelayerUrl(network: string): string {
  const override = process.env.NEXT_PUBLIC_UMBRA_RELAYER_URL?.trim();
  if (override) return override;
  const umbraNetwork = merchantNetworkToUmbra(network);
  return umbraNetwork === "mainnet"
    ? "https://relayer.api.umbraprivacy.com"
    : "https://relayer.api-devnet.umbraprivacy.com";
}

export function getDefaultSolanaEndpoints(network: string): {
  rpcUrl: string;
  rpcSubscriptionsUrl: string;
  umbraNetwork: UmbraSolanaNetwork;
  privySolanaChain: PrivySolanaWalletStandardChain;
} {
  const umbraNetwork = merchantNetworkToUmbra(network);
  const privySolanaChain = umbraNetworkToPrivySolanaChain(umbraNetwork);
  if (umbraNetwork === "mainnet") {
    return {
      umbraNetwork,
      privySolanaChain,
      rpcUrl: process.env.NEXT_PUBLIC_SOLANA_RPC_MAINNET ?? "https://api.mainnet-beta.solana.com",
      rpcSubscriptionsUrl:
        process.env.NEXT_PUBLIC_SOLANA_RPC_MAINNET_WS ?? "wss://api.mainnet-beta.solana.com",
    };
  }
  return {
    umbraNetwork,
    privySolanaChain,
    rpcUrl: process.env.NEXT_PUBLIC_SOLANA_RPC_DEVNET ?? "https://api.devnet.solana.com",
    rpcSubscriptionsUrl:
      process.env.NEXT_PUBLIC_SOLANA_RPC_DEVNET_WS ?? "wss://api.devnet.solana.com",
  };
}
