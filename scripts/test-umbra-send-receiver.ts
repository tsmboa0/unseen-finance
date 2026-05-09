/**
 * Umbra receiver-claimable send test — local Solana keypair (Node).
 *
 * What this script does:
 * - Ensures the local wallet is Umbra-registered (confidential + anonymous).
 * - Creates a receiver-claimable UTXO (public balance → mixer) for a recipient.
 * - Deposits into the sender's encrypted balance (ETA), then creates a receiver-claimable UTXO
 *   from encrypted balance (ETA → mixer) for the same recipient.
 *
 * Run from `unseen_app/`:
 *   npx tsx scripts/test-umbra-send-receiver.ts ./path/to/keypair.json
 *
 * Env (optional): loads `.env.local` then `.env`
 *   NEXT_PUBLIC_SOLANA_RPC_DEVNET / NEXT_PUBLIC_SOLANA_RPC_DEVNET_WS
 *   SOLANA_RPC_URL (fallback HTTP if NEXT_PUBLIC_* unset)
 *
 * SOLANA_KEYPAIR — overrides default path below when set and no CLI arg
 */

import { readFileSync, existsSync } from "node:fs";
import { homedir } from "node:os";
import { resolve, dirname, join, isAbsolute } from "node:path";
import { fileURLToPath } from "node:url";
import { inspect } from "node:util";
import { config } from "dotenv";
import { createSolanaRpc } from "@solana/kit";
import {
  createSignerFromPrivateKeyBytes,
  getClaimableUtxoScannerFunction,
  getEncryptedBalanceToReceiverClaimableUtxoCreatorFunction,
  getPublicBalanceToEncryptedBalanceDirectDepositorFunction,
  getPublicBalanceToReceiverClaimableUtxoCreatorFunction,
  getPublicBalanceToSelfClaimableUtxoCreatorFunction,
  getSelfClaimableUtxoToEncryptedBalanceClaimerFunction,
  getUmbraClient,
  getUmbraRelayer,
  getUserAccountQuerierFunction,
  getUserRegistrationFunction,
} from "@umbra-privacy/sdk";
import { isRegistrationError } from "@umbra-privacy/sdk/errors";
import {
  getClaimReceiverClaimableUtxoIntoEncryptedBalanceProver,
  getCreateReceiverClaimableUtxoFromEncryptedBalanceProver,
  getCreateReceiverClaimableUtxoFromPublicBalanceProver,
  getCreateSelfClaimableUtxoFromPublicBalanceProver,
  getUserRegistrationProver,
} from "@umbra-privacy/web-zk-prover";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

config({ path: resolve(ROOT, ".env.local") });
config({ path: resolve(ROOT, ".env") });

const RECIPIENT = "DcfVsDRQ7hT58hTWdAW99E7MytN4xd7KUirJMTojMgxo";

// Devnet mints used by the dashboard.
const DEVNET_USDC_MINT = "4oG4sjmopf5MzvTHLE8rpVJ2uyczxfsw2K84SUTpNDx7"; // Umbra-supported devnet USDC
const DEVNET_USDT_MINT = "DXQwBNGgyQ2BzGWxEriJPVmXYFQBsQbXvfvfSNTaJkL6";

const ONE_USDC = BigInt(1_000_000);
const TWO_USDT = BigInt(20_000_000);
const ONE_USDT = BigInt(1_000_000);

function maskRpcUrl(url: string): string {
  try {
    const u = new URL(url);
    if (u.searchParams.has("api-key")) u.searchParams.set("api-key", "***");
    return u.toString();
  } catch {
    return url.replace(/api-key=[^&]+/gi, "api-key=***");
  }
}

function logErrorDeep(label: string, err: unknown, depth = 0): void {
  const pad = "  ".repeat(depth);
  console.error(`${pad}[${label}]`);
  if (err === null || err === undefined) {
    console.error(`${pad}  (null/undefined)`);
    return;
  }
  if (typeof err === "object" && err !== null && "stack" in err && typeof (err as Error).stack === "string") {
    const e = err as Error & { cause?: unknown };
    console.error(`${pad}  name: ${e.name}`);
    console.error(`${pad}  message: ${e.message}`);
    if (isRegistrationError(err)) {
      console.error(`${pad}  umbraRegistrationStage: ${err.stage}`);
    }
    const props = Object.getOwnPropertyNames(err).filter((k) => !["name", "message", "stack"].includes(k));
    for (const k of props) {
      try {
        console.error(`${pad}  ${k}: ${inspect((err as Record<string, unknown>)[k], { depth: 4, colors: true })}`);
      } catch {
        console.error(`${pad}  ${k}: <uninspectable>`);
      }
    }
    console.error(`${pad}  stack:\n${e.stack}`);
    if (e.cause !== undefined && e.cause !== null) {
      logErrorDeep("cause", e.cause, depth + 1);
    }
    return;
  }
  console.error(`${pad}  ${inspect(err, { depth: 6, colors: true })}`);
}

