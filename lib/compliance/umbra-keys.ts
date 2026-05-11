import {
  assertX25519PublicKey,
  assertU128,
  assertRcEncryptionNonce,
  type RcEncryptionNonce,
  type U128,
  type X25519PublicKey,
} from "@umbra-privacy/sdk/types";

export function hex64ToX25519PublicKey(hex: string): X25519PublicKey {
  const t = hex.trim().replace(/^0x/i, "");
  if (!/^[0-9a-f]{64}$/i.test(t)) {
    throw new Error("X25519 public key must be exactly 64 hexadecimal characters.");
  }
  const out = new Uint8Array(32);
  for (let i = 0; i < 32; i++) {
    out[i] = parseInt(t.slice(i * 2, i * 2 + 2), 16);
  }
  assertX25519PublicKey(out);
  return out as unknown as X25519PublicKey;
}

export function randomRcNonce(): { nonceDecimal: string; rcNonce: RcEncryptionNonce } {
  const buf = new Uint8Array(16);
  globalThis.crypto.getRandomValues(buf);
  let v = BigInt(0);
  for (let i = 0; i < 16; i++) {
    v = (v << BigInt(8)) | BigInt(buf[i]!);
  }
  assertU128(v);
  const u = v as U128;
  assertRcEncryptionNonce(u);
  return { nonceDecimal: v.toString(), rcNonce: u as RcEncryptionNonce };
}

export function rcNonceFromDecimal(nonceDecimal: string): RcEncryptionNonce {
  const v = BigInt(nonceDecimal);
  assertU128(v);
  const u = v as U128;
  assertRcEncryptionNonce(u);
  return u as RcEncryptionNonce;
}
