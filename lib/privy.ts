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
// Verifies a Privy access token and returns the user's identity.

export async function verifyPrivyToken(token: string): Promise<AuthUser | null> {
  try {
    const privy = getPrivyClient();
    const claims = await privy.verifyAuthToken(token);

    // Get the full user object to extract email and wallet
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
// Middleware for dashboard API routes.
// Reads the Privy access token from the Authorization header,
// finds or creates the merchant record, and returns it.

export async function requirePrivyAuth(request: Request) {
  const authHeader = request.headers.get("Authorization");
  const token = authHeader?.replace("Bearer ", "").trim();

  if (!token) {
    return { merchant: null, error: "Authorization header missing" };
  }

  const authUser = await verifyPrivyToken(token);
  if (!authUser) {
    return { merchant: null, error: "Invalid or expired session" };
  }

  // Find existing merchant by privyId
  let merchant = await prisma.merchant.findUnique({
    where: { privyId: authUser.privyId },
  });

  // If not found by privyId, try by email (legacy / existing accounts)
  if (!merchant && authUser.email) {
    merchant = await prisma.merchant.findUnique({
      where: { email: authUser.email },
    });

    // Bind the privyId to this existing merchant
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

  // First login — auto-create merchant record
  if (!merchant) {
    const { generateApiKey, generateWebhookSecret } = await import("@/lib/utils");
    const apiKey = generateApiKey("test");
    const prefix = apiKey.slice(0, 16) + "…";
    const webhookSecret = generateWebhookSecret();

    const name =
      authUser.email
        ? authUser.email.split("@")[0]
        : authUser.walletAddress
        ? authUser.walletAddress.slice(0, 8) + "…"
        : "New Merchant";

    merchant = await prisma.merchant.create({
      data: {
        privyId: authUser.privyId,
        name,
        handle: name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
        ownerName: name,
        email: authUser.email,
        walletAddress: authUser.walletAddress,
        apiKey,
        apiKeyPrefix: prefix,
        webhookSecret,
        network: "devnet",
      },
    });
  }

  if (merchant.walletAddress !== authUser.walletAddress && authUser.walletAddress) {
    merchant = await prisma.merchant.update({
      where: { id: merchant.id },
      data: { walletAddress: authUser.walletAddress },
    });
  }

  return { merchant, error: null };
}
