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

export type VerifyManyResult = {
  anyConfirmed: boolean;
  confirmedSignature: string | null;
  results: Array<{ signature: string; result: VerifyResult }>;
  reason?: string;
};

// ─── Core RPC call ───────────────────────────────────────────────────────────

export async function rpc<T>(method: string, params: unknown[]): Promise<T> {
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

export async function verifyTransactions(
  txSignatures: string[]
): Promise<VerifyManyResult> {
  if (txSignatures.length === 0) {
    return {
      anyConfirmed: false,
      confirmedSignature: null,
      results: [],
      reason: "No transaction signatures provided",
    };
  }

  const results: Array<{ signature: string; result: VerifyResult }> = [];
  for (const signature of txSignatures) {
    const result = await verifyTransaction(signature);
    results.push({ signature, result });
    if (result.confirmed) {
      return {
        anyConfirmed: true,
        confirmedSignature: signature,
        results,
      };
    }
  }

  return {
    anyConfirmed: false,
    confirmedSignature: null,
    results,
    reason: results[results.length - 1]?.result.confirmed
      ? undefined
      : (results[results.length - 1]?.result as { confirmed: false; reason: string }).reason,
  };
}

// ─── Balances ─────────────────────────────────────────────────────────────────

export async function getSolBalance(address: string): Promise<number> {
  try {
    const res = await rpc<{ value: number }>("getBalance", [address]);
    return res.value / 1e9;
  } catch {
    return 0;
  }
}

export async function getTokenBalance(walletAddress: string, mintAddress: string): Promise<number> {
  try {
    const res = await rpc<{ value: Array<{ account: { data: { parsed: { info: { tokenAmount: { uiAmount: number } } } } } }> }>(
      "getTokenAccountsByOwner",
      [
        walletAddress,
        { mint: mintAddress },
        { encoding: "jsonParsed" }
      ]
    );
    if (res.value && res.value.length > 0) {
      return res.value[0].account.data.parsed.info.tokenAmount.uiAmount || 0;
    }
    return 0;
  } catch {
    return 0;
  }
}
