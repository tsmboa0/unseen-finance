import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { StorageClient } from "@supabase/storage-js";

let cached: SupabaseClient | null | undefined;
let cachedStorageOpaque: StorageClient | null | undefined;

/**
 * Legacy **service_role** JWT — works with `createClient` / Bearer on all Supabase APIs.
 */
export function pickSupabaseJwtServiceKey(): string | undefined {
  const a = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const b = process.env.SUPABASE_SECRET_KEY?.trim();
  if (a?.startsWith("eyJ")) return a;
  if (b?.startsWith("eyJ")) return b;
  return undefined;
}

/**
 * New platform **secret** key (`sb_secret_...`). Use standalone StorageClient with `apikey` only —
 * supabase-js always sends `Authorization: Bearer <key>`, which breaks Storage with "Invalid Compact JWS".
 */
export function pickSupabaseOpaqueSecretKey(): string | undefined {
  const a = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const b = process.env.SUPABASE_SECRET_KEY?.trim();
  if (a?.startsWith("sb_secret_")) return a;
  if (b?.startsWith("sb_secret_")) return b;
  return undefined;
}

export function pickAnySupabaseServiceKey(): string | undefined {
  return pickSupabaseJwtServiceKey() ?? pickSupabaseOpaqueSecretKey();
}

/** True when project URL is set and any server key env hints at wanting cloud storage. */
export function wantsSupabaseStorage(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  if (!url) return false;
  const a = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const b = process.env.SUPABASE_SECRET_KEY?.trim();
  return Boolean(a || b);
}

/**
 * Server-only Supabase client with the **service_role** JWT (full REST access).
 * Returns null if URL or JWT is missing — do not pass `sb_secret_` here.
 */
export function getSupabaseAdmin(): SupabaseClient | null {
  if (cached !== undefined) return cached;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const jwt = pickSupabaseJwtServiceKey();

  if (!url || !jwt) {
    cached = null;
    return null;
  }

  cached = createClient(url, jwt, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
  return cached;
}

/**
 * Storage-only client using `sb_secret_...` and **apikey** header (no Bearer), for hosted Storage uploads.
 */
export function getSupabaseStorageWithOpaqueSecret(): StorageClient | null {
  if (cachedStorageOpaque !== undefined) return cachedStorageOpaque;

  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const secret = pickSupabaseOpaqueSecretKey();

  if (!rawUrl || !secret) {
    cachedStorageOpaque = null;
    return null;
  }

  const base = rawUrl.replace(/\/+$/, "");
  cachedStorageOpaque = new StorageClient(`${base}/storage/v1`, {
    apikey: secret,
  });
  return cachedStorageOpaque;
}

export function getSupabaseStorageBucket(): string {
  return process.env.SUPABASE_STORAGE_BUCKET?.trim() || "store-uploads";
}
