import { payrollStableMint, type PayrollCurrency } from "@/lib/payroll/constants";

export const GIFT_FEE_BPS = BigInt(50); // 0.5%
export const GIFT_FEE_MIN_RAW = BigInt(10_000); // 0.01 USDC (6 decimals)
export const GIFT_MIN_FACE_RAW = BigInt(100_000); // 0.1 USDC
export const GIFT_MAX_FACE_RAW = BigInt(1_000_000 * 1_000_000); // 1M USDC sanity cap

export function giftMint(currency: PayrollCurrency, merchantNetwork: string): string {
  return payrollStableMint(currency, merchantNetwork);
}

export function platformFeeRawForFace(faceRaw: bigint): bigint {
  const pct = (faceRaw * GIFT_FEE_BPS) / BigInt(10_000);
  return pct > GIFT_FEE_MIN_RAW ? pct : GIFT_FEE_MIN_RAW;
}

export function fundTotalRawForFace(faceRaw: bigint): bigint {
  return faceRaw + platformFeeRawForFace(faceRaw);
}
