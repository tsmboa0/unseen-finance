"use client";

import { useState, useEffect, useCallback, useRef } from "react";

// ─── Types ──────────────────────────────────────────────────────────────────

type PaymentData = {
  id: string;
  amount: string;          // BigInt serialized as string
  mint: string;
  mintSymbol: string;
  mintDecimals: number;
  description: string | null;
  merchantName: string;
  merchantWallet: string | null;
  expiresAt: string;
};

type Step = "connecting" | "ready" | "signing" | "submitting" | "success" | "error";

type WalletInfo = {
  name: string;
  icon: string;
  publicKey: string | null;
};

// ─── Component ──────────────────────────────────────────────────────────────

export default function CheckoutClient({ payment }: { payment: PaymentData }) {
  const [step, setStep] = useState<Step>("connecting");
  const [wallet, setWallet] = useState<WalletInfo | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [txSignature, setTxSignature] = useState("");
  const [countdown, setCountdown] = useState("");
  const walletRef = useRef<unknown>(null);

  // ─── Format amount for display ───────────────────────────────────────────
  const displayAmount = formatTokenAmount(payment.amount, payment.mintDecimals);

  // ─── Countdown timer ─────────────────────────────────────────────────────
  useEffect(() => {
    const expiresAt = new Date(payment.expiresAt).getTime();
    const tick = () => {
      const diff = expiresAt - Date.now();
      if (diff <= 0) {
        setCountdown("Expired");
        return;
      }
      const m = Math.floor(diff / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setCountdown(`${m}:${s.toString().padStart(2, "0")}`);
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [payment.expiresAt]);

  // ─── Auto-detect & connect wallet ────────────────────────────────────────
  useEffect(() => {
    async function autoConnect() {
      try {
        // Detect injected provider in wallet's in-app browser
        const provider = detectWalletProvider();
        if (!provider) {
          setErrorMsg("No wallet detected. Please open this page inside your Solana wallet's browser (Phantom, Solflare, or Backpack).");
          setStep("error");
          return;
        }

        walletRef.current = provider.instance;
        const connected = await connectWallet(provider);
        setWallet(connected);
        setStep("ready");
      } catch (err) {
        setErrorMsg(err instanceof Error ? err.message : "Failed to connect wallet");
        setStep("error");
      }
    }

    // Small delay to let wallet inject its provider
    const timer = setTimeout(autoConnect, 500);
    return () => clearTimeout(timer);
  }, []);

  // ─── Handle payment ──────────────────────────────────────────────────────
  const handlePay = useCallback(async () => {
    if (!walletRef.current || !wallet?.publicKey) return;

    setStep("signing");

    try {
      // TODO: In Phase 2+ this will be replaced with actual Umbra SDK createUtxo call.
      // For now, we show the flow and simulate the signing step.
      //
      // The real flow will be:
      // 1. const umbraClient = getUmbraClient({ walletSigner, ... })
      // 2. const tx = await umbraClient.createUtxo({ amount, mint, recipient: merchantWallet, ... })
      // 3. const sig = await wallet.signAndSendTransaction(tx)

      // ─── Placeholder: simulate the transaction ───────────────────────────
      // In production, this is where the Umbra SDK builds + signs the UTXO tx.
      // For dev/demo, we simulate a 2s delay to represent signing + confirmation.
      await new Promise((r) => setTimeout(r, 2000));

      // For testing, use a dummy sig (real integration will produce a real one)
      const fakeSig = "simulated_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 10);

      setStep("submitting");

      // ─── POST the tx signature to our API ────────────────────────────────
      const res = await fetch(`/api/v1/payments/${payment.id}/submit-tx`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          txSignature: fakeSig,
          amount: Number(payment.amount),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error((data as { error?: string }).error ?? "Failed to submit transaction");
      }

      setTxSignature(fakeSig);
      setStep("success");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Payment failed");
      setStep("error");
    }
  }, [wallet, payment]);

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="checkout-container">
      <style>{animationCSS}</style>

      {/* Logo */}
      <div className="checkout-logo">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="url(#cg)" strokeWidth="2.5">
          <defs><linearGradient id="cg" x1="0" y1="0" x2="24" y2="24"><stop offset="0%" stopColor="#7b2fff"/><stop offset="100%" stopColor="#a855f7"/></linearGradient></defs>
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
        </svg>
        <span className="checkout-logo-text">unseen<span style={{ fontWeight: 400, opacity: 0.5 }}> pay</span></span>
      </div>

      {/* Card */}
      <div className="checkout-card">
        {/* Merchant + Amount Header */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, marginBottom: 16 }}>
          <span className="checkout-merchant-label">Pay to</span>
          <span className="checkout-merchant-name">{payment.merchantName}</span>
        </div>

        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "center", margin: "8px 0 16px" }}>
          <span className="checkout-amount">{displayAmount}</span>
          <span className="checkout-currency">{payment.mintSymbol}</span>
        </div>

        {payment.description && (
          <p className="checkout-description">{payment.description}</p>
        )}

        <div className="checkout-divider" />

        {/* Step content */}
        {step === "connecting" && (
          <div className="checkout-step">
            <div className="checkout-spinner" />
            <p className="checkout-step-text">Detecting wallet...</p>
          </div>
        )}

        {step === "ready" && wallet && (
          <div className="checkout-step">
            <div className="checkout-wallet-row">
              <div className="checkout-wallet-dot" />
              <span className="checkout-wallet-text">
                {wallet.name} • {truncateAddress(wallet.publicKey ?? "")}
              </span>
            </div>
            <button className="checkout-pay-btn" onClick={handlePay}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
              Pay Privately
            </button>
            <p className="checkout-hint">
              Your wallet will prompt you to sign the transaction.
              This payment uses Umbra privacy — your identity stays hidden.
            </p>
          </div>
        )}

        {step === "signing" && (
          <div className="checkout-step">
            <div className="checkout-spinner" />
            <p className="checkout-step-text">Waiting for signature...</p>
            <p className="checkout-hint">Please confirm the transaction in your wallet.</p>
          </div>
        )}

        {step === "submitting" && (
          <div className="checkout-step">
            <div className="checkout-spinner" />
            <p className="checkout-step-text">Submitting to Solana...</p>
          </div>
        )}

        {step === "success" && (
          <div className="checkout-step">
            <div className="checkout-success-circle">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </div>
            <p className="checkout-step-text" style={{ color: "#16a34a" }}>Payment Sent!</p>
            <p className="checkout-hint">
              Return to the merchant&apos;s page and click &quot;I have paid&quot; to complete your order.
            </p>
            {txSignature && (
              <code className="checkout-sig">{truncateAddress(txSignature)}</code>
            )}
          </div>
        )}

        {step === "error" && (
          <div className="checkout-step">
            <div className="checkout-error-circle">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
              </svg>
            </div>
            <p className="checkout-step-text" style={{ color: "#dc2626" }}>Error</p>
            <p className="checkout-hint">{errorMsg}</p>
            <button
              className="checkout-retry-btn"
              onClick={() => { setStep("connecting"); setErrorMsg(""); }}
            >
              Try Again
            </button>
          </div>
        )}

        {/* Privacy badge */}
        <div className="checkout-privacy-badge">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
          </svg>
          Payment is private — shielded by Unseen Pay
        </div>

        {/* Footer */}
        <div className="checkout-footer">
          <span className="checkout-timer">⏱ {countdown}</span>
          <span className="checkout-powered">Powered by Unseen Finance</span>
        </div>
      </div>
    </div>
  );
}

