/**
 * Umbra scan + claim-available test (no registration step).
 *
 * What this script does:
 * - Creates Umbra client from local keypair.
 * - Scans claimable UTXOs from the configured cursor.
 * - Logs all UTXO buckets returned by the scanner.
 * - Claims all available receiver-claimable UTXOs into encrypted balance.
 *
 * Run from `unseen_app/`:
 *   npx tsx scripts/test-umbra-scan-claim-available.ts ./path/to/keypair.json
 *
 * Optional env:
 *   NEXT_PUBLIC_SOLANA_RPC_DEVNET
 *   NEXT_PUBLIC_SOLANA_RPC_DEVNET_WS
 *   SOLANA_RPC_URL
 *   NEXT_PUBLIC_UMBRA_INDEXER_URL
 *   NEXT_PUBLIC_UMBRA_RELAYER_URL
 *   UMBRA_TREE_INDEX (optional explicit override; if unset, auto-scan tree 0..N)
 *   UMBRA_START_INSERTION_INDEX (default 0; used for each scanned tree)
 *   UMBRA_END_INSERTION_INDEX (optional)
 *   UMBRA_MAX_TREE_SCAN (default 64; used only when UMBRA_TREE_INDEX is unset)
 *   SOLANA_KEYPAIR (used if CLI arg omitted)
 */

import { readFileSync, existsSync } from "node:fs";
import { homedir } from "node:os";
import { resolve, dirname, join, isAbsolute } from "node:path";
import { fileURLToPath } from "node:url";
import { inspect } from "node:util";
import { config } from "dotenv";
import {
  createSignerFromPrivateKeyBytes,
  getClaimableUtxoScannerFunction,
  getReceiverClaimableUtxoToEncryptedBalanceClaimerFunction,
  getUmbraClient,
  getUmbraRelayer,
} from "@umbra-privacy/sdk";
import { getClaimReceiverClaimableUtxoIntoEncryptedBalanceProver } from "@umbra-privacy/web-zk-prover";
import { isClaimUtxoError, isFetchUtxosError } from "@umbra-privacy/sdk/errors";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

config({ path: resolve(ROOT, ".env.local") });
config({ path: resolve(ROOT, ".env") });

function maskRpcUrl(url: string): string {
  try {
    const u = new URL(url);
    if (u.searchParams.has("api-key")) u.searchParams.set("api-key", "***");
    return u.toString();
  } catch {
    return url.replace(/api-key=[^&]+/gi, "api-key=***");
  }
}

function resolveKeypairPath(cliArg: string | undefined): string {
  const raw = cliArg ?? process.env.SOLANA_KEYPAIR;
  if (!raw) return join(homedir(), ".config", "solana", "id.json");
  const expanded = raw.startsWith("~/") ? join(homedir(), raw.slice(2)) : raw;
  return isAbsolute(expanded) ? expanded : resolve(ROOT, expanded);
}

function toBigIntEnv(value: string | undefined, fallback: bigint): bigint {
  if (!value || value.trim() === "") return fallback;
  return BigInt(value);
}

function stringifyBigIntSafe(value: unknown): string {
  return JSON.stringify(
    value,
    (_, v) => (typeof v === "bigint" ? `${v.toString()}n` : v),
    2,
  );
}

function logUtxoList(label: string, list: unknown[]): void {
  console.log(`\n${label}: ${list.length}`);
  if (list.length === 0) return;
  list.forEach((item, index) => {
    const data = item as {
      insertionIndex?: bigint | number;
      amount?: bigint | number;
      mint?: string;
      destinationAddress?: string;
    };
    const insertionIndex = data.insertionIndex ?? "<none>";
    const amount = data.amount ?? "<none>";
    console.log(`  [${index}] insertionIndex=${String(insertionIndex)} amount=${String(amount)} mint=${data.mint ?? "<none>"}`);
  });
}

function getTotalUtxos(result: {
  selfBurnable?: unknown[];
  received?: unknown[];
  publicSelfBurnable?: unknown[];
  publicReceived?: unknown[];
}): number {
  return (
    (result.selfBurnable?.length ?? 0) +
    (result.received?.length ?? 0) +
    (result.publicSelfBurnable?.length ?? 0) +
    (result.publicReceived?.length ?? 0)
  );
}

