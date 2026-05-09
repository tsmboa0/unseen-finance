"use client";

import type { GetUmbraClientDeps } from "@umbra-privacy/sdk";

type UmbraMasterSeedStorage = NonNullable<GetUmbraClientDeps["masterSeedStorage"]>;
type UmbraMasterSeed = Parameters<NonNullable<UmbraMasterSeedStorage["store"]>>[0];

const STORAGE_NAMESPACE = "unseen:umbra:master-seed:v1";

function buildStorageKey(walletAddress: string, network: string): string {
  return `${STORAGE_NAMESPACE}:${network}:${walletAddress.toLowerCase()}`;
}

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

function fromBase64(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export function createUmbraLocalMasterSeedStorage(args: {
  walletAddress: string;
  network: string;
}): UmbraMasterSeedStorage {
  const key = buildStorageKey(args.walletAddress, args.network);

  return {
    load: async () => {
      if (typeof window === "undefined") return { exists: false };
      try {
        const raw = window.localStorage.getItem(key);
        if (!raw) return { exists: false };
        const seed = fromBase64(raw);
        if (seed.length === 0) return { exists: false };
        return { exists: true, seed: seed as UmbraMasterSeed };
      } catch {
        // Corrupt or unreadable local value: clear and fall back to seed regeneration.
        try {
          window.localStorage.removeItem(key);
        } catch {
          // Best effort cleanup only.
        }
        return { exists: false };
      }
    },
    store: async (seed) => {
      if (typeof window === "undefined") {
        return { success: false, error: "localStorage unavailable during SSR." };
      }
      try {
        window.localStorage.setItem(key, toBase64(seed as Uint8Array));
        return { success: true };
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to write master seed to localStorage.";
        return { success: false, error: message };
      }
    },
  };
}
