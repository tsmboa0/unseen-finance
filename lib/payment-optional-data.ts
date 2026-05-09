import crypto from "crypto";

// Domain-separated payload so optionalData hashes are deterministic and versioned.
export function buildPaymentOptionalDataSeed(args: {
  paymentId: string;
  reference: string;
}): string {
  return `unseen:payment-optional-data:v1:${args.paymentId}:${args.reference}`;
}

export function buildPaymentOptionalDataHash(args: {
  paymentId: string;
  reference: string;
}): string {
  const seed = buildPaymentOptionalDataSeed(args);
  return crypto.createHash("sha256").update(seed).digest("hex");
}

export function optionalDataHashToBytes(hash: string): Uint8Array {
  if (!/^[0-9a-f]{64}$/i.test(hash)) {
    throw new Error("optionalData hash must be a 64-char hex string");
  }
  return new Uint8Array(Buffer.from(hash, "hex"));
}
