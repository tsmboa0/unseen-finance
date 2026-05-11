/** Serialize Umbra BN254 viewing key field elements (branded bigint) for display/export. */
export function umbraViewingKeyFieldToHex(value: unknown): string {
  let v: bigint;
  if (typeof value === "bigint") v = value;
  else if (typeof value === "number" && Number.isFinite(value)) v = BigInt(Math.trunc(value));
  else if (typeof value === "string" && /^-?\d+$/.test(value.trim())) v = BigInt(value.trim());
  else {
    throw new Error("Unsupported viewing key value type.");
  }
  const h = v.toString(16);
  return h.length <= 64 ? h.padStart(64, "0") : h.slice(-64).padStart(64, "0");
}
