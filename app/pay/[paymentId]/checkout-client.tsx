"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  type CreateUtxoFromPublicBalanceResult,
  createSignerFromWalletAccount,
  getPublicBalanceToReceiverClaimableUtxoCreatorFunction,
  getUmbraClient,
  getUserAccountQuerierFunction,
  getUserRegistrationFunction,
} from "@umbra-privacy/sdk";
import { isRegistrationError } from "@umbra-privacy/sdk/errors";
import {
  getCreateReceiverClaimableUtxoFromPublicBalanceProver,
  getUserRegistrationProver,
} from "@umbra-privacy/web-zk-prover";
import { getWallets } from "@wallet-standard/app";
import { StandardConnect } from "@wallet-standard/features";
import {
  SolanaSignMessage,
  SolanaSignTransaction,
  type WalletWithSolanaFeatures,
} from "@solana/wallet-standard-features";
import type { WalletAccount } from "@wallet-standard/base";
import { createUmbraLocalMasterSeedStorage } from "@/lib/umbra/master-seed-storage";
import { getDefaultSolanaEndpoints, getDefaultUmbraIndexerUrl } from "@/lib/solana-endpoints";
import { UNSEEN_LOGO_DARK_SRC } from "@/components/unseen/logo";

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
  merchantNetwork: string;
  expectedOptionalDataHash: string | null;
  paymentToken: string;
  expiresAt: string;
};

type Step = "connecting" | "ready" | "signing" | "submitting" | "confirming" | "success" | "error";

type ConnectedWalletState = {
  wallet: WalletWithSolanaFeatures;
  account: WalletAccount;
};

type MutableFeatureMap = Record<string, unknown>;

// ─── Component ──────────────────────────────────────────────────────────────

export default function CheckoutClient({
  payment,
  checkoutKind,
}: {
  payment: PaymentData;
  checkoutKind: "hosted" | "invoice";
}) {
  return <CheckoutContent payment={payment} checkoutKind={checkoutKind} />;
}

