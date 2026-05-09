/**
 * Test: can an unregistered wallet (keypair3) send a receiver-claimable UTXO
 * to a registered recipient (keypair-2)?
 *
 * - keypair3  → sender  (NOT registered, registration check intentionally skipped)
 * - keypair-2 → recipient (already registered)
 *
 * The sender's Umbra client is created with deferMasterSeedSignature: true to
 * avoid triggering the consent signature prompt (since keypair3 has no master
 * seed). Only the public-balance → receiver-claimable UTXO flow is tested.
 *
 * Run from `unseen_app/`:
 *   npx tsx scripts/test-unregistered-sender.ts
 *
 * Optional CLI overrides:
 *   npx tsx scripts/test-unregistered-sender.ts [sender-keypair] [recipient-keypair]
 *
 * Defaults:
 *   sender:    ./keypair3.json
 *   recipient: ./keypair-2.json
 */

import { readFileSync, existsSync } from "node:fs";
import { homedir } from "node:os";
import { resolve, dirname, join, isAbsolute } from "node:path";
import { fileURLToPath } from "node:url";
import { inspect } from "node:util";
import { config } from "dotenv";
import {
  createSignerFromPrivateKeyBytes,
  getPublicBalanceToReceiverClaimableUtxoCreatorFunction,
  getUmbraClient,
  getUserAccountQuerierFunction,
  getUserRegistrationFunction,
} from "@umbra-privacy/sdk";
import { isRegistrationError } from "@umbra-privacy/sdk/errors";
import {
  getCreateReceiverClaimableUtxoFromPublicBalanceProver,
  getUserRegistrationProver,
} from "@umbra-privacy/web-zk-prover";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

config({ path: resolve(ROOT, ".env.local") });
config({ path: resolve(ROOT, ".env") });

const DEVNET_USDC_MINT = "4oG4sjmopf5MzvTHLE8rpVJ2uyczxfsw2K84SUTpNDx7";
const DEVNET_USDT_MINT = "DXQwBNGgyQ2BzGWxEriJPVmXYFQBsQbXvfvfSNTaJkL6";

// Amount to send: 1 USDT (6 decimals)
const SEND_AMOUNT = BigInt(1_000_000);
const SEND_MINT = DEVNET_USDT_MINT;

function maskRpcUrl(url: string): string {
  try {
    const u = new URL(url);
    if (u.searchParams.has("api-key")) u.searchParams.set("api-key", "***");
    return u.toString();
  } catch {
    return url.replace(/api-key=[^&]+/gi, "api-key=***");
  }
}

function resolveKeypairPath(raw: string | undefined, fallback: string): string {
  const input = raw ?? fallback;
  const expanded = input.startsWith("~/") ? join(homedir(), input.slice(2)) : input;
  return isAbsolute(expanded) ? expanded : resolve(ROOT, expanded);
}

function readKeypairBytes(path: string): Uint8Array {
  if (!existsSync(path)) throw new Error(`Missing keypair file: ${path}`);
  const json = JSON.parse(readFileSync(path, "utf8")) as unknown;
  if (!Array.isArray(json)) throw new Error(`Invalid keypair JSON at ${path}`);
  return new Uint8Array(json);
}

