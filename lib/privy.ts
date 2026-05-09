import { PrivyClient } from "@privy-io/server-auth";
import prisma from "@/lib/db";

// ─── Privy Server Client ──────────────────────────────────────────────────────

let _privyClient: PrivyClient | null = null;

function getPrivyClient(): PrivyClient {
  if (!_privyClient) {
    const appId = process.env.PRIVY_APP_ID;
    const appSecret = process.env.PRIVY_APP_SECRET;
    if (!appId || !appSecret) {
      throw new Error("PRIVY_APP_ID and PRIVY_APP_SECRET must be set");
    }
    _privyClient = new PrivyClient(appId, appSecret);
  }
  return _privyClient;
}

// ─── Types ───────────────────────────────────────────────────────────────────

export type AuthUser = {
  privyId: string;
  email: string | null;
  walletAddress: string | null;
};

type LinkedAccountWithAddress = {
  type?: string;
  address?: string;
};

function getLinkedWalletAddress(accounts: unknown): string | null {
  if (!Array.isArray(accounts)) return null;

  const wallet = accounts.find((account) => {
    const candidate = account as LinkedAccountWithAddress;
    return candidate.type === "wallet" && typeof candidate.address === "string";
  }) as LinkedAccountWithAddress | undefined;

  return wallet?.address ?? null;
}

// ─── verifyPrivyToken ────────────────────────────────────────────────────────

export async function verifyPrivyToken(token: string): Promise<AuthUser | null> {
  try {
    const privy = getPrivyClient();
    const claims = await privy.verifyAuthToken(token);

    const user = await privy.getUser(claims.userId);

    const email =
      user.email?.address ??
      (user.linkedAccounts?.find((a) => a.type === "email") as { address?: string } | undefined)
        ?.address ??
      null;

    const walletAddress = user.wallet?.address ?? getLinkedWalletAddress(user.linkedAccounts) ?? null;

    return {
      privyId: claims.userId,
      email,
      walletAddress,
    };
  } catch {
    return null;
  }
}

// ─── requirePrivyAuth ────────────────────────────────────────────────────────
// Verifies the Privy Bearer token, looks up the merchant record, and returns
// both. Does NOT auto-create a merchant — that happens only after onboarding.
//
// Callers receive:
//   { merchant: Merchant | null, authUser: AuthUser | null, error: string | null }
//
// • merchant === null && authUser === null → unauthenticated (return 401)
// • merchant === null && authUser !== null → authenticated but not yet onboarded
// • merchant !== null                      → fully registered merchant

export async function requirePrivyAuth(request: Request) {
  const authHeader = request.headers.get("Authorization");
  const token = authHeader?.replace("Bearer ", "").trim();

  if (!token) {
    return { merchant: null, authUser: null, error: "Authorization header missing" };
  }

  const authUser = await verifyPrivyToken(token);
  if (!authUser) {
    return { merchant: null, authUser: null, error: "Invalid or expired session" };
  }

  // Find existing merchant by privyId
  let merchant = await prisma.merchant.findUnique({
    where: { privyId: authUser.privyId },
  });

  // Fallback to email lookup for legacy / pre-Privy accounts
  if (!merchant && authUser.email) {
    merchant = await prisma.merchant.findUnique({
      where: { email: authUser.email },
    });

    // Bind the privyId so future lookups are fast
    if (merchant && !merchant.privyId) {
      merchant = await prisma.merchant.update({
        where: { id: merchant.id },
        data: {
          privyId: authUser.privyId,
          walletAddress: merchant.walletAddress ?? authUser.walletAddress,
        },
      });
    }
  }

  // Sync wallet address if the embedded wallet changed (e.g. after Privy re-creates it).
  // Umbra identity is bound to the key, so registration must be redone.
  if (
    merchant &&
    authUser.walletAddress &&
    merchant.walletAddress !== authUser.walletAddress
  ) {
    merchant = await prisma.merchant.update({
      where: { id: merchant.id },
      data: {
        walletAddress: authUser.walletAddress,
        umbraRegistered: false,
        umbraRegisteredAt: null,
      },
    });
  }

  return { merchant, authUser, error: null };
}
