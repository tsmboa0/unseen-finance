import type { PrivyPoliciesService } from "@privy-io/node";

import {
  PAYROLL_POLICY_MIN_WINDOW_SECONDS,
  PAYROLL_POLICY_SECONDS_PER_RECIPIENT,
} from "@/lib/payroll/constants";

type PayrollPolicyCreateBody = Omit<Parameters<PrivyPoliciesService["create"]>[0], "idempotency_key">;
type PayrollPolicyRule = NonNullable<PayrollPolicyCreateBody["rules"]>[number];

/**
 * Time-bounded Solana policy for Umbra + Privy server signer.
 *
 * Privy’s policy API does not expose `signMessage` as a rule `method` (only e.g.
 * `signTransaction`, `signTransactionBytes`, `*`, …). Umbra with
 * `deferMasterSeedSignature: false` still triggers RPCs that fail if we only allow
 * `signTransaction`. A single time-windowed `ALLOW` on method `*` keeps payroll
 * constrained to the window while covering those RPCs.
 */
export function buildPayrollSolanaPolicyCreateParams(
  runId: string,
  recipientCount: number,
): PayrollPolicyCreateBody {
  const windowSec = Math.max(
    PAYROLL_POLICY_MIN_WINDOW_SECONDS,
    recipientCount * PAYROLL_POLICY_SECONDS_PER_RECIPIENT,
  );
  const nowSec = Math.floor(Date.now() / 1000);
  const endSec = nowSec + windowSec;

  const timeConditions: PayrollPolicyRule["conditions"] = [
    {
      field: "current_unix_timestamp",
      field_source: "system",
      operator: "gte",
      value: String(nowSec),
    },
    {
      field: "current_unix_timestamp",
      field_source: "system",
      operator: "lte",
      value: String(endSec),
    },
  ];

  return {
    chain_type: "solana",
    name: `payroll-${runId}`,
    version: "1.0",
    rules: [
      {
        name: "allow-solana-rpcs-in-payroll-window",
        action: "ALLOW",
        method: "*",
        conditions: timeConditions,
      },
    ],
  };
}
