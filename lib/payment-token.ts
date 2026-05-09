import crypto from "crypto";

type PaymentTokenPayload = {
  paymentId: string;
  merchantId: string;
  exp: number; // unix seconds
};

const DEFAULT_TTL_SECONDS = 60 * 60; // 1 hour

function getSecret(): string {
  return process.env.PAYMENT_TOKEN_SECRET ?? "dev_payment_token_secret_change_me";
}

function toBase64Url(value: string): string {
  return Buffer.from(value).toString("base64url");
}

function fromBase64Url(value: string): string {
  return Buffer.from(value, "base64url").toString("utf8");
}

function sign(data: string): string {
  return crypto.createHmac("sha256", getSecret()).update(data).digest("base64url");
}

export function mintPaymentToken(args: {
  paymentId: string;
  merchantId: string;
  ttlSeconds?: number;
}): string {
  const payload: PaymentTokenPayload = {
    paymentId: args.paymentId,
    merchantId: args.merchantId,
    exp: Math.floor(Date.now() / 1000) + (args.ttlSeconds ?? DEFAULT_TTL_SECONDS),
  };

  const payloadB64 = toBase64Url(JSON.stringify(payload));
  const signature = sign(payloadB64);
  return `${payloadB64}.${signature}`;
}

export function verifyPaymentToken(token: string): PaymentTokenPayload | null {
  const [payloadB64, signature] = token.split(".");
  if (!payloadB64 || !signature) return null;
  if (sign(payloadB64) !== signature) return null;

  try {
    const payload = JSON.parse(fromBase64Url(payloadB64)) as PaymentTokenPayload;
    if (!payload.paymentId || !payload.merchantId || !payload.exp) return null;
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}