async function probeKitRpc(httpUrl: string): Promise<void> {
  console.log("\n── @solana/kit RPC probe (getLatestBlockhash().send()) ──");
  try {
    const rpc = createSolanaRpc(httpUrl);
    const out = await rpc.getLatestBlockhash({ commitment: "confirmed" }).send();
    console.log("  OK:", inspect(out, { depth: 4, colors: true }));
  } catch (e) {
    logErrorDeep("kit getLatestBlockhash failed", e);
  }
}

function resolveKeypairPath(cliArg: string | undefined): string {
  const raw = cliArg ?? process.env.SOLANA_KEYPAIR;
  if (!raw) return join(homedir(), ".config", "solana", "id.json");
  const expanded = raw.startsWith("~/") ? join(homedir(), raw.slice(2)) : raw;
  return isAbsolute(expanded) ? expanded : resolve(ROOT, expanded);
}

async function ensureRegistered(client: Awaited<ReturnType<typeof getUmbraClient>>, address: string): Promise<void> {
  console.log("\n── Check Umbra registration ──");
  try {
    const query = getUserAccountQuerierFunction({ client });
    const state = await query(address as any);
    console.log("  user account query:", inspect(state, { depth: 5, colors: true }));
  } catch (e) {
    console.warn("  user account query failed (continuing to registration attempt).");
  }

  console.log("\n── Umbra registration (confidential + anonymous) ──");
  try {
    const zkProver = getUserRegistrationProver();
    const register = getUserRegistrationFunction({ client }, { zkProver });
    const signatures = await register({ confidential: true, anonymous: true });
    console.log("  registration tx count:", signatures.length);
    console.log("  registration signatures:", inspect(signatures, { depth: 3, colors: true }));
  } catch (e) {
    // Many environments will throw if already registered; keep logs high-signal and proceed.
    if (isRegistrationError(e)) {
      console.warn("  registration returned RegistrationError stage:", e.stage);
      console.warn("  message:", e.message);
      console.warn("  continuing (may already be registered).");
    } else {
      logErrorDeep("registration failed", e);
      throw e;
    }
  }
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

  console.log("── Config ──");
  console.log("  cwd:", ROOT);
  console.log("  keypair:", keypairPath);
  console.log("  network: devnet");
  console.log("  rpcUrl:", maskRpcUrl(rpcUrl));
  console.log("  rpcSubscriptionsUrl:", maskRpcUrl(rpcWs));
  console.log("  indexerApiEndpoint:", indexerApiEndpoint);
  console.log("  relayerApiEndpoint:", relayerApiEndpoint);
  console.log("  recipient:", RECIPIENT);
  console.log("  mints:", { USDC: DEVNET_USDC_MINT, USDT: DEVNET_USDT_MINT });

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

  await probeKitRpc(rpcUrl);

  console.log("\n── Umbra signer ──");
  const signer = await createSignerFromPrivateKeyBytes(secretBytes);
  console.log("  address:", signer.address);

  console.log("\n── getUmbraClient ──");
  const client = await getUmbraClient({
    signer,
    network: "devnet",
    rpcUrl,
    rpcSubscriptionsUrl: rpcWs,
    deferMasterSeedSignature: false,
    indexerApiEndpoint,
  });
  console.log("  client OK");

  await ensureRegistered(client, signer.address);

  console.log("\n── Create receiver-claimable UTXO (public balance → mixer) ──");
  try {
    const zkProver = getCreateReceiverClaimableUtxoFromPublicBalanceProver();
    const createUtxo = getPublicBalanceToReceiverClaimableUtxoCreatorFunction({ client }, { zkProver } as any);

    // 1 USDC (6 decimals)
    const result = await createUtxo({
      destinationAddress: RECIPIENT as any,
      mint: DEVNET_USDT_MINT as any,
      amount: TWO_USDT as any,
    });

    console.log("  result:", inspect(result, { depth: 6, colors: true }));
  } catch (e) {
    logErrorDeep("public->receiver UTXO failed", e);
    throw e;
  }

  // console.log("\n── Create self-claimable UTXO (public balance → mixer) ──");
  // try {
  //   const zkProver = getCreateSelfClaimableUtxoFromPublicBalanceProver();
  //   const createUtxo = getPublicBalanceToSelfClaimableUtxoCreatorFunction({ client }, { zkProver } as any);

  //   const result = await createUtxo({
  //     amount: TWO_USDT as any,
  //     destinationAddress: signer.address as any,
  //     mint: DEVNET_USDC_MINT as any,
  //   });

  //   console.log("  result:", inspect(result, { depth: 6, colors: true }));
  // } catch (e) {
  //   logErrorDeep("public->self UTXO failed", e);
  //   throw e;
  // }

  // console.log("\n── Scan for self-claimable UTXOs ──");
  // const scan = getClaimableUtxoScannerFunction({ client });
  // const scanned = await scan(BigInt(0) as any, BigInt(0) as any);
  // const selfClaimable = [
  //   ...(scanned.selfBurnable ?? []),
  //   ...(scanned.publicSelfBurnable ?? []),
  // ] as unknown[];
  // console.log("  selfBurnable:", scanned.selfBurnable?.length ?? 0);
  // console.log("  publicSelfBurnable:", scanned.publicSelfBurnable?.length ?? 0);
  // console.log("  total self-claimable:", selfClaimable.length);

  // if (selfClaimable.length > 0) {
  //   console.log("\n── Claim self-claimable UTXOs (mixer → encrypted balance) ──");
  //   if (!client.fetchBatchMerkleProof) {
  //     throw new Error("Umbra indexer is not configured (missing fetchBatchMerkleProof).");
  //   }
  //   const claimZkProver = getClaimReceiverClaimableUtxoIntoEncryptedBalanceProver();
  //   const relayer = getUmbraRelayer({ apiEndpoint: relayerApiEndpoint });
  //   const claimSelf = getSelfClaimableUtxoToEncryptedBalanceClaimerFunction(
  //     { client },
  //     { zkProver: claimZkProver, relayer, fetchBatchMerkleProof: client.fetchBatchMerkleProof },
  //   );
  //   const claimResult = await claimSelf(selfClaimable as any);
  //   console.log("  claim result:", inspect(claimResult, { depth: 6, colors: true }));
  // } else {
  //   console.warn("  No self-claimable UTXOs found to claim.");
  // }

  // console.log("\n── Deposit to encrypted balance (public → ETA) ──");
  // try {
  //   const deposit = getPublicBalanceToEncryptedBalanceDirectDepositorFunction({ client });
  //   // Deposit 2 USDT (6 decimals) into sender ETA
  //   const sig = await deposit(RECIPIENT as any, DEVNET_USDT_MINT as any, TWO_USDT as any);
  //   console.log("  deposit signature:", sig);
  // } catch (e) {
  //   logErrorDeep("public->encrypted deposit failed", e);
  //   throw e;
  // }

  // console.log("\n── Create receiver-claimable UTXO (encrypted balance → mixer) ──");
  // try {
  //   const zkProver = getCreateReceiverClaimableUtxoFromEncryptedBalanceProver();
  //   const createUtxo = getEncryptedBalanceToReceiverClaimableUtxoCreatorFunction({ client }, { zkProver } as any);

  //   // Send 1 USDT from sender ETA to receiver (receiver claims into their ETA later)
  //   const sigs = await createUtxo({
  //     amount: ONE_USDT as any,
  //     destinationAddress: RECIPIENT as any,
  //     mint: DEVNET_USDT_MINT as any,
  //   });

  //   console.log("  signatures:", inspect(sigs, { depth: 3, colors: true }));
  // } catch (e) {
  //   logErrorDeep("encrypted->receiver UTXO failed", e);
  //   throw e;
  // }

  console.log("\nDone.");
}

main().catch((e) => {
  console.error("Unhandled:");
  logErrorDeep("main", e);
  process.exit(1);
});

