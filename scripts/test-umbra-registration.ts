/**
 * Umbra registration smoke test — local Solana keypair (Node).
 *
 * Run from `unseen_app/`:
 *   npx tsx scripts/test-umbra-registration.ts ./path/to/keypair.json
 *
 * Env (optional): loads `.env.local` then `.env`
 *   NEXT_PUBLIC_SOLANA_RPC_DEVNET / NEXT_PUBLIC_SOLANA_RPC_DEVNET_WS
 *   SOLANA_RPC_URL (fallback HTTP if NEXT_PUBLIC_* unset)
 *
 * SOLANA_KEYPAIR — overrides default path below when set and no CLI arg
 *
 * Default keypair (no arg, no SOLANA_KEYPAIR): ~/.config/solana/id.json
 */

import { readFileSync, existsSync } from "node:fs";
import { homedir } from "node:os";
import { resolve, dirname, join, isAbsolute } from "node:path";
import { fileURLToPath } from "node:url";
import { inspect } from "node:util";
import { config } from "dotenv";
import { createSolanaRpc } from "@solana/kit";
import {
  getUmbraClient,
  getUserRegistrationFunction,
  getUserAccountQuerierFunction,
  createSignerFromPrivateKeyBytes,
} from "@umbra-privacy/sdk";
import { getUserRegistrationProver } from "@umbra-privacy/web-zk-prover";
import { isRegistrationError } from "@umbra-privacy/sdk/errors";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

config({ path: resolve(ROOT, ".env.local") });
config({ path: resolve(ROOT, ".env") });

function maskRpcUrl(url: string): string {
  try {
    const u = new URL(url);
    if (u.searchParams.has("api-key")) {
      u.searchParams.set("api-key", "***");
    }
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

async function probeJsonRpc(httpUrl: string): Promise<void> {
  console.log("\n── RPC probe (HTTP POST getLatestBlockhash) ──");
  const body = {
    jsonrpc: "2.0",
    id: 1,
    method: "getLatestBlockhash",
    params: [{ commitment: "confirmed" }],
  };
  try {
    const res = await fetch(httpUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const text = await res.text();
    console.log("  HTTP status:", res.status, res.statusText);
    console.log("  Body (first 800 chars):", text.slice(0, 800));
    if (!res.ok) {
      console.error("  RPC probe: non-OK HTTP — Umbra will fail on blockhash / account reads.");
    }
  } catch (e) {
    logErrorDeep("RPC probe fetch failed", e);
  }
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
  if (!raw) {
    return join(homedir(), ".config", "solana", "id.json");
  }
  const expanded = raw.startsWith("~/") ? join(homedir(), raw.slice(2)) : raw;
  return isAbsolute(expanded) ? expanded : resolve(ROOT, expanded);
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

  console.log("── Config ──");
  console.log("  cwd:", ROOT);
  console.log("  keypair:", keypairPath);
  console.log("  network: devnet");
  console.log("  rpcUrl:", maskRpcUrl(rpcUrl));
  console.log("  rpcSubscriptionsUrl:", maskRpcUrl(rpcWs));

  if (!existsSync(keypairPath)) {
    console.error("\nMissing keypair file. Expected default:");
    console.error(`  ${join(homedir(), ".config", "solana", "id.json")}`);
    console.error("Or generate one:");
    console.error(`  solana-keygen new -o ${keypairPath}`);
    console.error("Or pass path: npx tsx scripts/test-umbra-registration.ts /path/to/keypair.json\n");
    process.exit(1);
  }

  const json = JSON.parse(readFileSync(keypairPath, "utf8")) as unknown;
  if (!Array.isArray(json)) {
    console.error("Keypair JSON must be a byte array (Solana CLI format).");
    process.exit(1);
  }
  const secretBytes = new Uint8Array(json);

  await probeJsonRpc(rpcUrl);
  await probeKitRpc(rpcUrl);

  console.log("\n── Umbra signer ──");
  let signer: Awaited<ReturnType<typeof createSignerFromPrivateKeyBytes>>;
  try {
    signer = await createSignerFromPrivateKeyBytes(secretBytes);
    console.log("  address:", signer.address);
  } catch (e) {
    logErrorDeep("createSignerFromPrivateKeyBytes", e);
    process.exit(1);
  }

  console.log("\n── getUmbraClient ──");
  let client: Awaited<ReturnType<typeof getUmbraClient>>;
  try {
    client = await getUmbraClient({
      signer,
      network: "devnet",
      rpcUrl,
      rpcSubscriptionsUrl: rpcWs,
      deferMasterSeedSignature: false,
    });
    console.log("  client OK (master seed cached after construction).");
  } catch (e) {
    logErrorDeep("getUmbraClient", e);
    process.exit(1);
  }

  console.log("\n── Current Umbra account state (read-only) ──");
  try {
    const query = getUserAccountQuerierFunction({ client });
    const q = await query(signer.address);
    console.log(inspect(q, { depth: 6, colors: true }));
  } catch (e) {
    logErrorDeep("getUserAccountQuerierFunction", e);
  }

  console.log("\n── User registration (confidential + anonymous, ZK prover) ──");
  try {
    const zkProver = getUserRegistrationProver();
    const register = getUserRegistrationFunction({ client }, { zkProver });

    const signatures = await register({
      confidential: true,
      anonymous: true,
      callbacks: {
        userAccountInitialisation: {
          pre: async (tx) => { console.log("Creating account..."); },
          post: async (tx, sig) => { console.log("Account created:", sig); },
        },
        registerX25519PublicKey: {
          pre: async (tx) => { console.log("Registering encryption key..."); },
          post: async (tx, sig) => { console.log("Key registered:", sig); },
        },
        registerUserForAnonymousUsage: {
          pre: async (tx) => { console.log("Registering commitment..."); },
          post: async (tx, sig) => { console.log("Commitment registered:", sig); },
        },
      },
    });

    console.log("\n── Registration finished ──");
    console.log("  Transaction signatures returned:", signatures.length);
    console.log(inspect(signatures, { depth: 3, colors: true }));
  } catch (e) {
    console.error("\n── Registration FAILED ──");
    logErrorDeep("registration", e);
    if (isRegistrationError(e)) {
      console.error("\n  Hint: match `umbraRegistrationStage` to Umbra docs registration stages.");
      console.error("  Common fixes:");
      console.error("    - HTTP 403 / rate limits: use Helius (or similar) for rpcUrl.");
      console.error("    - WS failures: fix rpcSubscriptionsUrl (must be wss:// for same cluster).");
      console.error("    - Insufficient SOL: fund this keypair on devnet.");
    }
    process.exit(1);
  }

  console.log("\nDone.");
}

main().catch((e) => {
  console.error("Unhandled:");
  logErrorDeep("main", e);
  process.exit(1);
});
