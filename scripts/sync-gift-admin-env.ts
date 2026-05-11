/**
 * Copy a Solana CLI keypair JSON file into GIFT_ADMIN_SOLANA_SECRET_KEY for gift-card testing.
 *
 * Run from `unseen_app/`:
 *   npx tsx scripts/sync-gift-admin-env.ts [path/to/keypair.json] [--env-file .env.local] [--dry-run]
 *
 * Defaults:
 *   keypair: ./keypair-2.json
 *   env:     .env.local (created or updated; does not overwrite unrelated keys)
 *
 * Never commit keypair files or .env files that contain private keys.
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, isAbsolute, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createSignerFromPrivateKeyBytes } from "@umbra-privacy/sdk";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

const ENV_KEY = "GIFT_ADMIN_SOLANA_SECRET_KEY";

function parseArgs(argv: string[]) {
  let keypairArg: string | undefined;
  let envFile = resolve(ROOT, ".env.local");
  let dryRun = false;
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--dry-run") {
      dryRun = true;
      continue;
    }
    if (a === "--env-file" && argv[i + 1]) {
      const p = argv[++i];
      envFile = isAbsolute(p) ? p : resolve(ROOT, p);
      continue;
    }
    if (!a.startsWith("-")) {
      keypairArg = a;
      continue;
    }
    throw new Error(`Unknown arg: ${a}`);
  }
  const input = keypairArg ?? "keypair-2.json";
  const expanded = input.startsWith("~/") ? join(homedir(), input.slice(2)) : input;
  const keypairPath = isAbsolute(expanded) ? expanded : resolve(ROOT, expanded);
  return { keypairPath, envFile, dryRun };
}

function readKeypairJsonLine(path: string): string {
  if (!existsSync(path)) {
    throw new Error(`Missing keypair file: ${path}`);
  }
  const json = JSON.parse(readFileSync(path, "utf8")) as unknown;
  if (!Array.isArray(json) || json.length < 32) {
    throw new Error(`Invalid keypair JSON at ${path} (expected byte array, length >= 32).`);
  }
  const bytes = json.map((n) => Number(n) & 0xff);
  return JSON.stringify(bytes);
}

function upsertEnvLine(contents: string, key: string, value: string): string {
  const escaped = value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  const line = `${key}="${escaped}"`;
  const re = new RegExp(`^${key}=.*$`, "m");
  if (re.test(contents)) {
    return contents.replace(re, line);
  }
  const block =
    `\n# Gift treasury — Solana keypair as JSON byte array (matches solana-keygen output)\n` +
    `# Synced from CLI; rotate if this machine is shared.\n` +
    `${line}\n`;
  const trimmed = contents.replace(/\s*$/, "");
  return trimmed.length === 0 ? block.replace(/^\n/, "") : `${trimmed}${block}`;
}

async function main() {
  const { keypairPath, envFile, dryRun } = parseArgs(process.argv);

  const inline = readKeypairJsonLine(keypairPath);
  const bytes = new Uint8Array(JSON.parse(inline) as number[]);
  const signer = await createSignerFromPrivateKeyBytes(bytes);

  console.log(`Keypair file:  ${keypairPath}`);
  console.log(`Env file:      ${envFile}`);
  console.log(`Treasury pubkey (verify): ${String(signer.address)}`);
  console.log(`\n${ENV_KEY} will be set (${inline.length} chars of JSON array).`);

  if (dryRun) {
    console.log("\n--dry-run: not writing.");
    return;
  }

  const prev = existsSync(envFile) ? readFileSync(envFile, "utf8") : "";
  const next = upsertEnvLine(prev, ENV_KEY, inline);
  writeFileSync(envFile, next, "utf8");
  console.log(`\nWrote ${ENV_KEY} to ${envFile}`);
  console.log("Restart dev server (`npm run dev`) so Next.js picks up the change.");
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
