/**
 * Logs Solana public keys and Umbra encrypted balances (USDC + USDT devnet mints)
 * for three local keypairs: root, keypair-2, keypair3.
 *
 * Run from `unseen_app/`:
 *   npx tsx scripts/umbra-log-encrypted-balances.ts
 *
 * Optional paths (defaults shown):
 *   npx tsx scripts/umbra-log-encrypted-balances.ts [root-keypair] [keypair-2] [keypair3]
 *
 * Default root: ~/.config/solana/id.json, or SOLANA_KEYPAIR, same as other scripts.
 * Default others: ./keypair-2.json and ./keypair3.json under unseen_app/.
 *
 * Env: `.env.local` / `.env` — NEXT_PUBLIC_SOLANA_RPC_DEVNET, NEXT_PUBLIC_UMBRA_INDEXER_URL, etc.
 */

import { readFileSync, existsSync } from "node:fs";
import { homedir } from "node:os";
import { resolve, dirname, join, isAbsolute } from "node:path";
import { fileURLToPath } from "node:url";
import { inspect } from "node:util";
import { config } from "dotenv";
import {
  createSignerFromPrivateKeyBytes,
  getEncryptedBalanceQuerierFunction,
  getUmbraClient,
} from "@umbra-privacy/sdk";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

config({ path: resolve(ROOT, ".env.local") });
config({ path: resolve(ROOT, ".env") });

const DEVNET_USDC_MINT = "4oG4sjmopf5MzvTHLE8rpVJ2uyczxfsw2K84SUTpNDx7";
const DEVNET_USDT_MINT = "DXQwBNGgyQ2BzGWxEriJPVmXYFQBsQbXvfvfSNTaJkL6";
const MINTS: { label: string; address: string; decimals: number }[] = [
  { label: "USDC", address: DEVNET_USDC_MINT, decimals: 6 },
  { label: "USDT", address: DEVNET_USDT_MINT, decimals: 6 },
];

function maskRpcUrl(url: string): string {
  try {
    const u = new URL(url);
    if (u.searchParams.has("api-key")) u.searchParams.set("api-key", "***");
    return u.toString();
  } catch {
    return url.replace(/api-key=[^&]+/gi, "api-key=***");
  }
}

function resolveRootKeypairPath(cliArg: string | undefined): string {
  const raw = cliArg ?? process.env.SOLANA_KEYPAIR;
  if (!raw) return join(homedir(), ".config", "solana", "id.json");
  const expanded = raw.startsWith("~/") ? join(homedir(), raw.slice(2)) : raw;
  return isAbsolute(expanded) ? expanded : resolve(ROOT, expanded);
}

function resolveAppKeypairPath(cliArg: string | undefined, fallbackRelative: string): string {
  const input = cliArg ?? fallbackRelative;
  const expanded = input.startsWith("~/") ? join(homedir(), input.slice(2)) : input;
  return isAbsolute(expanded) ? expanded : resolve(ROOT, expanded);
}

function readKeypairBytes(path: string): Uint8Array {
  if (!existsSync(path)) throw new Error(`Missing keypair file: ${path}`);
  const json = JSON.parse(readFileSync(path, "utf8")) as unknown;
  if (!Array.isArray(json)) throw new Error(`Invalid keypair JSON (expected byte array): ${path}`);
  return new Uint8Array(json);
}

function fromRawUnits(value: bigint, decimals: number): string {
  const base = BigInt(10) ** BigInt(decimals);
  const whole = value / base;
  const frac = value % base;
  const fracStr = frac.toString().padStart(decimals, "0").replace(/0+$/, "") || "0";
  if (fracStr === "0") return whole.toString();
  return `${whole}.${fracStr.padEnd(decimals, "0").replace(/0+$/, "")}`;
}

type WalletSlot = { name: string; path: string };

async function logBalancesForWallet(slot: WalletSlot, secretBytes: Uint8Array): Promise<void> {
  const rpcUrl =
    process.env.NEXT_PUBLIC_SOLANA_RPC_DEVNET ??
    process.env.SOLANA_RPC_URL ??
    "https://api.devnet.solana.com";
  const rpcWs =
    process.env.NEXT_PUBLIC_SOLANA_RPC_DEVNET_WS ?? "wss://api.devnet.solana.com";
  const indexerApiEndpoint =
    process.env.NEXT_PUBLIC_UMBRA_INDEXER_URL ?? "https://utxo-indexer.api-devnet.umbraprivacy.com";

  const signer = await createSignerFromPrivateKeyBytes(secretBytes);
  const pubkey = String(signer.address);

  console.log(`\n━━ ${slot.name} ━━`);
  console.log(`  keypair file: ${slot.path}`);
  console.log(`  public key:   ${pubkey}`);

  const client = await getUmbraClient({
    signer,
    network: "devnet",
    rpcUrl,
    rpcSubscriptionsUrl: rpcWs,
    deferMasterSeedSignature: false,
    indexerApiEndpoint,
  });

  const queryEncrypted = getEncryptedBalanceQuerierFunction({ client });
  const mintAddresses = MINTS.map((m) => m.address) as unknown as readonly string[] & string[];
  const result = await queryEncrypted(mintAddresses as never);
  const mapResult = result as unknown as Map<string, unknown>;

  for (const m of MINTS) {
    const entry = mapResult.get(m.address) as
      | { state?: string; balance?: bigint; [key: string]: unknown }
      | undefined;
    console.log(`  encrypted ${m.label} (${m.address}):`);
    if (!entry) {
      console.log("    (no entry)");
      continue;
    }
    console.log(`    state: ${entry.state ?? "unknown"}`);
    if (entry.state === "shared" && typeof entry.balance === "bigint") {
      console.log(`    balance raw:     ${entry.balance.toString()}`);
      console.log(`    balance display: ${fromRawUnits(entry.balance, m.decimals)} ${m.label}`);
    } else {
      console.log(`    detail: ${inspect(entry, { depth: 6, colors: true })}`);
    }
  }
}

async function main(): Promise<void> {
  const rpcUrl =
    process.env.NEXT_PUBLIC_SOLANA_RPC_DEVNET ??
    process.env.SOLANA_RPC_URL ??
    "https://api.devnet.solana.com";
  const indexerApiEndpoint =
    process.env.NEXT_PUBLIC_UMBRA_INDEXER_URL ?? "https://utxo-indexer.api-devnet.umbraprivacy.com";

  console.log("── Umbra encrypted balance probe ──");
  console.log("  cwd:", ROOT);
  console.log("  network: devnet");
  console.log("  rpcUrl:", maskRpcUrl(rpcUrl));
  console.log("  indexerApiEndpoint:", indexerApiEndpoint);

  const slots: WalletSlot[] = [
    { name: "root keypair", path: resolveRootKeypairPath(process.argv[2]) },
    { name: "keypair-2", path: resolveAppKeypairPath(process.argv[3], "keypair-2.json") },
    { name: "keypair3", path: resolveAppKeypairPath(process.argv[4], "keypair3.json") },
  ];

  for (const slot of slots) {
    const bytes = readKeypairBytes(slot.path);
    await logBalancesForWallet(slot, bytes);
  }

  console.log("\n── done ──");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
