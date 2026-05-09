"use client";

import { usePrivy } from "@privy-io/react-auth";
import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";

// ─── Types ────────────────────────────────────────────────────────────────────

export type MerchantProfile = {
  id: string;
  name: string;
  businessSize: string | null;
  industry: string | null;
  country: string | null;
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
  umbraRegistered: boolean;
  umbraRegisteredAt: string | null;
  onboardingCompletedAt: string | null;
  createdAt: string;
};

// ─── Hook ─────────────────────────────────────────────────────────────────────
// 1. Uses the Privy access token to call /api/dashboard/me
// 2. Gets the merchant's API key from the response
// 3. Provides an `apiFetch` helper that auto-injects the Bearer API key

export function useMerchantApi() {
  const { getAccessToken, authenticated } = usePrivy();
  const router = useRouter();
  const [merchant, setMerchant] = useState<MerchantProfile | null>(null);
  const [isNewUser, setIsNewUser] = useState(false);
  const [loading, setLoading] = useState(true);
  const apiKeyRef = useRef<string | null>(null);

  const fetchMerchantProfile = useCallback(async (): Promise<MerchantProfile | null> => {
    const privyToken = await getAccessToken();
    if (!privyToken) {
      router.replace("/");
      return null;
    }

    const res = await fetch("/api/dashboard/me", {
      headers: { Authorization: `Bearer ${privyToken}` },
    });

    if (!res.ok) {
      if (res.status === 401 || res.status === 403) {
        router.replace("/");
      }
      return null;
    }

    const data = (await res.json()) as MerchantProfile | { newUser: true };

    // Authenticated but no merchant yet — awaiting onboarding completion
    if ("newUser" in data && data.newUser === true) {
      setMerchant(null);
      setIsNewUser(true);
      return null;
    }

    setIsNewUser(false);
    setMerchant(data as MerchantProfile);
    apiKeyRef.current = (data as MerchantProfile).apiKey;
    return data as MerchantProfile;
  }, [getAccessToken, router]);

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
    async (
      payload: Partial<
        Pick<
          MerchantProfile,
          "name" | "businessSize" | "industry" | "country" | "handle" | "ownerName" | "email" | "timezone"
        >
      >,
    ) => {
      const privyToken = await getAccessToken();
      if (!privyToken) {
        router.replace("/");
        throw new Error("Session expired. Redirecting to landing page.");
      }

      const res = await fetch("/api/dashboard/me", {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${privyToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          router.replace("/");
          throw new Error("Session expired. Redirecting to landing page.");
        }
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? "Unable to update merchant");
      }

      const updated = (await res.json()) as MerchantProfile;
      setMerchant(updated);
      apiKeyRef.current = updated.apiKey;
      return updated;
    },
    [getAccessToken, router],
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
          } else if (res.status === 401 || res.status === 403) {
            router.replace("/");
          }
        } else {
          router.replace("/");
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
    [getAccessToken, router]
  );

  return { merchant, isNewUser, loading, apiFetch, refreshMerchant: fetchMerchantProfile, updateMerchant };
}
