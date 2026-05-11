import { createHash, randomBytes } from "node:crypto";

/** Normalized form for hashing (uppercase, no spaces). */
export function normalizeClaimCode(input: string): string {
  return input.trim().replace(/\s+/g, "").toUpperCase();
}

export function hashClaimCode(normalized: string): string {
  return createHash("sha256").update(normalized, "utf8").digest("hex");
}

/** Human-friendly code: GFT-XXXXXXXX (no ambiguous chars). */
export function generatePlainClaimCode(): string {
  const alphabet = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
  const buf = randomBytes(10);
  let out = "";
  for (let i = 0; i < buf.length; i++) {
    out += alphabet[buf[i]! % alphabet.length];
  }
  return `GFT-${out.slice(0, 4)}-${out.slice(4, 8)}`;
}