// ─── Wallet Detection ────────────────────────────────────────────────────────

type WalletProvider = {
  name: string;
  instance: unknown;
};

function detectWalletProvider(): WalletProvider | null {
  const w = typeof window !== "undefined" ? (window as unknown as Record<string, unknown>) : null;
  if (!w) return null;

  // Phantom
  if (w.phantom && (w.phantom as Record<string, unknown>).solana) {
    return { name: "Phantom", instance: (w.phantom as Record<string, unknown>).solana };
  }

  // Solflare
  if (w.solflare && (w.solflare as Record<string, unknown>).isSolflare) {
    return { name: "Solflare", instance: w.solflare };
  }

  // Backpack
  if (w.backpack) {
    return { name: "Backpack", instance: w.backpack };
  }

  // Generic window.solana fallback
  if (w.solana) {
    const sol = w.solana as Record<string, unknown>;
    const name = sol.isPhantom ? "Phantom" : sol.isSolflare ? "Solflare" : "Solana Wallet";
    return { name, instance: w.solana };
  }

  return null;
}

async function connectWallet(provider: WalletProvider): Promise<WalletInfo> {
  const inst = provider.instance as Record<string, unknown>;

  // Most Solana wallets expose a connect() method
  if (typeof inst.connect === "function") {
    const resp = await (inst.connect as () => Promise<{ publicKey: { toString: () => string } }>)();
    return {
      name: provider.name,
      icon: "",
      publicKey: resp?.publicKey?.toString() ?? null,
    };
  }

  // If already connected (some wallets auto-connect in in-app browser)
  if (inst.publicKey) {
    return {
      name: provider.name,
      icon: "",
      publicKey: (inst.publicKey as { toString: () => string }).toString(),
    };
  }

  throw new Error(`Could not connect to ${provider.name}`);
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatTokenAmount(raw: string, decimals: number): string {
  const num = Number(raw) / Math.pow(10, decimals);
  return num.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: decimals,
  });
}

