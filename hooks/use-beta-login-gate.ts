"use client";

import { usePrivy } from "@privy-io/react-auth";
import { useRouter } from "next/navigation";
import {
  type MutableRefObject,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

export type BetaGateModalStep = "invite" | "pending";

/**
 * After Privy reports authenticated + caller sets pendingRedirectRef.current = true and invokes login,
 * runs /api/beta/status once and either navigates to the dashboard or opens the beta gate modal.
 */
export function useBetaLoginGate(pendingRedirectRef: MutableRefObject<boolean>) {
  const { ready, authenticated, getAccessToken } = usePrivy();
  const router = useRouter();
  const [betaModalOpen, setBetaModalOpen] = useState(false);
  const [betaModalStep, setBetaModalStep] = useState<BetaGateModalStep>("invite");
  const seqRef = useRef(0);

  const refreshBetaStatus = useCallback(async () => {
    const token = await getAccessToken();
    if (!token) return { allowed: false as const, pendingRequest: false };
    const res = await fetch("/api/beta/status", {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!res.ok) return { allowed: false as const, pendingRequest: false };
    return (await res.json()) as { allowed: boolean; pendingRequest: boolean };
  }, [getAccessToken]);

  useEffect(() => {
    if (!ready || !authenticated || !pendingRedirectRef.current) return;

    const seq = ++seqRef.current;
    let cancelled = false;

    void (async () => {
      const token = await getAccessToken();
      if (!token || cancelled) return;

      const res = await fetch("/api/beta/status", {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });

      if (!res.ok || cancelled || seq !== seqRef.current) return;

      const data = (await res.json()) as { allowed?: boolean; pendingRequest?: boolean };

      if (cancelled || seq !== seqRef.current) return;

      pendingRedirectRef.current = false;

      if (data.allowed) {
        router.replace("/dashboard");
        return;
      }

      setBetaModalStep(data.pendingRequest ? "pending" : "invite");
      setBetaModalOpen(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [ready, authenticated, getAccessToken, router, pendingRedirectRef]);

  return {
    betaModalOpen,
    setBetaModalOpen,
    betaModalStep,
    setBetaModalStep,
    refreshBetaStatus,
  };
}
