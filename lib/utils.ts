import crypto from "crypto";

// ─── ID Generators ───────────────────────────────────────────────────────────

/** Generates a payment ID like pay_abc123xyz456 */
export function generatePaymentId(): string {
  const bytes = crypto.randomBytes(12);
  return "pay_" + bytes.toString("base64url").slice(0, 16);
}

/** Generates an API key like usk_test_<40 random chars> */
export function generateApiKey(env: "live" | "test" = "test"): string {
  const bytes = crypto.randomBytes(30);
  return `usk_${env}_${bytes.toString("base64url").slice(0, 40)}`;
}

/** Generates a webhook signing secret */
export function generateWebhookSecret(): string {
  return crypto.randomBytes(32).toString("hex");
}

// ─── HMAC Signature ──────────────────────────────────────────────────────────

/** Signs a webhook payload with HMAC-SHA256 */
export function signWebhookPayload(
  secret: string,
  payload: string
): string {
  return crypto.createHmac("sha256", secret).update(payload).digest("hex");
}

/** Verifies a webhook signature */
export function verifyWebhookSignature(
  secret: string,
  payload: string,
  signature: string
): boolean {
  const expected = signWebhookPayload(secret, payload);
  return crypto.timingSafeEqual(
    Buffer.from(expected, "hex"),
    Buffer.from(signature, "hex")
  );
}

// ─── Mint Helpers ────────────────────────────────────────────────────────────

export const KNOWN_MINTS: Record<string, { symbol: string; decimals: number }> =
  {
    // USDC mainnet
    EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v: {
      symbol: "USDC",
      decimals: 6,
    },
    // USDC devnet
    "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU": {
      symbol: "USDC",
      decimals: 6,
    },
    // USDT mainnet
    Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB: {
      symbol: "USDT",
      decimals: 6,
    },
    // SOL (native, use wrapped)
    So11111111111111111111111111111111111111112: {
      symbol: "SOL",
      decimals: 9,
    },
  };

export function getMintInfo(mint: string) {
  return (
    KNOWN_MINTS[mint] ?? { symbol: "Unknown", decimals: 9 }
  );
}

// ─── Serialization ───────────────────────────────────────────────────────────

/** Safely serialize BigInt values for JSON responses */
export function serializePayment(payment: Record<string, unknown>) {
  return JSON.parse(
    JSON.stringify(payment, (_, v) =>
      typeof v === "bigint" ? v.toString() : v
    )
  );
}

// ─── Expiry ──────────────────────────────────────────────────────────────────

export function addSeconds(date: Date, seconds: number): Date {
  return new Date(date.getTime() + seconds * 1000);
}

export function isExpired(expiresAt: Date): boolean {
  return new Date() > expiresAt;
}
