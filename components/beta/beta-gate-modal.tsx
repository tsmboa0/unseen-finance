"use client";

import { AnimatePresence, LazyMotion, domAnimation, m } from "framer-motion";
import { CheckCircle2, ExternalLink, Sparkles, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { usePrivy } from "@privy-io/react-auth";
import type { BetaGateModalStep } from "@/hooks/use-beta-login-gate";
import { betaTelegramInviteUrl } from "@/lib/beta-public";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** When the modal opens, which panel to show first. */
  initialStep: BetaGateModalStep;
  /** Called after “Check status” when the user has been allowlisted. */
  onAccessGranted: () => void;
  /** Landing lets people dismiss the sheet; dashboard stays modal until access or sign-out. */
  allowBackdropClose?: boolean;
};

export function BetaGateModal({
  open,
  onOpenChange,
  initialStep,
  onAccessGranted,
  allowBackdropClose = true,
}: Props) {
  const { getAccessToken, logout } = usePrivy();
  const [mounted, setMounted] = useState(false);
  const [step, setStep] = useState<BetaGateModalStep>(initialStep);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusHint, setStatusHint] = useState<string | null>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (open) {
      setStep(initialStep);
      setError(null);
      setStatusHint(null);
    }
  }, [open, initialStep]);

  const fetchBetaAccessStatus = useCallback(async (): Promise<
    | { ok: true; allowed: boolean; pendingRequest: boolean }
    | { ok: false; message: string }
  > => {
    let token = await getAccessToken();
    if (!token) {
      await new Promise((r) => setTimeout(r, 350));
      token = await getAccessToken();
    }
    if (!token) {
      return { ok: false, message: "Could not read your session. Try signing out and signing in again." };
    }

    const res = await fetch("/api/beta/status", {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });

    if (res.status === 401) {
      return { ok: false, message: "Session expired. Sign out and sign in again." };
    }

    if (!res.ok) {
      return { ok: false, message: `Could not check status (HTTP ${res.status}). Try again in a moment.` };
    }

    const data = (await res.json()) as { allowed?: boolean; pendingRequest?: boolean };
    return {
      ok: true,
      allowed: Boolean(data.allowed),
      pendingRequest: Boolean(data.pendingRequest),
    };
  }, [getAccessToken]);

  const handleRequestAccess = async () => {
    setBusy(true);
    setError(null);
    setStatusHint(null);
    try {
      const token = await getAccessToken();
      if (!token) {
        setError("Session expired. Please sign in again.");
        return;
      }
      const res = await fetch("/api/beta/request-access", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        setError(body?.error ?? "Could not submit request.");
        return;
      }
      const data = (await res.json()) as { alreadyApproved?: boolean };
      if (data.alreadyApproved) {
        onAccessGranted();
        onOpenChange(false);
        return;
      }
      setStep("pending");
    } finally {
      setBusy(false);
    }
  };

  const handleCheckStatus = async () => {
    setBusy(true);
    setError(null);
    setStatusHint(null);
    try {
      const s = await fetchBetaAccessStatus();
      if (!s.ok) {
        setError(s.message);
        return;
      }
      if (s.allowed) {
        onAccessGranted();
        onOpenChange(false);
        return;
      }
      if (s.pendingRequest) {
        setStatusHint(
          "You're still on the waitlist — we haven't approved this email yet. We'll notify you when you're in.",
        );
        return;
      }
      setStep("invite");
    } finally {
      setBusy(false);
    }
  };

  const telegramUrl = betaTelegramInviteUrl();

  if (!mounted || !open) return null;

  const panel = (
    <LazyMotion features={domAnimation}>
      <div
        aria-labelledby="beta-gate-title"
        aria-modal="true"
        className="beta-gate-root"
        role="dialog"
      >
        <button
          aria-label="Close"
          className="beta-gate-backdrop"
          disabled={!allowBackdropClose}
          onClick={() => allowBackdropClose && onOpenChange(false)}
          type="button"
        />

        <div className="beta-gate-shell">
          <m.div
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="beta-gate-card"
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ type: "spring", stiffness: 380, damping: 28 }}
          >
            <div className="beta-gate-card__glow" aria-hidden />

            <div className="beta-gate-card__head">
              <span className="beta-gate-pill">
                <Sparkles aria-hidden size={14} />
                Private beta
              </span>
              {allowBackdropClose ? (
                <button
                  aria-label="Dismiss"
                  className="beta-gate-icon-btn"
                  onClick={() => onOpenChange(false)}
                  type="button"
                >
                  <X size={18} />
                </button>
              ) : (
                <button
                  aria-label="Sign out"
                  className="beta-gate-icon-btn"
                  onClick={() => void logout()}
                  type="button"
                >
                  <X size={18} />
                </button>
              )}
            </div>

            <AnimatePresence initial={false} mode="wait">
              {step === "invite" ? (
                <m.div
                  animate={{ opacity: 1, x: 0 }}
                  className="beta-gate-body"
                  exit={{ opacity: 0, x: -12 }}
                  initial={{ opacity: 0, x: 12 }}
                  key="invite"
                  transition={{ duration: 0.22 }}
                >
                  <h2 className="beta-gate-title" id="beta-gate-title">
                    You&apos;re early — Unseen is in closed beta
                  </h2>
                  <p className="beta-gate-copy">
                    We&apos;re onboarding merchants in small waves while we harden confidential
                    payments on Solana. Request access and we&apos;ll add your email to the beta as
                    soon as there&apos;s room.
                  </p>

                  {error ? <p className="beta-gate-error">{error}</p> : null}

                  <div className="beta-gate-actions">
                    <button
                      className="beta-gate-btn beta-gate-btn--primary"
                      disabled={busy}
                      onClick={() => void handleRequestAccess()}
                      type="button"
                    >
                      {busy ? "Working…" : "Request access"}
                    </button>
                    <button
                      className="beta-gate-sign-out"
                      disabled={busy}
                      onClick={() => void logout()}
                      type="button"
                    >
                      Sign out
                    </button>
                  </div>
                </m.div>
              ) : (
                <m.div
                  animate={{ opacity: 1, x: 0 }}
                  className="beta-gate-body"
                  exit={{ opacity: 0, x: 12 }}
                  initial={{ opacity: 0, x: -12 }}
                  key="pending"
                  transition={{ duration: 0.22 }}
                >
                  <div className="beta-gate-success-icon" aria-hidden>
                    <CheckCircle2 size={44} strokeWidth={1.75} />
                  </div>
                  <h2 className="beta-gate-title">Request received</h2>
                  <p className="beta-gate-copy">
                    Your email is on the review queue. Hang tight — once we approve you, refresh here
                    or tap below to check status. Join Telegram for announcements when new testers
                    are invited.
                  </p>

                  {error ? <p className="beta-gate-error">{error}</p> : null}
                  {statusHint ? <p className="beta-gate-hint">{statusHint}</p> : null}

                  <div className="beta-gate-actions">
                    <a className="beta-gate-btn beta-gate-btn--primary" href={telegramUrl} rel="noopener noreferrer" target="_blank">
                      Join Telegram for updates
                      <ExternalLink aria-hidden size={16} />
                    </a>
                    <button
                      className="beta-gate-btn beta-gate-btn--secondary"
                      disabled={busy}
                      onClick={() => void handleCheckStatus()}
                      type="button"
                    >
                      {busy ? "Checking…" : "Check approval status"}
                    </button>
                  </div>
                </m.div>
              )}
            </AnimatePresence>
          </m.div>
        </div>

        <style jsx global>{`
          .beta-gate-root {
            position: fixed;
            inset: 0;
            z-index: 400;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
          }
          .beta-gate-backdrop {
            position: absolute;
            inset: 0;
            border: none;
            cursor: ${allowBackdropClose ? "pointer" : "default"};
            background: var(--color-overlay);
            backdrop-filter: blur(12px);
          }
          .beta-gate-backdrop:disabled {
            cursor: default;
            opacity: 1;
          }
          .beta-gate-shell {
            position: relative;
            width: 100%;
            max-width: 440px;
            z-index: 1;
          }
          .beta-gate-card {
            position: relative;
            overflow: hidden;
            border-radius: var(--radius-card);
            border: 1px solid var(--color-violet-border);
            background: var(--color-bg-card);
            box-shadow: var(--shadow-card), var(--shadow-violet);
            padding: 28px 26px 30px;
          }
          @media (min-width: 640px) {
            .beta-gate-card {
              padding: 36px 34px 38px;
            }
          }
          .beta-gate-card__glow {
            pointer-events: none;
            position: absolute;
            inset: -40% -20% auto;
            height: 220px;
            background: radial-gradient(
              ellipse at 50% 0%,
              rgba(123, 47, 255, 0.35),
              transparent 65%
            );
            opacity: 0.65;
          }
          .beta-gate-card__head {
            position: relative;
            display: flex;
            align-items: flex-start;
            justify-content: space-between;
            gap: 12px;
            margin-bottom: 22px;
          }
          .beta-gate-pill {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            padding: 7px 14px;
            border-radius: var(--radius-pill);
            font-family: var(--font-body);
            font-size: 12px;
            font-weight: 600;
            letter-spacing: 0.06em;
            text-transform: uppercase;
            color: var(--color-violet-deep);
            background: var(--color-violet-shimmer);
            border: 1px solid var(--color-violet-border);
          }
          [data-theme="dark"] .beta-gate-pill {
            color: var(--color-text-primary);
          }
          .beta-gate-icon-btn {
            flex-shrink: 0;
            display: grid;
            place-items: center;
            width: 38px;
            height: 38px;
            border-radius: 12px;
            border: 1px solid var(--color-line-soft);
            background: var(--color-white-surface);
            color: var(--color-text-secondary);
            cursor: pointer;
            transition:
              border-color var(--duration-fast) var(--ease-out-expo),
              color var(--duration-fast) var(--ease-out-expo);
          }
          .beta-gate-icon-btn:hover {
            border-color: var(--color-violet-border-hover);
            color: var(--color-text-primary);
          }
          .beta-gate-body {
            position: relative;
          }
          .beta-gate-title {
            font-family: var(--font-display);
            font-size: 1.55rem;
            font-weight: 700;
            line-height: 1.2;
            letter-spacing: -0.03em;
            margin: 0 0 14px;
            background: var(--gradient-hero-text);
            -webkit-background-clip: text;
            background-clip: text;
            color: transparent;
          }
          .beta-gate-copy {
            margin: 0 0 22px;
            font-family: var(--font-body);
            font-size: 15px;
            line-height: 1.65;
            color: var(--color-text-secondary);
          }
          .beta-gate-error {
            margin: -8px 0 16px;
            font-size: 13px;
            color: var(--color-terminal-red);
          }
          .beta-gate-hint {
            margin: -8px 0 16px;
            font-size: 13px;
            line-height: 1.5;
            color: var(--color-text-secondary);
            padding: 12px 14px;
            border-radius: 12px;
            border: 1px solid var(--color-violet-border);
            background: var(--color-violet-shimmer);
          }
          .beta-gate-actions {
            display: flex;
            flex-direction: column;
            gap: 12px;
          }
          .beta-gate-btn {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 10px;
            min-height: 48px;
            padding: 0 20px;
            border-radius: var(--radius-button);
            font-family: var(--font-body);
            font-size: 15px;
            font-weight: 600;
            text-decoration: none;
            cursor: pointer;
            transition:
              transform var(--duration-fast) var(--ease-out-expo),
              box-shadow var(--duration-fast) var(--ease-out-expo),
              opacity var(--duration-fast) var(--ease-out-expo);
          }
          .beta-gate-btn:disabled {
            opacity: 0.65;
            cursor: not-allowed;
          }
          .beta-gate-btn--primary {
            border: none;
            color: #fff;
            background: var(--gradient-violet);
            box-shadow: 0 12px 32px rgba(123, 47, 255, 0.35);
          }
          .beta-gate-btn--primary:hover:not(:disabled) {
            transform: translateY(-1px);
            box-shadow: 0 16px 40px rgba(123, 47, 255, 0.42);
          }
          .beta-gate-btn--secondary {
            border: 1px solid var(--color-violet-border);
            background: transparent;
            color: var(--color-text-primary);
          }
          .beta-gate-btn--secondary:hover:not(:disabled) {
            border-color: var(--color-violet-border-hover);
          }
          .beta-gate-btn--ghost {
            border: 1px dashed var(--color-violet-border);
            background: transparent;
            color: var(--color-text-secondary);
          }
          .beta-gate-btn--ghost:hover {
            border-style: solid;
            border-color: var(--color-violet-border-hover);
            color: var(--color-text-primary);
          }
          .beta-gate-sign-out {
            margin-top: 4px;
            align-self: center;
            border: none;
            background: none;
            font-family: var(--font-body);
            font-size: 13px;
            font-weight: 500;
            color: var(--color-text-muted);
            cursor: pointer;
            text-decoration: underline;
            text-underline-offset: 3px;
          }
          .beta-gate-sign-out:hover {
            color: var(--color-text-secondary);
          }
          .beta-gate-success-icon {
            margin-bottom: 16px;
            color: var(--color-success);
          }
        `}</style>
      </div>
    </LazyMotion>
  );

  return createPortal(panel, document.body);
}
