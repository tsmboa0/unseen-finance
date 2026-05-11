#!/usr/bin/env npx tsx
/**
 * Generates a P-256 keypair for Privy "app authorization key" / payroll session signer.
 *
 * - Private key: PKCS#8 DER, base64 (no PEM) → PRIVY_APP_AUTHORIZATION_PRIVATE_KEY
 * - Public key: SPKI PEM → paste into Privy Dashboard → Authorization keys → Register key quorum
 *
 * After registering, set NEXT_PUBLIC_PRIVY_PAYROLL_SIGNER_QUORUM_ID to the quorum id from the dashboard.
 *
 * Usage: npm run privy:gen-payroll-auth-key
 */

import { generateKeyPairSync } from "node:crypto";

const { privateKey, publicKey } = generateKeyPairSync("ec", {
  namedCurve: "prime256v1",
});

const pkcs8Der = privateKey.export({ type: "pkcs8", format: "der" }) as Buffer;
const privateBase64 = pkcs8Der.toString("base64");
const publicPem = publicKey.export({ type: "spki", format: "pem" }) as string;
const spkiDer = publicKey.export({ type: "spki", format: "der" }) as Buffer;
const publicBase64 = spkiDer.toString("base64");

console.log(`
━━━ Privy payroll / app authorization keypair ━━━
Store the PRIVATE value only in .env.local (server). Never commit it.

1) Add to .env.local:

PRIVY_APP_AUTHORIZATION_PRIVATE_KEY=${privateBase64}
PRIVY_PAYROLL_AUTHORIZATION_PUBLIC_KEY_BASE64=${publicBase64}

2) Register this PUBLIC key in the Privy Dashboard:
   Apps → your app → Authorization keys → New key → "Register key quorum instead"
   - Paste the public key block below into "Public keys"
   - Authorization threshold: 1
   - Save the returned key quorum id as:

NEXT_PUBLIC_PRIVY_PAYROLL_SIGNER_QUORUM_ID=<quorum-id-from-dashboard>

3) Restart the Next.js dev server after changing env.

--- PUBLIC KEY (SPKI PEM) — paste into Privy Dashboard ---
${publicPem.trim()}
--- end public key ---
`);
