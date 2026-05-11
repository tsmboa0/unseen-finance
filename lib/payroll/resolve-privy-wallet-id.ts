import type { User } from "@privy-io/node";

/**
 * Resolves the Privy **server wallet id** for the merchant's embedded Solana wallet.
 */
export function resolvePrivySolanaEmbeddedWalletId(user: User, merchantSolanaAddress: string): string | null {
  const want = merchantSolanaAddress.trim();
  for (const account of user.linked_accounts ?? []) {
    if (
      account.type === "wallet" &&
      "chain_type" in account &&
      account.chain_type === "solana" &&
      "connector_type" in account &&
      account.connector_type === "embedded" &&
      "id" in account &&
      typeof account.id === "string" &&
      account.id.length > 0 &&
      account.address === want
    ) {
      return account.id;
    }
  }
  return null;
}
