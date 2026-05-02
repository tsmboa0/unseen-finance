// ─── Solana RPC Helpers ───────────────────────────────────────────────────────
// Lightweight wrappers around raw JSON-RPC calls.
// No heavy SDK dependency needed for Phase 1 — just fetch.

const RPC_URL =
  process.env.SOLANA_RPC_URL ?? "https://api.devnet.solana.com";

// ─── Types ───────────────────────────────────────────────────────────────────

export type SignatureStatus = {
  slot: number;
  confirmations: number | null;
  err: unknown | null;
  confirmationStatus: "processed" | "confirmed" | "finalized" | null;
};

export type VerifyResult =
  | { confirmed: true; slot: number; finalized: boolean }
  | { confirmed: false; reason: string };

// ─── Core RPC call ───────────────────────────────────────────────────────────

async function rpc<T>(method: string, params: unknown[]): Promise<T> {
  const res = await fetch(RPC_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    next: { revalidate: 0 }, // never cache RPC responses
  });

  if (!res.ok) {
    throw new Error(`Solana RPC HTTP error: ${res.status}`);
  }

  const json = (await res.json()) as { result?: T; error?: { message: string } };

  if (json.error) {
    throw new Error(`Solana RPC error: ${json.error.message}`);
  }

  return json.result as T;
}

// ─── getSignatureStatuses ─────────────────────────────────────────────────────

/**
 * Verify that a Solana transaction signature exists on-chain and is confirmed.
 *
 * @param txSignature - base58-encoded Solana tx signature
 * @returns VerifyResult indicating whether the tx is confirmed
 */
export async function verifyTransaction(
  txSignature: string
): Promise<VerifyResult> {
  type RpcResult = { value: (SignatureStatus | null)[] };

  let result: RpcResult;

  try {
    result = await rpc<RpcResult>("getSignatureStatuses", [
      [txSignature],
      { searchTransactionHistory: true },
    ]);
  } catch (err) {
    return {
      confirmed: false,
      reason: err instanceof Error ? err.message : "RPC error",
    };
  }

  const status = result?.value?.[0];

  if (!status) {
    return { confirmed: false, reason: "Transaction not found on Solana" };
  }

  if (status.err) {
    return {
      confirmed: false,
      reason: `Transaction failed on-chain: ${JSON.stringify(status.err)}`,
    };
  }

  const isConfirmed =
    status.confirmationStatus === "confirmed" ||
    status.confirmationStatus === "finalized";

  if (!isConfirmed) {
    return {
      confirmed: false,
      reason: `Transaction status: ${status.confirmationStatus ?? "unknown"}`,
    };
  }

  return {
    confirmed: true,
    slot: status.slot,
    finalized: status.confirmationStatus === "finalized",
  };
}
