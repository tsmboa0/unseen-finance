"use client";

import {
  createContext,
  type MutableRefObject,
  type ReactNode,
  useContext,
  useRef,
} from "react";
import { useRouter } from "next/navigation";
import { BetaGateModal } from "@/components/beta/beta-gate-modal";
import { useBetaLoginGate } from "@/hooks/use-beta-login-gate";

const PendingRedirectContext = createContext<MutableRefObject<boolean> | null>(null);

export function useBetaPendingRedirectRef(): MutableRefObject<boolean> {
  const ctx = useContext(PendingRedirectContext);
  if (!ctx) {
    throw new Error("useBetaPendingRedirectRef must be used within BetaLoginGateProvider");
  }
  return ctx;
}

/**
 * Single global beta gate after Privy login from marketing pages (single modal; shared pending ref).
 */
export function BetaLoginGateProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pendingRedirectRef = useRef(false);
  const { betaModalOpen, setBetaModalOpen, betaModalStep } = useBetaLoginGate(pendingRedirectRef);

  return (
    <PendingRedirectContext.Provider value={pendingRedirectRef}>
      {children}
      <BetaGateModal
        allowBackdropClose
        initialStep={betaModalStep}
        open={betaModalOpen}
        onAccessGranted={() => {
          router.replace("/dashboard");
          setBetaModalOpen(false);
        }}
        onOpenChange={setBetaModalOpen}
      />
    </PendingRedirectContext.Provider>
  );
}