function truncateAddress(addr: string): string {
  if (addr.length <= 12) return addr;
  return addr.slice(0, 6) + "..." + addr.slice(-4);
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const animationCSS = `
  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes fadeIn { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes float1 { 0%,100% { transform: translate(0,0) scale(1); } 50% { transform: translate(30px,-20px) scale(1.05); } }
  @keyframes float2 { 0%,100% { transform: translate(0,0) scale(1); } 50% { transform: translate(-20px,25px) scale(1.08); } }
  @keyframes shimmer { 0% { background-position: -400px 0; } 100% { background-position: 400px 0; } }

  .checkout-container {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    font-family: 'Inter', sans-serif;
    padding: 24px;
    background: linear-gradient(145deg, #ede8ff 0%, #f7f5ff 40%, #e8e0ff 70%, #f0edff 100%);
    color: #1a1030;
    position: relative;
    overflow: hidden;
  }

  /* Decorative ambient orbs */
  .checkout-container::before {
    content: '';
    position: fixed;
    top: -120px;
    right: -120px;
    width: 480px;
    height: 480px;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(123,47,255,0.12) 0%, transparent 70%);
    animation: float1 10s ease-in-out infinite;
    pointer-events: none;
  }
  .checkout-container::after {
    content: '';
    position: fixed;
    bottom: -100px;
    left: -100px;
    width: 400px;
    height: 400px;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(168,85,247,0.10) 0%, transparent 70%);
    animation: float2 13s ease-in-out infinite;
    pointer-events: none;
  }

  .checkout-card {
    background: linear-gradient(145deg,
      rgba(255,255,255,0.95) 0%,
      rgba(243,240,255,0.92) 50%,
      rgba(235,228,255,0.88) 100%
    );
    border: 1px solid rgba(123,47,255,0.15);
    border-radius: 28px;
    padding: 36px;
    max-width: 440px;
    width: 100%;
    backdrop-filter: blur(24px);
    animation: fadeIn 0.5s cubic-bezier(0.16,1,0.3,1);
    box-shadow:
      0 0 0 1px rgba(123,47,255,0.08),
      0 8px 32px rgba(80,40,180,0.10),
      0 40px 80px rgba(80,40,180,0.08),
      inset 0 1px 0 rgba(255,255,255,0.9);
    position: relative;
    z-index: 1;
  }

  .checkout-logo {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 32px;
    position: relative;
    z-index: 1;
  }

  .checkout-logo-text {
    font-size: 20px;
    font-weight: 700;
    color: #1a1030;
    letter-spacing: -0.02em;
  }

  .checkout-merchant-label {
    font-size: 11px;
    color: #8070a8;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    font-weight: 600;
  }

  .checkout-merchant-name {
    font-size: 17px;
    font-weight: 700;
    color: #1a1030;
    margin-top: 2px;
  }

  .checkout-amount {
    font-size: 48px;
    font-weight: 800;
    letter-spacing: -0.04em;
    background: linear-gradient(135deg, #5b21b6 0%, #7b2fff 50%, #a855f7 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    line-height: 1;
  }

  .checkout-currency {
    font-size: 20px;
    font-weight: 600;
    color: #8070a8;
    margin-left: 6px;
    -webkit-text-fill-color: #8070a8;
  }

  .checkout-description {
    text-align: center;
    font-size: 14px;
    color: #4e3e72;
    margin: 0 0 8px;
    line-height: 1.6;
  }

  .checkout-divider {
    height: 1px;
    background: linear-gradient(90deg, transparent, rgba(123,47,255,0.15), transparent);
    margin: 22px 0;
  }

  .checkout-step {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 14px;
    min-height: 130px;
    justify-content: center;
  }

  .checkout-step-text {
    font-size: 16px;
    font-weight: 600;
    color: #1a1030;
    margin: 0;
  }

  .checkout-hint {
    font-size: 13px;
    color: #6b5a9e;
    text-align: center;
    line-height: 1.6;
    margin: 0;
    max-width: 300px;
  }

  .checkout-spinner {
    width: 36px;
    height: 36px;
    border: 3px solid rgba(123,47,255,0.12);
    border-top-color: #7b2fff;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  .checkout-wallet-row {
    display: flex;
    align-items: center;
    gap: 8px;
    background: rgba(123,47,255,0.06);
    border: 1px solid rgba(123,47,255,0.12);
    border-radius: 12px;
    padding: 10px 18px;
    width: 100%;
    justify-content: center;
  }

  .checkout-wallet-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #16a34a;
    box-shadow: 0 0 8px rgba(22,163,74,0.5);
    flex-shrink: 0;
  }

  .checkout-wallet-text {
    font-size: 14px;
    font-weight: 500;
    color: #1a1030;
  }

  .checkout-pay-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    width: 100%;
    padding: 16px 24px;
    border: none;
    border-radius: 16px;
    background: linear-gradient(135deg, #7b2fff 0%, #6020cc 100%);
    color: #fff;
    font-size: 16px;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.2s ease;
    margin-top: 4px;
    box-shadow: 0 4px 20px rgba(123,47,255,0.35), 0 1px 0 rgba(255,255,255,0.15) inset;
    letter-spacing: -0.01em;
  }
  .checkout-pay-btn:hover {
    filter: brightness(1.08);
    box-shadow: 0 6px 28px rgba(123,47,255,0.45), 0 1px 0 rgba(255,255,255,0.15) inset;
    transform: translateY(-1px);
  }
  .checkout-pay-btn:active {
    transform: translateY(0);
    filter: brightness(0.96);
  }

  .checkout-retry-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    width: 100%;
    padding: 13px 24px;
    border: 1px solid rgba(123,47,255,0.2);
    border-radius: 14px;
    background: rgba(123,47,255,0.06);
    color: #7b2fff;
    font-size: 15px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.15s ease;
    margin-top: 8px;
    font-family: inherit;
  }
  .checkout-retry-btn:hover {
    background: rgba(123,47,255,0.10);
    border-color: rgba(123,47,255,0.3);
  }

  .checkout-success-circle {
    width: 64px;
    height: 64px;
    border-radius: 50%;
    background: linear-gradient(135deg, rgba(22,163,74,0.1), rgba(22,163,74,0.05));
    border: 1.5px solid rgba(22,163,74,0.25);
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 0 24px rgba(22,163,74,0.12);
  }

  .checkout-error-circle {
    width: 64px;
    height: 64px;
    border-radius: 50%;
    background: linear-gradient(135deg, rgba(220,38,38,0.08), rgba(220,38,38,0.04));
    border: 1.5px solid rgba(220,38,38,0.2);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .checkout-sig {
    font-size: 12px;
    color: #8070a8;
    background: rgba(123,47,255,0.05);
    border: 1px solid rgba(123,47,255,0.1);
    border-radius: 8px;
    padding: 8px 16px;
    font-family: 'JetBrains Mono', monospace;
    margin-top: 4px;
  }

  .checkout-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 24px;
    padding-top: 16px;
    border-top: 1px solid rgba(123,47,255,0.1);
  }

  .checkout-timer {
    font-size: 13px;
    font-weight: 500;
    color: #8070a8;
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .checkout-powered {
    font-size: 11px;
    color: #a090c0;
    font-weight: 500;
  }

  .checkout-privacy-badge {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 7px 12px;
    border-radius: 20px;
    background: rgba(123,47,255,0.06);
    border: 1px solid rgba(123,47,255,0.12);
    font-size: 12px;
    font-weight: 500;
    color: #7b2fff;
    margin-top: 16px;
    justify-content: center;
  }
`;

// All inline styles are now minimal — layout only, colours handled by CSS classes above
const containerStyle: React.CSSProperties = { all: "unset" as "unset" };
const logoStyle: React.CSSProperties = { display: "contents" };
const logoTextStyle: React.CSSProperties = {};
const cardStyle: React.CSSProperties = { display: "contents" };
const headerStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: "4px",
  marginBottom: "16px",
};
const merchantLabelStyle: React.CSSProperties = {};
const merchantNameStyle: React.CSSProperties = {};
const amountBlockStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "baseline",
  justifyContent: "center",
  margin: "8px 0 16px",
};
const amountStyle: React.CSSProperties = {};
const currencyStyle: React.CSSProperties = {};
const descriptionStyle: React.CSSProperties = {};
const dividerStyle: React.CSSProperties = {};
const stepContainerStyle: React.CSSProperties = {};
const stepTextStyle: React.CSSProperties = {};
const hintStyle: React.CSSProperties = {};
const spinnerStyle: React.CSSProperties = {};
const walletRowStyle: React.CSSProperties = {};
const walletDotStyle: React.CSSProperties = {};
const walletTextStyle: React.CSSProperties = {};
const payButtonStyle: React.CSSProperties = {};
const successCircleStyle: React.CSSProperties = {};
const errorCircleStyle: React.CSSProperties = {};
const sigStyle: React.CSSProperties = {};
const footerStyle: React.CSSProperties = {};
const timerStyle: React.CSSProperties = {};
const poweredByStyle: React.CSSProperties = {};