function CheckoutContent({
  payment,
  checkoutKind,
}: {
  payment: PaymentData;
  checkoutKind: "hosted" | "invoice";
}) {
  const [step, setStep] = useState<Step>("connecting");
  const [errorMsg, setErrorMsg] = useState("");
  const [txSignatures, setTxSignatures] = useState<string[]>([]);
  const [countdown, setCountdown] = useState("");
  const [connectAttempt, setConnectAttempt] = useState(0);
  // Umbra registration states
  const [umbraRegistered, setUmbraRegistered] = useState<boolean | null>(null); // null = checking
  const [registrationModalOpen, setRegistrationModalOpen] = useState(false);
  const [registrationInProgress, setRegistrationInProgress] = useState(false);
  const [registrationStep, setRegistrationStep] = useState<0 | 1 | 2 | 3>(0); // 0=idle, 1,2,3=steps
  const [registrationError, setRegistrationError] = useState("");
  // Master seed consent states (only when already registered but no local seed)
  const [needsConsent, setNeedsConsent] = useState(false);
  const [consentLoading, setConsentLoading] = useState(false);
  const [consentError, setConsentError] = useState("");
  const walletStateRef = useRef<ConnectedWalletState | null>(null);
  const [walletName, setWalletName] = useState<string | null>(null);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);

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

  // ─── Auto-detect & connect wallet (Wallet Standard) ──────────────────────
  useEffect(() => {
    let cancelled = false;

    const connectWalletStandard = async () => {
      try {
        const discovered = getWallets().get() as WalletWithSolanaFeatures[];
        const supported = discovered.filter((wallet) => {
          const features = wallet.features as Record<string, unknown>;
          return Boolean(features[SolanaSignTransaction] && features[SolanaSignMessage]);
        });

        if (supported.length === 0) {
          throw new Error(
            "No Wallet Standard wallet detected. Please open this page inside Phantom, Solflare, or Backpack in-app browser."
          );
        }

        const preferredOrder = ["Phantom", "Solflare", "Backpack"];
        const wallet =
          preferredOrder
            .map((name) => supported.find((w) => w.name === name))
            .find(Boolean) ?? supported[0];

        const featureMap = wallet.features as unknown as MutableFeatureMap;
        const connectFeature = featureMap[StandardConnect] as
          | { connect: () => Promise<{ accounts: WalletAccount[] }> }
          | undefined;
        if (!connectFeature || typeof connectFeature.connect !== "function") {
          throw new Error("Wallet does not support standard:connect.");
        }
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => {
            reject(
              new Error(
                "Wallet connection timed out. Please reopen this link inside your wallet's in-app browser."
              )
            );
          }, 12_000);
        });

        const result = await Promise.race([connectFeature.connect(), timeoutPromise]);
        const account = result.accounts[0];
        if (!account) {
          throw new Error("Wallet connected but no account was returned.");
        }

        if (cancelled) return;
        walletStateRef.current = { wallet, account };
        setWalletName(wallet.name);
        setWalletAddress(account.address);

        // ── Step A: Check Umbra on-chain registration (silent, no wallet prompt) ──
        const endpoints = getDefaultSolanaEndpoints(payment.merchantNetwork);
        const signer = createSignerFromWalletAccount(wallet, account);
        let registered = false;
        try {
          const checkClient = await getUmbraClient({
            signer,
            network: endpoints.umbraNetwork,
            rpcUrl: endpoints.rpcUrl,
            rpcSubscriptionsUrl: endpoints.rpcSubscriptionsUrl,
            deferMasterSeedSignature: true,
          });
          const query = getUserAccountQuerierFunction({ client: checkClient });
          const state = await query(account.address as never);
          const maybeState = state as {
            state?: string;
            data?: {
              isInitialised?: boolean;
              isUserAccountX25519KeyRegistered?: boolean;
              isUserCommitmentRegistered?: boolean;
              isActiveForAnonymousUsage?: boolean;
            };
          } | null | undefined;
          const data = maybeState?.data;
          // We register with { confidential: true, anonymous: true }, so a fully
          // registered customer will have all three flags set.
          registered =
            maybeState?.state === "exists" &&
            data?.isInitialised === true &&
            data?.isUserAccountX25519KeyRegistered === true &&
            data?.isUserCommitmentRegistered === true &&
            data?.isActiveForAnonymousUsage === true;
        } catch {
          // If check fails, assume not registered so we show the modal.
          registered = false;
        }

        if (cancelled) return;
        setUmbraRegistered(registered);

        if (!registered) {
          // ── Not registered: show registration modal, defer payment ──
          setRegistrationModalOpen(true);
          setStep("ready");
          return;
        }

        // ── Step B: Already registered — check for local master seed ──
        const storage = createUmbraLocalMasterSeedStorage({
          walletAddress: account.address,
          network: payment.merchantNetwork,
        });
        const seedResult = storage.load ? await storage.load() : { exists: false };
        setNeedsConsent(!seedResult.exists);

        setStep("ready");
      } catch (err) {
        if (cancelled) return;
        setErrorMsg(err instanceof Error ? err.message : "Failed to connect wallet");
        setStep("error");
      }
    };

    connectWalletStandard();
    return () => {
      cancelled = true;
    };
  }, [connectAttempt]);

  // ─── Umbra registration (anonymous only — customers need the mixer path) ───
  const handleRegister = useCallback(async () => {
    const walletState = walletStateRef.current;
    if (!walletAddress || !walletState) return;

    setRegistrationInProgress(true);
    setRegistrationError("");
    setRegistrationStep(1); // Step 1: Sign message (wallet will prompt)

    try {
      const endpoints = getDefaultSolanaEndpoints(payment.merchantNetwork);
      const signer = createSignerFromWalletAccount(walletState.wallet, walletState.account);

      // getUmbraClient with deferMasterSeedSignature: false is what triggers
      // the wallet sign prompt for the master seed. Once this resolves, step 1 is done.
      const client = await getUmbraClient(
        {
          signer,
          network: endpoints.umbraNetwork,
          rpcUrl: endpoints.rpcUrl,
          rpcSubscriptionsUrl: endpoints.rpcSubscriptionsUrl,
          deferMasterSeedSignature: false,
        },
        {
          masterSeedStorage: createUmbraLocalMasterSeedStorage({
            walletAddress,
            network: payment.merchantNetwork,
          }),
        }
      );

      // Master seed signed → step 2 (create account tx is next)
      setRegistrationStep(2);

      const zkProver = getUserRegistrationProver();
      const register = getUserRegistrationFunction({ client }, { zkProver });

      // anonymous: true requires confidential: true — SDK throws otherwise.
      // Use SDK-provided callbacks to advance the visual steps accurately.
      await register({
        confidential: true,
        anonymous: true,
        callbacks: {
          userAccountInitialisation: {
            // Account PDA created → advance to step 3 (key registration + ZK proof)
            post: async () => { setRegistrationStep(3); },
          },
          // X25519 key registration happens silently as part of step 3.
          // registerUserForAnonymousUsage (ZK proof + commitment) finishes step 3.
        },
      });

      // Brief pause so the user sees step 3 fully lit before modal closes.
      await new Promise<void>((resolve) => setTimeout(resolve, 800));

      // Registration complete — master seed already stored by the client above.
      setUmbraRegistered(true);
      setNeedsConsent(false);
      setRegistrationModalOpen(false);
      setRegistrationStep(0);
    } catch (err) {
      if (isRegistrationError(err)) {
        const stage = String(err.stage);
        const stageMsg =
          stage === "master-seed-derivation"
            ? "Please approve the consent message in your wallet."
            : stage === "transaction-sign"
              ? "A wallet prompt was dismissed — each step needs your approval."
              : stage === "zk-proof-generation"
                ? "ZK proof generation failed. Check your connection and try again."
                : "Registration failed. Please try again.";
        setRegistrationError(stageMsg);
      } else {
        setRegistrationError(err instanceof Error ? err.message : "Registration failed. Please try again.");
      }
      setRegistrationStep(0);
    } finally {
      setRegistrationInProgress(false);
    }
  }, [walletAddress, payment.merchantNetwork]);

  // ─── One-time consent: create Umbra client to trigger master seed signing ──
  const handleConsentSign = useCallback(async () => {
    const walletState = walletStateRef.current;
    if (!walletAddress || !walletState) return;

    setConsentLoading(true);
    setConsentError("");
    try {
      const endpoints = getDefaultSolanaEndpoints(payment.merchantNetwork);
      const signer = createSignerFromWalletAccount(walletState.wallet, walletState.account);
      // Creating the client with deferMasterSeedSignature: false triggers the
      // wallet to prompt for a signature, which generates and stores the master seed.
      await getUmbraClient(
        {
          signer,
          network: endpoints.umbraNetwork,
          rpcUrl: endpoints.rpcUrl,
          rpcSubscriptionsUrl: endpoints.rpcSubscriptionsUrl,
          deferMasterSeedSignature: false,
          indexerApiEndpoint: getDefaultUmbraIndexerUrl(payment.merchantNetwork),
        },
        {
          masterSeedStorage: createUmbraLocalMasterSeedStorage({
            walletAddress,
            network: payment.merchantNetwork,
          }),
        }
      );
      // Master seed is now stored — dismiss the consent modal.
      setNeedsConsent(false);
    } catch (err) {
      setConsentError(err instanceof Error ? err.message : "Signing failed. Please try again.");
    } finally {
      setConsentLoading(false);
    }
  }, [walletAddress, payment.merchantNetwork]);

  const executePayment = useCallback(async () => {
    const walletState = walletStateRef.current;
    if (!walletAddress || !walletState) return;

    setStep("signing");

    try {
      if (!payment.merchantWallet) {
        throw new Error("Merchant wallet is not configured for this payment.");
      }

      const endpoints = getDefaultSolanaEndpoints(payment.merchantNetwork);
      const signer = createSignerFromWalletAccount(walletState.wallet, walletState.account);
      const client = await getUmbraClient(
        {
          signer,
          network: endpoints.umbraNetwork,
          rpcUrl: endpoints.rpcUrl,
          rpcSubscriptionsUrl: endpoints.rpcSubscriptionsUrl,
          deferMasterSeedSignature: false,
          indexerApiEndpoint: getDefaultUmbraIndexerUrl(payment.merchantNetwork),
        },
        {
          masterSeedStorage: createUmbraLocalMasterSeedStorage({
            walletAddress,
            network: payment.merchantNetwork,
          }),
        }
      );

      const createUtxo = getPublicBalanceToReceiverClaimableUtxoCreatorFunction(
        { client },
        { zkProver: getCreateReceiverClaimableUtxoFromPublicBalanceProver() }
      );
      const optionalDataHash = payment.expectedOptionalDataHash;
      if (!optionalDataHash) {
        throw new Error("Payment optionalData hash is missing.");
      }
      const createUtxoResult = await createUtxo({
        amount: BigInt(payment.amount) as never,
        destinationAddress: payment.merchantWallet as never,
        mint: payment.mint as never,
      }, {
        optionalData: optionalDataHashToBytes(optionalDataHash) as never,
      });
      const signatures = extractCreateUtxoSignatures(createUtxoResult);

      setStep("submitting");

      // ─── POST the tx signature to our API ────────────────────────────────
      const res = await fetch(`/api/v1/payments/${payment.id}/submit-tx`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-unseen-payment-token": payment.paymentToken,
        },
        body: JSON.stringify({
          txSignatures: signatures,
          amount: Number(payment.amount),
          optionalDataHash,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error((data as { error?: string }).error ?? "Failed to submit transaction");
      }

      if (checkoutKind === "invoice") {
        setStep("confirming");
        const verified = await pollHostedPaymentConfirmation(payment.id, payment.paymentToken);
        if (!verified.ok) {
          setErrorMsg(verified.error);
          setStep("error");
          return;
        }
      }

      setTxSignatures(signatures);
      setStep("success");
    } catch (err) {
      const raw = err instanceof Error ? err.message : "Payment failed";
      // Surface a friendly message for the known devnet fee_schedule issue.
      const msg = raw.includes("fee_schedule") || raw.includes("AccountNotInitialized")
        ? "The Umbra protocol fee schedule is not yet initialized on this network. Please contact support or try again later."
        : raw.includes("Transaction simulation failed")
          ? `Transaction failed on-chain. Details: ${raw}`
          : raw;
      setErrorMsg(msg);
      setStep("error");
    }
  }, [walletAddress, payment, checkoutKind]);

  const handlePayClick = useCallback(() => {
    void executePayment();
  }, [executePayment]);

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="checkout-container">
      <style>{animationCSS}</style>

      {/* Logo */}
      <div className="checkout-logo">
        <img
          src={UNSEEN_LOGO_DARK_SRC}
          alt="Unseen Pay"
          className="checkout-logo-img"
        />
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

        {step === "ready" && walletAddress && walletName && (
          <div className="checkout-step">
            <div className="checkout-wallet-row">
              <div className="checkout-wallet-dot" />
              <span className="checkout-wallet-text">
                {walletName} • {truncateAddress(walletAddress)}
              </span>
            </div>
            <button className="checkout-pay-btn" onClick={handlePayClick}>
              <img src={UNSEEN_LOGO_DARK_SRC} alt="" className="checkout-btn-logo checkout-btn-logo--md" />
              Pay Privately
            </button>
            {/* <p className="checkout-hint">
              Your wallet will prompt you to sign the transaction.
              This payment uses Umbra privacy — your identity stays hidden.
            </p> */}
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

        {step === "confirming" && (
          <div className="checkout-step">
            <div className="checkout-spinner" />
            <p className="checkout-step-text">Confirming payment...</p>
            <p className="checkout-hint">Almost done — finalizing on-chain.</p>
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
            {checkoutKind === "invoice" ? (
              <p className="checkout-hint">
                Your invoice is paid. You can close this page — the merchant&apos;s dashboard updates automatically.
              </p>
            ) : (
              <p className="checkout-hint">
                Return to the merchant&apos;s page and click &quot;I have paid&quot; to complete your order.
              </p>
            )}
            {txSignatures.length > 0 && (
              <code className="checkout-sig">{truncateAddress(txSignatures[0])}</code>
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
              onClick={() => {
                setErrorMsg("");
                setConsentError("");
                setStep("connecting");
                setConnectAttempt((v) => v + 1);
              }}
            >
              Try Again
            </button>
          </div>
        )}

        {/* Privacy badge */}
        <div className="checkout-privacy-badge">
          <img src={UNSEEN_LOGO_DARK_SRC} alt="" className="checkout-privacy-logo" />
          Payment is private — shielded by Unseen Pay
        </div>

        {/* Footer */}
        <div className="checkout-footer">
          <span className="checkout-timer">⏱ {countdown}</span>
          <span className="checkout-powered">
            Powered by
            <img src={UNSEEN_LOGO_DARK_SRC} alt="Unseen Finance" className="checkout-footer-logo" />
          </span>
        </div>
      </div>

      {registrationModalOpen ? (
        <div className="checkout-consent-modal-overlay">
          <div className="checkout-consent-modal" role="dialog" aria-modal="true" style={{ maxWidth: 380 }}>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 4 }}>
              <img src={UNSEEN_LOGO_DARK_SRC} alt="" className="checkout-modal-logo" />
            </div>
            <h3 className="checkout-consent-title">Enable private payments</h3>
            <p className="checkout-consent-text">
              Your wallet needs a one-time Umbra registration to send shielded payments.
              You&apos;ll approve a signature then a few transactions — each step is shown below.
            </p>

            {/* ── Animated horizontal steps ── */}
            <div className="checkout-reg-steps">
              {([
                { label: "Sign message", n: 1 },
                { label: "Create account", n: 2 },
                { label: "Register keys", n: 3 },
              ] as const).map(({ label, n }) => {
                const isDone = registrationStep > n;
                const isActive = registrationStep === n;
                return (
                  <div key={n} className="checkout-reg-step-wrap">
                    <div
                      className={[
                        "checkout-reg-step",
                        isActive ? "checkout-reg-step--active" : "",
                        isDone ? "checkout-reg-step--done" : "",
                      ].filter(Boolean).join(" ")}
                    >
                      <span className="checkout-reg-step-num">
                        {isDone ? (
                          <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <polyline points="2,6 5,9 10,3"/>
                          </svg>
                        ) : n}
                      </span>
                      <span className="checkout-reg-step-label">{label}</span>
                    </div>
                    {n < 3 && <div className={["checkout-reg-step-line", isDone ? "checkout-reg-step-line--done" : ""].filter(Boolean).join(" ")} />}
                  </div>
                );
              })}
            </div>

            {registrationError ? (
              <p className="checkout-consent-error">{registrationError}</p>
            ) : null}

            <button
              className="checkout-pay-btn"
              onClick={() => void handleRegister()}
              disabled={registrationInProgress}
              style={{ opacity: registrationInProgress ? 0.75 : 1 }}
            >
              {registrationInProgress ? (
                <>
                  <span className="checkout-consent-spinner" />
                  Registering…
                </>
              ) : registrationError ? (
                "Retry registration"
              ) : (
                <>
                  <img src={UNSEEN_LOGO_DARK_SRC} alt="" className="checkout-btn-logo checkout-btn-logo--sm" />
                  Register wallet
                </>
              )}
            </button>
          </div>
        </div>
      ) : null}

      {needsConsent ? (
        <div className="checkout-consent-modal-overlay">
          <div className="checkout-consent-modal" role="dialog" aria-modal="true">
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 4 }}>
              <img src={UNSEEN_LOGO_DARK_SRC} alt="" className="checkout-modal-logo" />
            </div>
            <h3 className="checkout-consent-title">One-time setup</h3>
            <p className="checkout-consent-text">
              Unseen Pay uses a private key derived from your wallet signature.
              Sign once to enable private payments — this is stored locally and never shared.
            </p>
            {consentError ? (
              <p className="checkout-consent-error">{consentError}</p>
            ) : null}
            <button
              className="checkout-pay-btn"
              onClick={() => void handleConsentSign()}
              disabled={consentLoading}
              style={{ opacity: consentLoading ? 0.7 : 1 }}
            >
              {consentLoading ? (
                <>
                  <span className="checkout-consent-spinner" />
                  Waiting for signature…
                </>
              ) : (
                <>
                  <img src={UNSEEN_LOGO_DARK_SRC} alt="" className="checkout-btn-logo checkout-btn-logo--sm" />
                  Sign to continue
                </>
              )}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** After submit-tx, confirm on-chain via public verify (payment token auth). Polls until confirmed or timeout. */
async function pollHostedPaymentConfirmation(
  paymentId: string,
  paymentToken: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const maxAttempts = 24;
  const delayMs = 1500;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const res = await fetch(`/api/public/payments/${paymentId}/verify`, {
      method: "POST",
      headers: { "x-unseen-payment-token": paymentToken },
    });
    let body: { status?: string; error?: string } = {};
    try {
      body = (await res.json()) as { status?: string; error?: string };
    } catch {
      body = {};
    }
    if (res.ok && body.status === "confirmed") {
      return { ok: true };
    }
    if (res.status === 401 || res.status === 404) {
      return { ok: false, error: body.error ?? "Could not verify payment (session)." };
    }
    if (res.status === 422) {
      return { ok: false, error: body.error ?? "Payment could not be verified." };
    }
    if (res.status === 409) {
      return { ok: false, error: body.error ?? "This payment can no longer be confirmed." };
    }
    await new Promise((r) => setTimeout(r, delayMs));
  }
  return {
    ok: false,
    error:
      "Your payment was sent but is still confirming on-chain. The merchant will see it soon — you can close this page.",
  };
}

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

function optionalDataHashToBytes(hash: string): Uint8Array {
  if (!/^[0-9a-f]{64}$/i.test(hash)) {
    throw new Error("optionalData hash must be a 64-char hex string");
  }
  const bytes = new Uint8Array(32);
  for (let i = 0; i < 32; i += 1) {
    bytes[i] = Number.parseInt(hash.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

function extractCreateUtxoSignatures(
  result: CreateUtxoFromPublicBalanceResult
): string[] {
  const raw = [
    result.createProofAccountSignature,
    result.createUtxoSignature,
    result.closeProofAccountSignature,
  ];

  return Array.from(
    new Set(
      raw
        .filter((sig): sig is NonNullable<(typeof raw)[number]> => sig !== undefined)
        .map((sig) => sig.toString())
        .filter((sig) => sig.length > 0)
    )
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const animationCSS = `
  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes checkout-spin { to { transform: rotate(360deg); } }
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
    margin-bottom: 32px;
    position: relative;
    z-index: 1;
  }

  /* Logo sizes — adjust heights/max-widths to taste (shared hosted checkout) */
  .checkout-logo-img {
    height: 62px;
    width: auto;
    max-width: min(420px, 92vw);
    object-fit: contain;
    display: block;
  }

  .checkout-btn-logo {
    width: auto;
    object-fit: contain;
    display: block;
    flex-shrink: 0;
  }

  .checkout-btn-logo--md { height: 31px; max-width: 210px; }

  .checkout-btn-logo--sm { height: 25px; max-width: 168px; }

  .checkout-modal-logo {
    height: 62px;
    width: auto;
    max-width: min(336px, 90vw);
    object-fit: contain;
    display: block;
  }

  .checkout-privacy-logo {
    height: 25px;
    width: auto;
    max-width: 182px;
    object-fit: contain;
    display: block;
    flex-shrink: 0;
  }

  .checkout-footer-logo {
    height: 25px;
    width: auto;
    max-width: 210px;
    margin-left: 6px;
    object-fit: contain;
    vertical-align: middle;
    display: inline-block;
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
    display: inline-flex;
    align-items: center;
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

  .checkout-consent-modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(15, 23, 42, 0.45);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 50;
    padding: 20px;
  }

  .checkout-consent-modal {
    width: 100%;
    max-width: 420px;
    background: rgba(255, 255, 255, 0.97);
    border: 1px solid rgba(123, 47, 255, 0.2);
    border-radius: 20px;
    padding: 22px;
    box-shadow: 0 24px 60px rgba(80, 40, 180, 0.22);
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .checkout-consent-title {
    margin: 0;
    font-size: 18px;
    font-weight: 700;
    color: #1a1030;
    text-align: center;
  }

  .checkout-consent-text {
    margin: 0;
    font-size: 14px;
    line-height: 1.6;
    color: #5c4d83;
    text-align: center;
  }

  .checkout-consent-error {
    margin: 0;
    padding: 8px 10px;
    border-radius: 10px;
    border: 1px solid rgba(220, 38, 38, 0.2);
    background: rgba(220, 38, 38, 0.08);
    color: #b91c1c;
    font-size: 13px;
    text-align: center;
  }

  .checkout-consent-spinner {
    display: inline-block;
    width: 14px;
    height: 14px;
    border: 2px solid rgba(255,255,255,0.4);
    border-top-color: #fff;
    border-radius: 50%;
    animation: checkout-spin 0.7s linear infinite;
    flex-shrink: 0;
  }

  /* ── Registration steps ── */
  .checkout-reg-steps {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0;
    margin: 12px 0 4px;
  }
  .checkout-reg-step-wrap {
    display: flex;
    align-items: center;
  }
  .checkout-reg-step {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 5px;
    min-width: 72px;
  }
  .checkout-reg-step-num {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 26px;
    height: 26px;
    border-radius: 50%;
    font-size: 11px;
    font-weight: 700;
    background: rgba(123, 47, 255, 0.08);
    border: 1.5px solid rgba(123, 47, 255, 0.2);
    color: #9b72cf;
    transition: background 0.3s, border-color 0.3s, color 0.3s;
  }
  .checkout-reg-step--active .checkout-reg-step-num {
    background: rgba(123, 47, 255, 0.18);
    border-color: #7b2fff;
    color: #7b2fff;
    animation: checkout-reg-pulse 1.4s ease-in-out infinite;
  }
  .checkout-reg-step--done .checkout-reg-step-num {
    background: #7b2fff;
    border-color: #7b2fff;
    color: #fff;
  }
  .checkout-reg-step-label {
    font-size: 10px;
    color: #9b72cf;
    font-weight: 500;
    text-align: center;
    white-space: nowrap;
    transition: color 0.3s;
  }
  .checkout-reg-step--active .checkout-reg-step-label,
  .checkout-reg-step--done .checkout-reg-step-label {
    color: #5c3d9e;
  }
  .checkout-reg-step-line {
    width: 28px;
    height: 2px;
    background: rgba(123, 47, 255, 0.15);
    margin-bottom: 16px;
    border-radius: 2px;
    transition: background 0.4s;
    flex-shrink: 0;
  }
  .checkout-reg-step-line--done {
    background: #7b2fff;
  }
  @keyframes checkout-reg-pulse {
    0%, 100% { box-shadow: 0 0 0 0 rgba(123, 47, 255, 0.35); }
    50% { box-shadow: 0 0 0 5px rgba(123, 47, 255, 0); }
  }
`;

