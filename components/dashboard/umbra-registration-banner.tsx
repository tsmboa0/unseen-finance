"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { useWallets } from "@privy-io/react-auth/solana";
import { getUmbraClient, getUserAccountQuerierFunction, getUserRegistrationFunction } from "@umbra-privacy/sdk";
import { isRegistrationError } from "@umbra-privacy/sdk/errors";
import { getUserRegistrationProver } from "@umbra-privacy/web-zk-prover";
import { AlertTriangle, Loader2, Shield, X } from "lucide-react";
import { useMerchantApi } from "@/hooks/use-merchant-api";
import { getDefaultSolanaEndpoints } from "@/lib/solana-endpoints";
import { createUmbraLocalMasterSeedStorage } from "@/lib/umbra/master-seed-storage";
import { createUmbraSignerFromPrivyWallet } from "@/lib/umbra/privy-signer";

function registrationStageMessage(stage: string): string {
  switch (stage) {
    case "master-seed-derivation":
      return "Please approve the Umbra consent message in your wallet.";
    case "transaction-sign":
      return "A wallet prompt was dismissed — registration needs your signature on each step.";
    case "zk-proof-generation":
      return "Proof generation failed. Check your connection and try again.";
    default:
      return "Registration could not complete. Try again or contact support.";
  }
}

