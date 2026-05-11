import { PrivyClient } from "@privy-io/node";

let _privyNodeClient: PrivyClient | null = null;

/**
 * Server-only Privy REST client for wallets, policies, and Wallet API signing.
 * Separate from {@link @/lib/privy} which uses `@privy-io/server-auth` for JWT verification.
 */
export function getPrivyNodeClient(): PrivyClient {
  if (!_privyNodeClient) {
    const appId = process.env.PRIVY_APP_ID;
    const appSecret = process.env.PRIVY_APP_SECRET;
    if (!appId || !appSecret) {
      throw new Error("PRIVY_APP_ID and PRIVY_APP_SECRET must be set for Privy Node client.");
    }
    const publicAppId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;
    if (publicAppId && publicAppId !== appId) {
      throw new Error(
        "PRIVY_APP_ID must match NEXT_PUBLIC_PRIVY_APP_ID. The browser session JWT is minted for the public app id; a mismatched server id breaks Wallet API authentication.",
      );
    }
    _privyNodeClient = new PrivyClient({ appId, appSecret });
  }
  return _privyNodeClient;
}

export function isPayrollDelegationApiEnabled(): boolean {
  return process.env.NEXT_PUBLIC_PAYROLL_DELEGATION === "1";
}
