import { address } from "@solana/kit";
import { findAssociatedTokenPda, TOKEN_PROGRAM_ADDRESS } from "@solana-program/token";
import { createSignerFromPrivateKeyBytes } from "@umbra-privacy/sdk";

export async function giftAdminTokenAta(ownerBase58: string, mintBase58: string): Promise<string> {
  const [pda] = await findAssociatedTokenPda({
    mint: address(mintBase58),
    owner: address(ownerBase58),
    tokenProgram: TOKEN_PROGRAM_ADDRESS,
  });
  return String(pda);
}

/**
 * Loads the gift treasury keypair from `GIFT_ADMIN_SOLANA_SECRET_KEY`:
 * either a JSON array of 64 bytes (Solana CLI keypair file contents) or a base58 secret.
 */
export function loadGiftAdminSecretKeyBytes(): Uint8Array {
  const raw = process.env.GIFT_ADMIN_SOLANA_SECRET_KEY?.trim();
  if (!raw) {
    throw new Error(
      "GIFT_ADMIN_SOLANA_SECRET_KEY is not set (JSON byte array of your Solana keypair, same format as solana-keygen output).",
    );
  }
  if (raw.startsWith("[")) {
    const arr = JSON.parse(raw) as unknown;
    if (!Array.isArray(arr) || arr.length < 32) {
      throw new Error("GIFT_ADMIN_SOLANA_SECRET_KEY JSON must be a byte array (>= 32 entries).");
    }
    return new Uint8Array(arr.map((n) => Number(n) & 0xff));
  }
  throw new Error("GIFT_ADMIN_SOLANA_SECRET_KEY must be a JSON array of bytes (Solana CLI format).");
}

export async function getGiftAdminSigner() {
  const bytes = loadGiftAdminSecretKeyBytes();
  return createSignerFromPrivateKeyBytes(bytes);
}
