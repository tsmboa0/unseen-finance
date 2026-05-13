"use client";

import { usePrivy } from "@privy-io/react-auth";
import { useCallback, useEffect, useRef, useState } from "react";
import type { BetaGateModalStep } from "@/hooks/use-beta-login-gate";

export type DashboardBetaGatePhase = "loading" | "blocked" | "allowed";

/**
 * Ensures only beta-allowlisted users see dashboard chrome / onboarding / routes.
 */
export function useDashboardBetaGate() {
  const { ready, authenticated, getAccessToken } = usePrivy();
  const [phase, setPhase] = useState<DashboardBetaGatePhase>("loading");
  const [blockedStep, setBlockedStep] = useState<BetaGateModalStep>("invite");
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
    if (!ready) return;

    if (!authenticated) {
      setPhase("loading");
      return;
    }

    const seq = ++seqRef.current;
    let cancelled = false;

    void (async () => {
      const token = await getAccessToken();
      if (!token || cancelled || seq !== seqRef.current) return;

      const res = await fetch("/api/beta/status", {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });

      if (!res.ok || cancelled || seq !== seqRef.current) return;

      const data = (await res.json()) as { allowed?: boolean; pendingRequest?: boolean };

      if (cancelled || seq !== seqRef.current) return;

      if (data.allowed) {
        setPhase("allowed");
        return;
      }

      setBlockedStep(data.pendingRequest ? "pending" : "invite");
      setPhase("blocked");
    })();

    return () => {
      cancelled = true;
    };
  }, [ready, authenticated, getAccessToken]);

  const setGateAllowed = useCallback(() => {
    setPhase("allowed");
  }, []);

  return {
    phase,
    blockedStep,
    refreshBetaStatus,
    setGateAllowed,
  };
}
