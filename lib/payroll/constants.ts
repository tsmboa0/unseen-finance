/** Token decimals for dashboard USDC/USDT in payroll. */
export const PAYROLL_TOKEN_DECIMALS = 6 as const;

/** SPL mints used for payroll, compliance viewing keys, and dashboards. */
export const DASHBOARD_STABLE_MINTS = {
  devnet: {
    USDC: "4oG4sjmopf5MzvTHLE8rpVJ2uyczxfsw2K84SUTpNDx7",
    USDT: "DXQwBNGgyQ2BzGWxEriJPVmXYFQBsQbXvfvfSNTaJkL6",
  },
  mainnet: {
    USDC: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    USDT: "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB",
  },
} as const;

const DEVNET_MINTS = DASHBOARD_STABLE_MINTS.devnet;
const MAINNET_MINTS = DASHBOARD_STABLE_MINTS.mainnet;

export type PayrollCurrency = "USDC" | "USDT";

export function payrollStableMint(currency: PayrollCurrency, merchantNetwork: string): string {
  return merchantNetwork === "mainnet" ? MAINNET_MINTS[currency] : DEVNET_MINTS[currency];
}

export function toPayrollRawUnits(amount: string, decimals: number = PAYROLL_TOKEN_DECIMALS): bigint {
  const [wholeRaw, fractionRaw = ""] = amount.trim().split(".");
  const whole = wholeRaw === "" ? "0" : wholeRaw;
  const fraction = fractionRaw.slice(0, decimals).padEnd(decimals, "0");
  return BigInt(`${whole}${fraction}`);
}

/** Delay between sequential Umbra deposits (matches client payroll pacing). */
export const PAYROLL_INTER_TX_MS = 600;
export const PAYROLL_BATCH_SIZE = 5;
export const PAYROLL_BATCH_COOLDOWN_MS = 2500;

/** Seconds of allowed `signTransaction` policy window per payroll recipient (total window = count × this). */
export const PAYROLL_POLICY_SECONDS_PER_RECIPIENT = 60;

/** Minimum policy window (seconds) when recipient count would imply zero or negative. */
export const PAYROLL_POLICY_MIN_WINDOW_SECONDS = 60;

/** How long we skip the payroll delegation explainer after a successful `addSigners` (ms). */
export const PAYROLL_SIGNER_CONSENT_TTL_MS = 30 * 24 * 60 * 60 * 1000;
