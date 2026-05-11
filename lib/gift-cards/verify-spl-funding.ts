type RpcJson = Record<string, unknown>;

async function rpcCall(rpcUrl: string, method: string, params: unknown[]): Promise<unknown> {
  const res = await fetch(rpcUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  const json = (await res.json()) as RpcJson;
  if (json.error) {
    throw new Error(typeof json.error === "object" && json.error && "message" in json.error ? String((json.error as { message: unknown }).message) : "RPC error");
  }
  return json.result;
}

function collectParsedTransfers(tx: RpcJson): { destination: string; mint: string; amount: bigint }[] {
  const out: { destination: string; mint: string; amount: bigint }[] = [];
  const visit = (ix: RpcJson) => {
    const parsed = ix.parsed as RpcJson | undefined;
    if (!parsed || typeof parsed !== "object") return;
    const type = parsed.type as string | undefined;
    if (type !== "transfer" && type !== "transferChecked") return;
    const info = parsed.info as RpcJson | undefined;
    if (!info) return;
    const destination = info.destination as string | undefined;
    const mint = info.mint as string | undefined;
    const tokenAmount = info.tokenAmount as RpcJson | undefined;
    const amtStr =
      (tokenAmount?.amount as string | undefined) ?? (info.amount as string | undefined) ?? "0";
    if (!destination || !mint) return;
    try {
      out.push({ destination, mint, amount: BigInt(amtStr) });
    } catch {
      /* ignore */
    }
  };

  const transaction = tx.transaction as RpcJson | undefined;
  const message = transaction?.message as RpcJson | undefined;
  for (const ix of (message?.instructions as RpcJson[] | undefined) ?? []) {
    visit(ix);
  }
  const meta = tx.meta as RpcJson | undefined;
  for (const inner of (meta?.innerInstructions as { instructions?: RpcJson[] }[] | undefined) ?? []) {
    for (const ix of inner.instructions ?? []) visit(ix);
  }
  return out;
}

/**
 * Returns true if the confirmed transaction includes an SPL transfer (or transferChecked)
 * to `expectedDestinationAta` of at least `minimumAmountRaw` for `expectedMint`.
 */
export async function verifySplTransferToAta(params: {
  rpcUrl: string;
  signature: string;
  expectedDestinationAta: string;
  expectedMint: string;
  minimumAmountRaw: bigint;
}): Promise<boolean> {
  const result = await rpcCall(params.rpcUrl, "getTransaction", [
    params.signature,
    { encoding: "jsonParsed", maxSupportedTransactionVersion: 0, commitment: "confirmed" },
  ]);
  if (!result || typeof result !== "object") return false;
  const tx = result as RpcJson;
  const meta = tx.meta as RpcJson | undefined;
  if (meta?.err) return false;

  const transfers = collectParsedTransfers(tx);
  for (const t of transfers) {
    if (
      t.destination === params.expectedDestinationAta &&
      t.mint === params.expectedMint &&
      t.amount >= params.minimumAmountRaw
    ) {
      return true;
    }
  }
  return false;
}
