import { BN254_FIELD_PRIME } from "@umbra-privacy/sdk/types";

function normalizeHex64(s: string): string {
  return s.trim().replace(/^0x/i, "").toLowerCase();
}

/** Validate Umbra BN254 viewing key export (64 nybbles) and field range. */
export function parseViewingKeyFieldHex(input: string): bigint {
  const h = normalizeHex64(input);
  if (!/^[0-9a-f]{64}$/.test(h)) {
    throw new Error("Viewing key must be exactly 64 hexadecimal characters.");
  }
  const v = BigInt(`0x${h}`);
  if (v >= BN254_FIELD_PRIME) throw new Error("Viewing key is not a valid BN254 field element.");
  return v;
}

export function shortViewingKeyFingerprint(hexInput: string): string {
  const h = normalizeHex64(hexInput);
  if (h.length < 16) return h;
  return `${h.slice(0, 8)}…${h.slice(-8)}`;
}
