"use client";

import { usePrivy } from "@privy-io/react-auth";
import { useState, useEffect, useCallback, useRef } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

export type MerchantProfile = {
  id: string;
  name: string;
  handle: string | null;
  ownerName: string | null;
  email: string | null;
  timezone: string;
  walletAddress: string | null;
  apiKey: string;
  apiKeyPrefix: string;
  network: string;
  plan: string;
  kybStatus: string;
  webhookUrl: string | null;
  createdAt: string;
};

// ─── Hook ─────────────────────────────────────────────────────────────────────
// 1. Uses the Privy access token to call /api/dashboard/me
// 2. Gets the merchant's API key from the response
// 3. Provides an `apiFetch` helper that auto-injects the Bearer API key

export function useMerchantApi() {
  const { getAccessToken, authenticated } = usePrivy();
  const [merchant, setMerchant] = useState<MerchantProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const apiKeyRef = useRef<string | null>(null);

  const fetchMerchantProfile = useCallback(async (): Promise<MerchantProfile | null> => {
    const privyToken = await getAccessToken();
    if (!privyToken) return null;

    const res = await fetch("/api/dashboard/me", {
      headers: { Authorization: `Bearer ${privyToken}` },
    });

    if (!res.ok) return null;

    const data = (await res.json()) as MerchantProfile;
    setMerchant(data);
    apiKeyRef.current = data.apiKey;
    return data;
  }, [getAccessToken]);

  // Fetch merchant profile (runs once on mount / auth change)
  useEffect(() => {
    if (!authenticated) {
      queueMicrotask(() => {
        setMerchant(null);
        setLoading(false);
      });
      return;
    }

    let cancelled = false;

    async function load() {
      try {
        if (!cancelled) await fetchMerchantProfile();
      } catch {
        // silently fail — user will see empty states
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [authenticated, fetchMerchantProfile]);

  const updateMerchant = useCallback(
    async (payload: Partial<Pick<MerchantProfile, "name" | "handle" | "ownerName" | "email" | "timezone">>) => {
      const privyToken = await getAccessToken();
      if (!privyToken) throw new Error("Not authenticated");

      const res = await fetch("/api/dashboard/me", {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${privyToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? "Unable to update merchant");
      }

      const updated = (await res.json()) as MerchantProfile;
      setMerchant(updated);
      apiKeyRef.current = updated.apiKey;
      return updated;
    },
    [getAccessToken],
  );

  // Convenience fetcher that auto-injects the merchant's API key
  const apiFetch = useCallback(
    async (path: string, init?: RequestInit): Promise<Response> => {
      // If we don't have the key yet, fetch it
      if (!apiKeyRef.current) {
        const privyToken = await getAccessToken();
        if (privyToken) {
          const res = await fetch("/api/dashboard/me", {
            headers: { Authorization: `Bearer ${privyToken}` },
          });
          if (res.ok) {
            const data = (await res.json()) as MerchantProfile;
            apiKeyRef.current = data.apiKey;
            setMerchant(data);
          }
        }
      }

      const key = apiKeyRef.current;
      if (!key) throw new Error("Not authenticated");

      const headers = new Headers(init?.headers);
      headers.set("Authorization", `Bearer ${key}`);
      if (!headers.has("Content-Type") && init?.body && typeof init.body === "string") {
        headers.set("Content-Type", "application/json");
      }

      return fetch(path, { ...init, headers });
    },
    [getAccessToken]
  );

  return { merchant, loading, apiFetch, refreshMerchant: fetchMerchantProfile, updateMerchant };
}