async function main(): Promise<void> {
  const keypairArg = process.argv[2];
  const keypairPath = resolveKeypairPath(keypairArg);

  const rpcUrl =
    process.env.NEXT_PUBLIC_SOLANA_RPC_DEVNET ??
    process.env.SOLANA_RPC_URL ??
    "https://api.devnet.solana.com";
  const rpcWs =
    process.env.NEXT_PUBLIC_SOLANA_RPC_DEVNET_WS ?? "wss://api.devnet.solana.com";
  const indexerApiEndpoint =
    process.env.NEXT_PUBLIC_UMBRA_INDEXER_URL ?? "https://utxo-indexer.api-devnet.umbraprivacy.com";
  const relayerApiEndpoint =
    process.env.NEXT_PUBLIC_UMBRA_RELAYER_URL ?? "https://relayer.api-devnet.umbraprivacy.com";

  const explicitTreeIndexRaw = process.env.UMBRA_TREE_INDEX;
  const explicitTreeIndex =
    explicitTreeIndexRaw && explicitTreeIndexRaw.trim() !== ""
      ? BigInt(explicitTreeIndexRaw)
      : undefined;
  const startInsertionIndex = toBigIntEnv(process.env.UMBRA_START_INSERTION_INDEX, BigInt(0));
  const endInsertionIndexRaw = process.env.UMBRA_END_INSERTION_INDEX;
  const endInsertionIndex =
    endInsertionIndexRaw && endInsertionIndexRaw.trim() !== ""
      ? BigInt(endInsertionIndexRaw)
      : undefined;
  const maxTreeScanRaw = process.env.UMBRA_MAX_TREE_SCAN;
  const maxTreeScan =
    maxTreeScanRaw && maxTreeScanRaw.trim() !== ""
      ? Number(maxTreeScanRaw)
      : 64;

  console.log("── Config ──");
  console.log("  cwd:", ROOT);
  console.log("  keypair:", keypairPath);
  console.log("  network: devnet");
  console.log("  rpcUrl:", maskRpcUrl(rpcUrl));
  console.log("  rpcSubscriptionsUrl:", maskRpcUrl(rpcWs));
  console.log("  indexerApiEndpoint:", indexerApiEndpoint);
  console.log("  relayerApiEndpoint:", relayerApiEndpoint);
  console.log("  scan:", {
    treeIndex: explicitTreeIndex !== undefined ? explicitTreeIndex.toString() : "auto-from-0",
    startInsertionIndex: startInsertionIndex.toString(),
    endInsertionIndex: endInsertionIndex?.toString() ?? "<none>",
    maxTreeScan,
  });

  if (!existsSync(keypairPath)) {
    console.error("\nMissing keypair file:", keypairPath);
    process.exit(1);
  }

  const json = JSON.parse(readFileSync(keypairPath, "utf8")) as unknown;
  if (!Array.isArray(json)) {
    console.error("Keypair JSON must be a byte array (Solana CLI format).");
    process.exit(1);
  }
  const secretBytes = new Uint8Array(json);

  console.log("\n── Umbra signer/client ──");
  const signer = await createSignerFromPrivateKeyBytes(secretBytes);
  console.log("  signer:", signer.address);
  const client = await getUmbraClient({
    signer,
    network: "devnet",
    rpcUrl,
    rpcSubscriptionsUrl: rpcWs,
    deferMasterSeedSignature: false,
    indexerApiEndpoint,
  });
  console.log("  client OK");

  console.log("\n── Scan claimable UTXOs ──");
  const scan = getClaimableUtxoScannerFunction({ client });

  const scanTree = async (tree: bigint) => {
    return endInsertionIndex === undefined
      ? await scan(tree as any, startInsertionIndex as any)
      : await scan(tree as any, startInsertionIndex as any, endInsertionIndex as any);
  };

  let selectedTreeIndex = explicitTreeIndex ?? BigInt(0);
  let scanResult: Awaited<ReturnType<typeof scan>> | null = null;

  if (explicitTreeIndex !== undefined) {
    try {
      scanResult = await scanTree(explicitTreeIndex);
      console.log(`  tree=${explicitTreeIndex.toString()} total=${getTotalUtxos(scanResult)}`);
    } catch (e) {
      if (isFetchUtxosError(e)) {
        console.error(`Fetch UTXOs failed at stage="${e.stage}":`, e.message);
      }
      throw e;
    }
  } else {
    const safeMaxTreeScan = Number.isFinite(maxTreeScan) && maxTreeScan > 0 ? Math.floor(maxTreeScan) : 64;
    for (let tree = 0; tree < safeMaxTreeScan; tree += 1) {
      const treeBigInt = BigInt(tree);
      try {
        const result = await scanTree(treeBigInt);
        const total = getTotalUtxos(result);
        console.log(`  tree=${tree} total=${total}`);
        if (total > 0) {
          selectedTreeIndex = treeBigInt;
          scanResult = result;
          console.log(`  found UTXOs in tree=${tree}`);
          break;
        }
      } catch (e) {
        if (isFetchUtxosError(e)) {
          console.error(`Fetch UTXOs failed at tree=${tree} stage="${e.stage}":`, e.message);
        }
        throw e;
      }
    }

    if (!scanResult) {
      console.log(`  No UTXOs found across trees [0..${safeMaxTreeScan - 1}].`);
      return;
    }
  }

  console.log(`  using treeIndex=${selectedTreeIndex.toString()} for claim flow`);

  logUtxoList("  selfBurnable", (scanResult.selfBurnable ?? []) as unknown[]);
  logUtxoList("  received", (scanResult.received ?? []) as unknown[]);
  logUtxoList("  publicSelfBurnable", (scanResult.publicSelfBurnable ?? []) as unknown[]);
  logUtxoList("  publicReceived", (scanResult.publicReceived ?? []) as unknown[]);

  const availableReceiverClaimable = [
    ...(scanResult.received ?? []),
    ...(scanResult.publicReceived ?? []),
  ] as unknown[];

  console.log("\n── Claim available receiver-claimable UTXOs ──");
  if (availableReceiverClaimable.length === 0) {
    console.log("  No receiver-claimable UTXOs available. Nothing to claim.");
    return;
  }

  const zkProver = getClaimReceiverClaimableUtxoIntoEncryptedBalanceProver();
  const relayer = getUmbraRelayer({ apiEndpoint: relayerApiEndpoint });
  if (!client.fetchBatchMerkleProof) {
    throw new Error("Umbra indexer is not configured (missing fetchBatchMerkleProof).");
  }
  const claim = getReceiverClaimableUtxoToEncryptedBalanceClaimerFunction(
    { client },
    { zkProver, relayer, fetchBatchMerkleProof: client.fetchBatchMerkleProof },
  );

  try {
    const claimResult = await claim(availableReceiverClaimable as any);
    console.log("  Claim success.");
    console.log("  signatures:", inspect(claimResult, { depth: 6, colors: true }));
  } catch (e) {
    if (isClaimUtxoError(e)) {
      console.error(`Claim failed at stage="${e.stage}":`, e.message);
    }
    throw e;
  }

  console.log("\n── Re-scan after claim ──");
  const after =
    endInsertionIndex === undefined
      ? await scan(selectedTreeIndex as any, startInsertionIndex as any)
      : await scan(selectedTreeIndex as any, startInsertionIndex as any, endInsertionIndex as any);

  console.log(
    stringifyBigIntSafe({
      treeIndex: selectedTreeIndex,
      before: {
        selfBurnable: scanResult.selfBurnable?.length ?? 0,
        received: scanResult.received?.length ?? 0,
        publicSelfBurnable: scanResult.publicSelfBurnable?.length ?? 0,
        publicReceived: scanResult.publicReceived?.length ?? 0,
      },
      after: {
        selfBurnable: after.selfBurnable?.length ?? 0,
        received: after.received?.length ?? 0,
        publicSelfBurnable: after.publicSelfBurnable?.length ?? 0,
        publicReceived: after.publicReceived?.length ?? 0,
      },
    }),
  );
}

main().catch((e) => {
  console.error("\nFAILED:");
  console.error(inspect(e, { depth: 8, colors: true }));
  process.exit(1);
});
