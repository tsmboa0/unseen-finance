"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ConnectionProvider, WalletProvider, useWallet } from "@solana/wallet-adapter-react";
import { WalletModalProvider, WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { PhantomWalletAdapter, SolflareWalletAdapter } from "@solana/wallet-adapter-wallets";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import { CheckCircle2, Gift, Loader2, Sparkles } from "lucide-react";

import "@solana/wallet-adapter-react-ui/styles.css";
import "./redeem.css";

import { formatCurrency } from "@/components/dashboard/formatters";
import { getDefaultSolanaEndpoints } from "@/lib/solana-endpoints";
import { UnseenLogo } from "@/components/unseen/logo";

const CLAIM_COUNTDOWN_SECONDS = 60;

type LookupOk = {
  valid: true;
  amountDisplay: number;
  memo: string;
  currency: string;
  expiresAt: string;
  network: string;
};

function RedeemInner({ giftChain, onGiftChainResolved }: { giftChain: string; onGiftChainResolved: (n: string) => void }) {
  const { publicKey, connected, disconnect } = useWallet();
  const recipientAddress = publicKey?.toBase58() ?? null;

  const [code, setCode] = useState("");
  const [lookup, setLookup] = useState<LookupOk | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [lookupBusy, setLookupBusy] = useState(false);

  const [claimBusy, setClaimBusy] = useState(false);
  const [claimSecondsLeft, setClaimSecondsLeft] = useState(CLAIM_COUNTDOWN_SECONDS);
  const [claimError, setClaimError] = useState<string | null>(null);
  const [claimOk, setClaimOk] = useState<{
    claimTxSig: string;
    network: string;
    amountDisplay: number;
    currency: string;
  } | null>(null);

  /** Wallet adapter reads injected wallets only in the browser; SSR vs client markup differs without this gate. */
  const [walletUiMounted, setWalletUiMounted] = useState(false);
  useEffect(() => {
    setWalletUiMounted(true);
  }, []);

  const confettiFired = useRef<string | null>(null);

  const displayNet = lookup?.network ?? giftChain;
  const networkLabel = displayNet === "mainnet" ? "Mainnet" : "Devnet";

  useEffect(() => {
    if (!lookup) {
      confettiFired.current = null;
      return;
    }
    const key = `${lookup.expiresAt}-${lookup.amountDisplay}-${lookup.memo}`;
    if (confettiFired.current === key) return;
    confettiFired.current = key;

    const palette = ["#7b2fff", "#a855f7", "#f0ecff", "#7df7c5", "#c4b5fd"];
    const fire = (scalar: number) => {
      void confetti({
        particleCount: Math.floor(90 * scalar),
        spread: 76,
        origin: { y: 0.72 },
        colors: palette,
        ticks: 220,
        gravity: 0.9,
        scalar: 1.05,
      });
    };
    fire(1);
    const t = window.setTimeout(() => fire(0.65), 320);
    const t2 = window.setTimeout(() => {
      void confetti({
        particleCount: 45,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.65 },
        colors: palette,
      });
      void confetti({
        particleCount: 45,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.65 },
        colors: palette,
      });
    }, 500);
    return () => {
      window.clearTimeout(t);
      window.clearTimeout(t2);
    };
  }, [lookup]);

  useEffect(() => {
    if (!claimBusy) {
      setClaimSecondsLeft(CLAIM_COUNTDOWN_SECONDS);
      return;
    }
    setClaimSecondsLeft(CLAIM_COUNTDOWN_SECONDS);
    const id = window.setInterval(() => {
      setClaimSecondsLeft((s) => (s <= 1 ? 0 : s - 1));
    }, 1000);
    return () => window.clearInterval(id);
  }, [claimBusy]);

  const checkCode = useCallback(async () => {
    setLookupError(null);
    setLookup(null);
    setClaimOk(null);
    setLookupBusy(true);
    try {
      const res = await fetch("/api/public/gift-cards/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const body = (await res.json()) as {
        valid?: boolean;
        error?: string;
        amountDisplay?: number;
        memo?: string;
        currency?: string;
        expiresAt?: string;
        network?: string;
      };
      if (!body.valid) {
        setLookupError(body.error ?? "Invalid code");
        return;
      }
      const net = typeof body.network === "string" && body.network.trim() ? body.network.trim() : "devnet";
      onGiftChainResolved(net);
      setLookup({
        valid: true,
        amountDisplay: body.amountDisplay ?? 0,
        memo: body.memo ?? "",
        currency: body.currency ?? "USDC",
        expiresAt: body.expiresAt ?? "",
        network: net,
      });
    } catch {
      setLookupError("Lookup failed");
    } finally {
      setLookupBusy(false);
    }
  }, [code, onGiftChainResolved]);

  const claim = useCallback(async () => {
    setClaimError(null);
    if (!lookup || !recipientAddress) return;
    setClaimBusy(true);
    try {
      const res = await fetch("/api/public/gift-cards/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, recipientAddress }),
      });
      const body = (await res.json()) as { ok?: boolean; error?: string; claimTxSig?: string };
      if (!res.ok) {
        setClaimError(body.error ?? `Failed (${res.status})`);
        return;
      }
      if (body.claimTxSig) {
        setClaimOk({
          claimTxSig: body.claimTxSig,
          network: lookup.network,
          amountDisplay: lookup.amountDisplay,
          currency: lookup.currency,
        });
      }
      void confetti({
        particleCount: 100,
        spread: 100,
        origin: { y: 0.55 },
        colors: ["#7df7c5", "#7b2fff", "#a855f7"],
      });
    } catch {
      setClaimError("Claim failed");
    } finally {
      setClaimBusy(false);
    }
  }, [code, lookup, recipientAddress]);

  const successNet = claimOk?.network ?? giftChain;
  const successNetworkLabel = successNet === "mainnet" ? "Mainnet" : "Devnet";
  const successExplorerTxUrl = (sig: string) =>
    successNet === "mainnet" ? `https://solscan.io/tx/${sig}` : `https://solscan.io/tx/${sig}?cluster=devnet`;

  const redeemAnother = useCallback(() => {
    confettiFired.current = null;
    setClaimOk(null);
    setLookup(null);
    setCode("");
    setClaimError(null);
    setLookupError(null);
    void disconnect();
  }, [disconnect]);

  if (claimOk) {
    return (
      <div className="redeem-root redeem-root--success">
        <div className="redeem-aurora" aria-hidden />
        <header className="redeem-header">
          <UnseenLogo compact href="/" />
        </header>
        <div className="redeem-inner redeem-inner--success">
          <motion.div
            className="redeem-success-icon-wrap"
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 280, damping: 20 }}
          >
            <CheckCircle2 className="redeem-success-check" size={88} strokeWidth={2} aria-hidden />
          </motion.div>
          <motion.h1
            className="redeem-success-title"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08, duration: 0.35 }}
          >
            You&apos;re all set
          </motion.h1>
          <motion.p
            className="redeem-success-body"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.14, duration: 0.35 }}
          >
            <strong>
              {formatCurrency(claimOk.amountDisplay, claimOk.currency === "USDT" ? "USDT" : "USDC")}
            </strong>{" "}
            is on its way to your wallet&apos;s public ATA on Solana · {successNetworkLabel}.
          </motion.p>
          <motion.div
            className="redeem-success-actions"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.22, duration: 0.35 }}
          >
            <a
              className="redeem-btn redeem-btn--secondary"
              href={successExplorerTxUrl(claimOk.claimTxSig)}
              target="_blank"
              rel="noopener noreferrer"
              style={{ textAlign: "center", textDecoration: "none", display: "block" }}
            >
              View transaction
            </a>
            <button type="button" className="redeem-btn redeem-btn--primary" onClick={redeemAnother}>
              Redeem another gift
            </button>
          </motion.div>
        </div>
        <p className="redeem-footer">
          <Link href="/dashboard/tiplinks">Merchant dashboard</Link>
          {" · "}
          <Link href="/">Unseen</Link>
        </p>
      </div>
    );
  }

  return (
    <div className="redeem-root">
      <div className="redeem-aurora" aria-hidden />
      <header className="redeem-header">
        <UnseenLogo compact href="/" />
      </header>
      <div className="redeem-inner">
        <motion.div
          className="redeem-hero-icon"
          initial={{ scale: 0.85, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 22 }}
        >
          <Gift size={34} strokeWidth={2} />
        </motion.div>

        <h1 className="redeem-title">Redeem your gift</h1>
        <p className="redeem-sub">
          Enter your code, connect any Solana wallet (Phantom, Solflare, and more), and claim USDC to your public
          balance.
        </p>

        <div className="redeem-card">
          {!lookup ? (
            <>
              <label className="redeem-label" htmlFor="redeem-code-input">
                Claim code
              </label>
              <input
                id="redeem-code-input"
                className="redeem-input"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Paste or type your code"
                disabled={false}
                autoComplete="off"
                spellCheck={false}
              />
              {lookupError ? <p className="redeem-err">{lookupError}</p> : null}

              <button
                type="button"
                className="redeem-btn redeem-btn--primary"
                onClick={() => void checkCode()}
                disabled={lookupBusy || !code.trim()}
              >
                {lookupBusy ? "Checking…" : "Reveal gift"}
              </button>
            </>
          ) : null}

          <AnimatePresence mode="wait">
            {lookup ? (
              <motion.div
                key={lookup.expiresAt + lookup.memo}
                className="redeem-gift-panel"
                initial={{ opacity: 0, y: 24, scale: 0.94, rotateX: 8 }}
                animate={{ opacity: 1, y: 0, scale: 1, rotateX: 0 }}
                exit={{ opacity: 0, y: -12, scale: 0.96 }}
                transition={{ type: "spring", stiffness: 280, damping: 26 }}
                style={{ transformPerspective: 1000 }}
              >
                <p className="redeem-gift-eyebrow">
                  <Sparkles size={14} style={{ display: "inline", verticalAlign: "middle", marginRight: 6 }} />
                  You&apos;re receiving
                </p>
                <motion.p
                  className="redeem-amount"
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.08, type: "spring", stiffness: 300, damping: 20 }}
                >
                  {formatCurrency(lookup.amountDisplay, lookup.currency === "USDT" ? "USDT" : "USDC")}
                </motion.p>

                <motion.div
                  className="redeem-memo-wrap"
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.14, type: "spring", stiffness: 260, damping: 24 }}
                >
                  <span className="redeem-memo-quote" aria-hidden>
                    “
                  </span>
                  <p className="redeem-memo-text">{lookup.memo || "—"}</p>
                </motion.div>

                <p className="redeem-expiry">
                  Redeem by{" "}
                  {new Date(lookup.expiresAt).toLocaleDateString("en-US", { dateStyle: "medium", timeZone: "UTC" })}
                </p>
              </motion.div>
            ) : null}
          </AnimatePresence>

          <div className="redeem-wallet-row">
            <div className="redeem-network-pill">
              <span aria-hidden>◎</span>
              Solana · {networkLabel}
            </div>

            {connected && recipientAddress ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <p style={{ fontSize: 13, margin: 0, color: "var(--color-text-secondary)", wordBreak: "break-all" }}>
                  Connected: <span style={{ fontFamily: "var(--font-mono)", color: "var(--color-text-primary)" }}>{recipientAddress}</span>
                </p>
                {lookup ? (
                  <div className="redeem-claim-row">
                    <button
                      type="button"
                      className="redeem-btn redeem-btn--primary redeem-btn--claim"
                      onClick={() => void claim()}
                      disabled={claimBusy}
                      aria-busy={claimBusy}
                    >
                      {claimBusy ? (
                        <>
                          <Loader2 className="redeem-btn-spinner" size={20} strokeWidth={2} aria-hidden />
                          <span>Claiming…</span>
                        </>
                      ) : (
                        "Claim to my wallet"
                      )}
                    </button>
                    {claimBusy ? (
                      <span className="redeem-claim-countdown" aria-live="polite">
                        {claimSecondsLeft}s
                      </span>
                    ) : null}
                  </div>
                ) : null}
                <button type="button" className="redeem-btn redeem-btn--secondary" onClick={() => void disconnect()}>
                  Disconnect
                </button>
              </div>
            ) : walletUiMounted ? (
              <WalletMultiButton className="redeem-wallet-multi" />
            ) : (
              <button type="button" className="redeem-btn redeem-btn--primary" disabled aria-busy>
                Connect wallet…
              </button>
            )}
          </div>

          {claimError ? <p className="redeem-err" style={{ marginTop: 14 }}>{claimError}</p> : null}
        </div>

        <p className="redeem-footer">
          <Link href="/dashboard/tiplinks">Merchant dashboard</Link>
          {" · "}
          <Link href="/">Unseen</Link>
        </p>
      </div>
    </div>
  );
}

export default function RedeemGiftPage() {
  const [giftChain, setGiftChain] = useState<string>("devnet");
  const endpoint = useMemo(() => getDefaultSolanaEndpoints(giftChain).rpcUrl, [giftChain]);
  const wallets = useMemo(() => [new PhantomWalletAdapter(), new SolflareWalletAdapter()], []);

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect={false}>
        <WalletModalProvider>
          <RedeemInner giftChain={giftChain} onGiftChainResolved={setGiftChain} />
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