export function UmbraRegistrationBanner() {
  const { getAccessToken } = usePrivy();
  const { merchant, loading: merchantLoading, refreshMerchant } = useMerchantApi();
  const { ready: walletsReady, wallets } = useWallets();

  const [modalOpen, setModalOpen] = useState(false);
  const [working, setWorking] = useState(false);
  const [checkingExistingUmbra, setCheckingExistingUmbra] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const firstTimeCheckDoneRef = useRef(false);

  useEffect(() => {
    firstTimeCheckDoneRef.current = false;
  }, [merchant?.id]);

  const walletAddress = merchant?.walletAddress;
  const privySolanaWallet =
    !walletsReady || wallets.length === 0
      ? null
      : walletAddress
        ? (wallets.find((w) => w.address === walletAddress) ?? null)
        : (wallets[0] ?? null);

  const readyToRegister =
    Boolean(merchant?.walletAddress) &&
    walletsReady &&
    wallets.length > 0 &&
    privySolanaWallet !== null &&
    privySolanaWallet.address === merchant?.walletAddress;

  const runRegistration = useCallback(async () => {
    if (!merchant?.walletAddress) {
      setError("No Solana wallet is linked yet. Wait for Privy to finish creating your wallet, then refresh.");
      return;
    }
    if (!privySolanaWallet) {
      setError(
        "Your dashboard wallet does not match an active Privy Solana wallet. Refresh the page or sign in again.",
      );
      return;
    }
    if (privySolanaWallet.address !== merchant.walletAddress) {
      setError("Wallet mismatch: linked merchant wallet must match the Privy Solana wallet.");
      return;
    }

    setWorking(true);
    setError(null);

    try {
      const endpoints = getDefaultSolanaEndpoints(merchant.network);

      const signer = createUmbraSignerFromPrivyWallet(privySolanaWallet, {
        solanaChain: endpoints.privySolanaChain,
      });

      const { rpcUrl, rpcSubscriptionsUrl, umbraNetwork } = endpoints;

      const client = await getUmbraClient(
        {
        signer,
        network: umbraNetwork,
        rpcUrl,
        rpcSubscriptionsUrl,
        deferMasterSeedSignature: false,
        },
        {
          masterSeedStorage: createUmbraLocalMasterSeedStorage({
            walletAddress: merchant.walletAddress,
            network: merchant.network,
          }),
        },
      );

      const zkProver = getUserRegistrationProver();
      const register = getUserRegistrationFunction({ client }, { zkProver });

      await register({
        confidential: true,
        anonymous: true,
      });

      const privyToken = await getAccessToken();
      if (!privyToken) throw new Error("Session expired — please sign in again.");

      const res = await fetch("/api/dashboard/umbra-registration", {
        method: "POST",
        headers: { Authorization: `Bearer ${privyToken}` },
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        const msg = body?.error ?? `HTTP ${res.status}`;
        throw new Error(msg);
      }

      await refreshMerchant();
      setModalOpen(false);
    } catch (err: unknown) {
      if (isRegistrationError(err)) {
        setError(registrationStageMessage(String(err.stage)));
      } else {
        setError(err instanceof Error ? err.message : "Registration failed.");
      }
    } finally {
      setWorking(false);
    }
  }, [getAccessToken, merchant, privySolanaWallet, refreshMerchant]);

  useEffect(() => {
    async function verifyExistingUmbraRegistration() {
      if (!merchant || merchant.umbraRegistered || merchant.onboardingCompletedAt !== null) return;
      if (!merchant.walletAddress || !walletsReady || !privySolanaWallet) return;
      if (privySolanaWallet.address !== merchant.walletAddress) return;
      if (firstTimeCheckDoneRef.current) return;
      firstTimeCheckDoneRef.current = true;
      setCheckingExistingUmbra(true);

      try {
        const endpoints = getDefaultSolanaEndpoints(merchant.network);
        const signer = createUmbraSignerFromPrivyWallet(privySolanaWallet, {
          solanaChain: endpoints.privySolanaChain,
        });

        const client = await getUmbraClient({
          signer,
          network: endpoints.umbraNetwork,
          rpcUrl: endpoints.rpcUrl,
          rpcSubscriptionsUrl: endpoints.rpcSubscriptionsUrl,
          // Registration check is read-only and should not trigger wallet signature prompts.
          deferMasterSeedSignature: true,
        });

        const query = getUserAccountQuerierFunction({ client });
        const state = await query(client.signer.address as never);

        const maybeState = state as
          | {
              state?: string;
              data?: {
                isInitialised?: boolean;
                isUserAccountX25519KeyRegistered?: boolean;
                isUserCommitmentRegistered?: boolean;
                isActiveForAnonymousUsage?: boolean;
              };
            }
          | null
          | undefined;
        const data = maybeState?.data;
        const registered =
          maybeState?.state === "exists" &&
          data?.isInitialised === true &&
          data.isUserAccountX25519KeyRegistered === true &&
          data.isUserCommitmentRegistered === true &&
          data.isActiveForAnonymousUsage === true;

        if (!registered) return;

        const privyToken = await getAccessToken();
        if (!privyToken) return;

        await fetch("/api/dashboard/umbra-registration", {
          method: "POST",
          headers: { Authorization: `Bearer ${privyToken}` },
        });
        await refreshMerchant();
      } catch {
        // Keep this silent. Banner remains available for manual registration.
      } finally {
        setCheckingExistingUmbra(false);
      }
    }

    void verifyExistingUmbraRegistration();
  }, [getAccessToken, merchant, privySolanaWallet, refreshMerchant, walletsReady]);

  if (merchantLoading || !merchant || merchant.umbraRegistered) return null;

  const noLinkedWallet = !merchant.walletAddress;
  const walletsLoading = !walletsReady;
  const noSolanaWallet = walletsReady && wallets.length === 0;
  const walletMismatch =
    Boolean(merchant.walletAddress) && walletsReady && wallets.length > 0 && privySolanaWallet === null;

  return (
    <>
      <div className="dash-umbra-banner">
        <div className="dash-umbra-banner__left">
          <AlertTriangle aria-hidden className="dash-umbra-banner__icon" size={22} />
          <div>
            <p className="dash-umbra-banner__title">Register your wallet with Umbra</p>
            <p className="dash-umbra-banner__body">
              {noLinkedWallet ? (
                <>
                  Your Unseen account does not have a Solana wallet yet. Finish signing in with Privy so an embedded
                  wallet can be created, then reload this page.
                </>
              ) : walletsLoading ? (
                <>Loading your Privy Solana wallet…</>
              ) : checkingExistingUmbra ? (
                <>Checking whether this wallet is already registered with Umbra…</>
              ) : noSolanaWallet ? (
                <>
                  No Solana wallet is available from Privy yet. If you just signed in, wait a moment and refresh. You may
                  need to complete Privy&apos;s embedded wallet setup.
                </>
              ) : walletMismatch ? (
                <>
                  The Solana wallet active in this browser does not match your merchant wallet on file. Refresh after
                  Privy finishes syncing, or contact support if this persists.
                </>
              ) : (
                <>
                  Complete one-time Umbra registration so you can receive shielded payments and use confidential
                  balances. You&apos;ll sign an Umbra consent message once, then approve{" "}
                  <strong>several Solana transactions in a row</strong> (often around four) — each opens its own Privy
                  prompt. ZK proof generation may pause briefly between prompts.
                </>
              )}
            </p>
          </div>
        </div>
        {readyToRegister ? (
          <button
            className="dash-umbra-banner__btn"
            disabled={merchantLoading}
            onClick={() => {
              setError(null);
              setModalOpen(true);
            }}
            type="button"
          >
            <Shield size={16} aria-hidden />
            Register wallet
          </button>
        ) : null}
      </div>

      {modalOpen ? (
        <div
          className="dash-umbra-modal-overlay"
          role="presentation"
          onClick={(e) => {
            if (e.target === e.currentTarget && !working) setModalOpen(false);
          }}
        >
          <div className="dash-umbra-modal" role="dialog" aria-modal aria-labelledby="umbra-modal-title">
            <button
              aria-label="Close"
              className="dash-umbra-modal__close"
              disabled={working}
              onClick={() => setModalOpen(false)}
              type="button"
            >
              <X size={18} />
            </button>
            <div className="dash-umbra-modal__heading" id="umbra-modal-title">
              <Shield size={20} aria-hidden />
              Umbra wallet registration
            </div>
            <p className="dash-umbra-modal__copy">
              Umbra powers private balances and shielded transfers on Solana. When you continue: first your wallet asks
              you to sign the <strong>Umbra consent message</strong> once — that derives your Umbra privacy keys. Then
              you approve <strong>several separate Solana transactions one after another</strong> (typically on the order
              of four): create your encrypted Umbra account, register encryption keys, submit anonymous registration with
              a zero-knowledge proof, and finalize on-chain cleanup. The Umbra SDK requires multiple transactions here;
              each step opens its own Privy approval — that is expected.
            </p>
            <p className="dash-umbra-modal__copy">
              Proof generation can take a few seconds between prompts. Stay on this page until registration finishes.
            </p>
            <p className="dash-umbra-modal__copy">
              <strong>Privacy keys (master seed):</strong> Umbra derives a master seed from the consent signature and stores
              it in this browser&apos;s <strong>localStorage</strong> (scoped to your wallet + network) via Umbra&apos;s{" "}
              <code>masterSeedStorage</code> helper — not on Unseen servers. Clearing site data or using another browser
              profile will require signing the consent message again.
            </p>
            <p className="dash-umbra-modal__copy">
              Network for this registration: <strong>{merchant.network}</strong>.
            </p>
            {error ? <div className="dash-umbra-modal__error">{error}</div> : null}
            <div className="dash-umbra-modal__actions">
              <button
                className="dash-umbra-modal__ghost"
                disabled={working}
                onClick={() => setModalOpen(false)}
                type="button"
              >
                Cancel
              </button>
              <button className="dash-umbra-modal__primary" disabled={working} onClick={runRegistration} type="button">
                {working ? (
                  <>
                    <Loader2 size={16} aria-hidden style={{ animation: "spin 0.85s linear infinite" }} />
                    Working…
                  </>
                ) : (
                  "Continue & register"
                )}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