async function queryRegistrationStatus(
  client: Awaited<ReturnType<typeof getUmbraClient>>,
  label: string,
): Promise<void> {
  console.log(`\n── Registration status: ${label} ──`);
  try {
    const query = getUserAccountQuerierFunction({ client });
    const state = await query(client.signer.address as never);
    const s = state as {
      state?: string;
      data?: {
        isInitialised?: boolean;
        isUserAccountX25519KeyRegistered?: boolean;
        isUserCommitmentRegistered?: boolean;
        isActiveForAnonymousUsage?: boolean;
      };
    } | null | undefined;
    console.log("  state:", s?.state ?? "unknown");
    if (s?.data) {
      console.log("  isInitialised:", s.data.isInitialised);
      console.log("  isUserAccountX25519KeyRegistered:", s.data.isUserAccountX25519KeyRegistered);
      console.log("  isUserCommitmentRegistered:", s.data.isUserCommitmentRegistered);
      console.log("  isActiveForAnonymousUsage:", s.data.isActiveForAnonymousUsage);
    }
  } catch (e) {
    console.warn("  query failed:", e instanceof Error ? e.message : String(e));
  }
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

  const senderPath = resolveKeypairPath(process.argv[2], "keypair3.json");
  const recipientPath = resolveKeypairPath(process.argv[3], "keypair-2.json");

  console.log("── Config ──");
  console.log("  rpcUrl:", maskRpcUrl(rpcUrl));
  console.log("  rpcSubscriptionsUrl:", maskRpcUrl(rpcWs));
  console.log("  indexerApiEndpoint:", indexerApiEndpoint);
  console.log("  senderKeypair:", senderPath);
  console.log("  recipientKeypair:", recipientPath);
  console.log("  sendAmount:", SEND_AMOUNT.toString(), "(USDT, 6 decimals)");
  console.log("  mint:", SEND_MINT);

  const senderSigner = await createSignerFromPrivateKeyBytes(readKeypairBytes(senderPath));
  const recipientSigner = await createSignerFromPrivateKeyBytes(readKeypairBytes(recipientPath));

  console.log("\n── Addresses ──");
  console.log("  sender (keypair3, NOT registered):", senderSigner.address);
  console.log("  recipient (keypair-2, registered):", recipientSigner.address);

  // ── Create sender client with master seed signing (needed for registration) ──
  console.log("\n── Creating sender Umbra client (deferMasterSeedSignature: false) ──");
  const senderClient = await getUmbraClient({
    signer: senderSigner,
    network: "devnet",
    rpcUrl,
    rpcSubscriptionsUrl: rpcWs,
    deferMasterSeedSignature: false,
    indexerApiEndpoint,
  });
  console.log("  sender client OK");

  // ── Create lightweight recipient client for status check only ──
  const recipientClient = await getUmbraClient({
    signer: recipientSigner,
    network: "devnet",
    rpcUrl,
    rpcSubscriptionsUrl: rpcWs,
    deferMasterSeedSignature: true,
    indexerApiEndpoint,
  });

  // ── Query registration status of both wallets (informational) ──
  await queryRegistrationStatus(senderClient, "sender (keypair3)");
  await queryRegistrationStatus(recipientClient, "recipient (keypair-2)");

  // ── Register sender if not already registered ──
  console.log("\n── Registering sender (keypair3) ──");
  try {
    const zkProver = getUserRegistrationProver();
    const register = getUserRegistrationFunction({ client: senderClient }, { zkProver });
    const sigs = await register({ confidential: true, anonymous: true });
    if (sigs.length === 0) {
      console.log("  sender already fully registered — no transactions needed.");
    } else {
      console.log(`  registration complete: ${sigs.length} transaction(s)`);
      for (const sig of sigs) console.log("   ", sig);
    }
  } catch (e) {
    if (isRegistrationError(e)) {
      console.warn(`  registration stage=${e.stage}; may already be registered. Continuing.`);
    } else {
      throw e;
    }
  }

  // ── Confirm sender registration status after registration ──
  console.log("\n── Sender registration status (post-registration) ──");
  await queryRegistrationStatus(senderClient, "sender (keypair3) post-reg");

  // ── Attempt UTXO send: sender (now registered) → recipient (registered) ──
  console.log("\n── Attempting public balance → receiver-claimable UTXO ──");
  console.log("  sender:", senderSigner.address);
  console.log("  recipient:", recipientSigner.address);

  try {
    const zkProver = getCreateReceiverClaimableUtxoFromPublicBalanceProver();
    const createUtxo = getPublicBalanceToReceiverClaimableUtxoCreatorFunction(
      { client: senderClient },
      { zkProver } as never,
    );

    const result = await createUtxo({
      destinationAddress: recipientSigner.address as never,
      mint: SEND_MINT as never,
      amount: SEND_AMOUNT as never,
    });

    console.log("\n✅ UTXO send SUCCEEDED.");
    console.log("  result:", inspect(result, { depth: 6, colors: true }));
  } catch (e) {
    console.error("\n❌ UTXO send FAILED.");
    console.error("  error:", e instanceof Error ? e.message : inspect(e, { depth: 4, colors: true }));
    if (e instanceof Error && e.stack) {
      console.error("  stack:", e.stack.split("\n").slice(0, 6).join("\n"));
    }
  }

  console.log("\nDone.");
}

main().catch((e) => {
  console.error("\nUnhandled error:");
  console.error(inspect(e, { depth: 8, colors: true }));
  process.exit(1);
});
