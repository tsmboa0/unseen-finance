/**
 * Umbra two-user end-to-end test (bidirectional receiver + encrypted flows).
 *
 * What this script does:
 * - Loads two local keypairs (user1 and user2).
 * - Ensures both users are Umbra-registered.
 * - Runs bidirectional receiver-claimable sends from public balances and claims them.
 * - Funds encrypted balances, then runs bidirectional encrypted->receiver sends and claims them.
 *
 * Run from `unseen_app/`:
 *   npx tsx scripts/test-umbra-two-user-e2e.ts [user1-keypair] [user2-keypair]
 *
 * Defaults:
 *   user1: ~/.config/solana/id.json
 *   user2: ./keypair-2.json
 *
 * Optional env:
 *   NEXT_PUBLIC_SOLANA_RPC_DEVNET
 *   NEXT_PUBLIC_SOLANA_RPC_DEVNET_WS
 *   SOLANA_RPC_URL
 *   NEXT_PUBLIC_UMBRA_INDEXER_URL
 *   NEXT_PUBLIC_UMBRA_RELAYER_URL
 *   UMBRA_MAX_TREE_SCAN (default 64)
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
  getPublicBalanceToEncryptedBalanceDirectDepositorFunction,
  getPublicBalanceToReceiverClaimableUtxoCreatorFunction,
  getEncryptedBalanceToReceiverClaimableUtxoCreatorFunction,
  getReceiverClaimableUtxoToEncryptedBalanceClaimerFunction,
  getUmbraClient,
  getUmbraRelayer,
  getUserAccountQuerierFunction,
  getUserRegistrationFunction,
  getSelfClaimableUtxoToPublicBalanceClaimerFunction,
} from "@umbra-privacy/sdk";
import { isRegistrationError } from "@umbra-privacy/sdk/errors";
import {
  getClaimReceiverClaimableUtxoIntoEncryptedBalanceProver,
  getCreateReceiverClaimableUtxoFromEncryptedBalanceProver,
  getCreateReceiverClaimableUtxoFromPublicBalanceProver,
  getUserRegistrationProver,
} from "@umbra-privacy/web-zk-prover";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

config({ path: resolve(ROOT, ".env.local") });
config({ path: resolve(ROOT, ".env") });

const DEVNET_USDC_MINT = "4oG4sjmopf5MzvTHLE8rpVJ2uyczxfsw2K84SUTpNDx7";
const DEVNET_USDT_MINT = "DXQwBNGgyQ2BzGWxEriJPVmXYFQBsQbXvfvfSNTaJkL6";

const PUBLIC_SEND_USDC = BigInt(10_000_000); // 1 USDC
const ETA_FUND_USDT = BigInt(20_000_000); // 20 USDT
const ENCRYPTED_SEND_USDT = BigInt(10_000_000); // 10 USDT

function maskRpcUrl(url: string): string {
  try {
    const u = new URL(url);
    if (u.searchParams.has("api-key")) u.searchParams.set("api-key", "***");
    return u.toString();
  } catch {
    return url.replace(/api-key=[^&]+/gi, "api-key=***");
  }
}

function resolveKeypairPath(raw: string | undefined, fallbackPath: string): string {
  const input = raw ?? fallbackPath;
  const expanded = input.startsWith("~/") ? join(homedir(), input.slice(2)) : input;
  return isAbsolute(expanded) ? expanded : resolve(ROOT, expanded);
}

function readKeypairBytes(path: string): Uint8Array {
  if (!existsSync(path)) {
    throw new Error(`Missing keypair file: ${path}`);
  }
  const json = JSON.parse(readFileSync(path, "utf8")) as unknown;
  if (!Array.isArray(json)) {
    throw new Error(`Invalid keypair JSON at ${path} (expected number array).`);
  }
  return new Uint8Array(json);
}

function keyOf(utxo: unknown): string {
  const u = utxo as { treeIndex?: bigint | number; insertionIndex?: bigint | number };
  return `${String(u.treeIndex)}:${String(u.insertionIndex)}`;
}

function logTxSignatures(label: string, value: unknown): void {
  const signatures: string[] = [];
  const walk = (v: unknown): void => {
    if (!v || typeof v !== "object") return;
    if (Array.isArray(v)) {
      for (const item of v) walk(item);
      return;
    }
    const obj = v as Record<string, unknown>;
    for (const [k, val] of Object.entries(obj)) {
      if (typeof val === "string" && k.toLowerCase().includes("signature")) {
        signatures.push(`${k}=${val}`);
      } else {
        walk(val);
      }
    }
  };
  walk(value);
  if (signatures.length === 0) {
    console.log(`  ${label} tx signatures: <none-found-in-result-shape>`);
    return;
  }
  console.log(`  ${label} tx signatures (${signatures.length}):`);
  for (const s of signatures) console.log(`    - ${s}`);
}

async function ensureRegistered(client: Awaited<ReturnType<typeof getUmbraClient>>, label: string): Promise<void> {
  console.log(`\n── Ensure registration: ${label} ──`);
  let shouldRegister = true;
  try {
    const query = getUserAccountQuerierFunction({ client });
    const state = await query(client.signer.address as any);
    console.log(`  ${label} account state:`, inspect(state, { depth: 4, colors: true }));
    if (
      state &&
      (state as { state?: string }).state === "exists" &&
      (state as { data?: {
        isInitialised?: boolean;
        isUserAccountX25519KeyRegistered?: boolean;
        isUserCommitmentRegistered?: boolean;
        isActiveForAnonymousUsage?: boolean;
      } }).data
    ) {
      const data = (state as { data: {
        isInitialised?: boolean;
        isUserAccountX25519KeyRegistered?: boolean;
        isUserCommitmentRegistered?: boolean;
        isActiveForAnonymousUsage?: boolean;
      } }).data;
      const alreadyRegistered =
        data.isInitialised === true &&
        data.isUserAccountX25519KeyRegistered === true &&
        data.isUserCommitmentRegistered === true &&
        data.isActiveForAnonymousUsage === true;
      if (alreadyRegistered) {
        shouldRegister = false;
        console.log(`  ${label} already fully registered. Skipping registration.`);
      }
    }
  } catch {
    console.warn(`  ${label} account query failed (continuing).`);
  }

  if (!shouldRegister) return;

  try {
    const zkProver = getUserRegistrationProver();
    const register = getUserRegistrationFunction({ client }, { zkProver });
    const sigs = await register({ confidential: true, anonymous: true });
    console.log(`  ${label} registration txs:`, sigs.length);
  } catch (e) {
    if (isRegistrationError(e)) {
      console.warn(`  ${label} registration stage=${e.stage}; continuing (likely already registered).`);
      return;
    }
    throw e;
  }
}

type ReceiverScanSummary = {
  received: unknown[];
  publicReceived: unknown[];
  allReceiverClaimables: unknown[];
};

async function scanReceiverClaimables(
  client: Awaited<ReturnType<typeof getUmbraClient>>,
  maxTreeScan: number,
  label: string,
): Promise<ReceiverScanSummary> {
  const scan = getClaimableUtxoScannerFunction({ client });
  const received: unknown[] = [];
  const publicReceived: unknown[] = [];
  let treesWithAny = 0;
  for (let t = 0; t < maxTreeScan; t += 1) {
    const result = await scan(BigInt(t) as any, BigInt(0) as any);
    const r = result.received ?? [];
    const pr = result.publicReceived ?? [];
    if (r.length > 0 || pr.length > 0) treesWithAny += 1;
    console.log(`  ${label} scan tree=${t} received=${r.length} publicReceived=${pr.length}`);
    received.push(...r);
    publicReceived.push(...pr);
  }
  const allReceiverClaimables = [...received, ...publicReceived];
  console.log(
    `  ${label} scan summary: treesWithAny=${treesWithAny}/${maxTreeScan}, received=${received.length}, publicReceived=${publicReceived.length}, total=${allReceiverClaimables.length}`,
  );
  return { received, publicReceived, allReceiverClaimables };
}

async function claimNewReceiverUtxos(
  receiverClient: Awaited<ReturnType<typeof getUmbraClient>>,
  receiverLabel: string,
  beforeKeys: Set<string>,
  relayerApiEndpoint: string,
  maxTreeScan: number,
): Promise<void> {
  console.log(`  ${receiverLabel} scanning AFTER send to detect new claimables...`);
  const afterSummary = await scanReceiverClaimables(receiverClient, maxTreeScan, `${receiverLabel}-after`);
  const after = afterSummary.allReceiverClaimables;
  const delta = after.filter((u) => !beforeKeys.has(keyOf(u)));
  console.log(`  ${receiverLabel} new receiver-claimable UTXOs:`, delta.length);
  if (delta.length > 0) {
    console.log(`  ${receiverLabel} delta UTXO keys:`);
    for (const d of delta) console.log(`    - ${keyOf(d)}`);
  }
  if (delta.length === 0) {
    throw new Error(`${receiverLabel}: expected new receiver-claimable UTXO but found none.`);
  }

  if (!receiverClient.fetchBatchMerkleProof) {
    throw new Error(`${receiverLabel}: missing fetchBatchMerkleProof (indexer not configured).`);
  }
  const zkProver = getClaimReceiverClaimableUtxoIntoEncryptedBalanceProver();
  const relayer = getUmbraRelayer({ apiEndpoint: relayerApiEndpoint });
  const claim = getReceiverClaimableUtxoToEncryptedBalanceClaimerFunction(
    { client: receiverClient },
    { zkProver, relayer, fetchBatchMerkleProof: receiverClient.fetchBatchMerkleProof },
  );
  const result = await claim(delta as any);
  console.log(`  ${receiverLabel} claim result:`, inspect(result, { depth: 5, colors: true }));
  logTxSignatures(`${receiverLabel} claim`, result);
}

async function main(): Promise<void> {
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
  const maxTreeScanRaw = Number(process.env.UMBRA_MAX_TREE_SCAN ?? "2");
  const maxTreeScan = Math.max(1, Number.isFinite(maxTreeScanRaw) ? Math.floor(maxTreeScanRaw) : 2);

  const user1Path = resolveKeypairPath(process.argv[2], join(homedir(), ".config", "solana", "id.json"));
  const user2Path = resolveKeypairPath(process.argv[3], "keypair-2.json");

  console.log("── Config ──");
  console.log("  rpcUrl:", maskRpcUrl(rpcUrl));
  console.log("  rpcSubscriptionsUrl:", maskRpcUrl(rpcWs));
  console.log("  indexerApiEndpoint:", indexerApiEndpoint);
  console.log("  relayerApiEndpoint:", relayerApiEndpoint);
  console.log("  user1Keypair:", user1Path);
  console.log("  user2Keypair:", user2Path);
  console.log("  maxTreeScan:", maxTreeScan);

  const user1Signer = await createSignerFromPrivateKeyBytes(readKeypairBytes(user1Path));
  const user2Signer = await createSignerFromPrivateKeyBytes(readKeypairBytes(user2Path));

  const user1Client = await getUmbraClient({
    signer: user1Signer,
    network: "devnet",
    rpcUrl,
    rpcSubscriptionsUrl: rpcWs,
    deferMasterSeedSignature: false,
    indexerApiEndpoint,
  });
  const user2Client = await getUmbraClient({
    signer: user2Signer,
    network: "devnet",
    rpcUrl,
    rpcSubscriptionsUrl: rpcWs,
    deferMasterSeedSignature: false,
    indexerApiEndpoint,
  });

  console.log("\n── Users ──");
  console.log("  user1:", user1Signer.address);
  console.log("  user2:", user2Signer.address);

  await ensureRegistered(user1Client, "user1");
  await ensureRegistered(user2Client, "user2");

  const createReceiverFromPublic1 = getPublicBalanceToReceiverClaimableUtxoCreatorFunction(
    { client: user1Client },
    { zkProver: getCreateReceiverClaimableUtxoFromPublicBalanceProver() } as any,
  );
  const createReceiverFromPublic2 = getPublicBalanceToReceiverClaimableUtxoCreatorFunction(
    { client: user2Client },
    { zkProver: getCreateReceiverClaimableUtxoFromPublicBalanceProver() } as any,
  );
  const createReceiverFromEncrypted1 = getEncryptedBalanceToReceiverClaimableUtxoCreatorFunction(
    { client: user1Client },
    { zkProver: getCreateReceiverClaimableUtxoFromEncryptedBalanceProver() } as any,
  );
  const createReceiverFromEncrypted2 = getEncryptedBalanceToReceiverClaimableUtxoCreatorFunction(
    { client: user2Client },
    { zkProver: getCreateReceiverClaimableUtxoFromEncryptedBalanceProver() } as any,
  );

  const depositToEncrypted1 = getPublicBalanceToEncryptedBalanceDirectDepositorFunction({ client: user1Client });
  const depositToEncrypted2 = getPublicBalanceToEncryptedBalanceDirectDepositorFunction({ client: user2Client });

  console.log("\n=== Flow 1: user1 public -> user2 receiver UTXO -> user2 claims ===");
  {
    console.log("  user2 scanning BEFORE receive...");
    const beforeSummary = await scanReceiverClaimables(user2Client, maxTreeScan, "user2-before");
    const beforeKeys = new Set(beforeSummary.allReceiverClaimables.map(keyOf));
    console.log("  user2 before total receiver-claimable:", beforeSummary.allReceiverClaimables.length);
    const sendResult = await createReceiverFromPublic1({
      amount: PUBLIC_SEND_USDC as any,
      destinationAddress: user2Signer.address as any,
      mint: DEVNET_USDC_MINT as any,
    });
    console.log("  send result:", inspect(sendResult, { depth: 4, colors: true }));
    logTxSignatures("flow1 send (user1->user2 public)", sendResult);
    await claimNewReceiverUtxos(user2Client, "user2", beforeKeys, relayerApiEndpoint, maxTreeScan);
  }

  console.log("\n=== Flow 2: user2 public -> user1 receiver UTXO -> user1 claims ===");
  {
    console.log("  user1 scanning BEFORE receive...");
    const beforeSummary = await scanReceiverClaimables(user1Client, maxTreeScan, "user1-before");
    const beforeKeys = new Set(beforeSummary.allReceiverClaimables.map(keyOf));
    console.log("  user1 before total receiver-claimable:", beforeSummary.allReceiverClaimables.length);
    const sendResult = await createReceiverFromPublic2({
      amount: PUBLIC_SEND_USDC as any,
      destinationAddress: user1Signer.address as any,
      mint: DEVNET_USDC_MINT as any,
    });
    console.log("  send result:", inspect(sendResult, { depth: 4, colors: true }));
    logTxSignatures("flow2 send (user2->user1 public)", sendResult);
    await claimNewReceiverUtxos(user1Client, "user1", beforeKeys, relayerApiEndpoint, maxTreeScan);
  }

  console.log("\n=== Flow 3: fund encrypted balances (both users) ===");
  {
    const sig1 = await depositToEncrypted1(user2Signer.address as any, DEVNET_USDT_MINT as any, ETA_FUND_USDT as any);
    const sig2 = await depositToEncrypted2(user1Signer.address as any, DEVNET_USDT_MINT as any, ETA_FUND_USDT as any);
    console.log("  user1 ETA fund sig:", sig1);
    console.log("  user2 ETA fund sig:", sig2);
  }

  console.log("\n=== Flow 4: user1 encrypted -> user2 receiver UTXO -> user2 claims ===");
  {
    console.log("  user2 scanning BEFORE receive...");
    const beforeSummary = await scanReceiverClaimables(user2Client, maxTreeScan, "user2-before");
    const beforeKeys = new Set(beforeSummary.allReceiverClaimables.map(keyOf));
    console.log("  user2 before total receiver-claimable:", beforeSummary.allReceiverClaimables.length);
    const sendResult = await createReceiverFromEncrypted1({
      amount: ENCRYPTED_SEND_USDT as any,
      destinationAddress: user2Signer.address as any,
      mint: DEVNET_USDT_MINT as any,
    });
    console.log("  send result:", inspect(sendResult, { depth: 4, colors: true }));
    logTxSignatures("flow4 send (user1->user2 encrypted)", sendResult);
    await claimNewReceiverUtxos(user2Client, "user2", beforeKeys, relayerApiEndpoint, maxTreeScan);
  }

  console.log("\n=== Flow 5: user2 encrypted -> user1 receiver UTXO -> user1 claims ===");
  {
    console.log("  user1 scanning BEFORE receive...");
    const beforeSummary = await scanReceiverClaimables(user1Client, maxTreeScan, "user1-before");
    const beforeKeys = new Set(beforeSummary.allReceiverClaimables.map(keyOf));
    console.log("  user1 before total receiver-claimable:", beforeSummary.allReceiverClaimables.length);
    const sendResult = await createReceiverFromEncrypted2({
      amount: ENCRYPTED_SEND_USDT as any,
      destinationAddress: user1Signer.address as any,
      mint: DEVNET_USDT_MINT as any,
    });
    console.log("  send result:", inspect(sendResult, { depth: 4, colors: true }));
    logTxSignatures("flow5 send (user2->user1 encrypted)", sendResult);
    await claimNewReceiverUtxos(user1Client, "user1", beforeKeys, relayerApiEndpoint, maxTreeScan);
  }

  console.log("\nAll two-user E2E flows completed.");
}

main().catch((e) => {
  console.error("\nFAILED:");
  console.error(inspect(e, { depth: 8, colors: true }));
  process.exit(1);
});

