"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import {
  DPageHeader,
  DStatCard,
  DTable,
  DTabs,
  DBadge,
  DButton,
  DDrawer,
  DInput,
  DCopyField,
} from "@/components/dashboard/primitives";
import { type Tiplink, type GiftCard } from "@/lib/dashboard-types";
import { useDashboardOverview } from "@/hooks/use-dashboard-overview";
import { useMerchantApi } from "@/hooks/use-merchant-api";
import { formatCurrency, formatRelativeTime } from "@/components/dashboard/formatters";
import { signAndSendPrivyUsdcToGiftTreasury } from "@/lib/gift-cards/privy-fund-treasury-transfer";
import { Gift, Link as LinkIcon, Plus, Copy, Send, ExternalLink, Share2 } from "lucide-react";
import { usePrivy } from "@privy-io/react-auth";
import { useWallets } from "@privy-io/react-auth/solana";

type Tab = "giftcards" | "tiplinks";

export default function TiplinksPage() {
  const { data, loading } = useDashboardOverview();
  const { getAccessToken } = usePrivy();
  const { merchant } = useMerchantApi();
  const { ready: walletsReady, wallets } = useWallets();
  const tiplinks = data?.overview.tiplinks ?? [];
  const giftCards = data?.overview.giftCards ?? [];
  const [activeTab, setActiveTab] = useState<Tab>("giftcards");

  const [gcDrawerOpen, setGcDrawerOpen] = useState(false);
  const [gcStep, setGcStep] = useState<"form" | "done">("form");
  const [gcAmount, setGcAmount] = useState("");
  const [gcMemo, setGcMemo] = useState("");
  const [gcValidityDays, setGcValidityDays] = useState("90");
  const [gcCreatedCode, setGcCreatedCode] = useState("");
  const [gcBusy, setGcBusy] = useState(false);
  const [gcBusyPhase, setGcBusyPhase] = useState<"idle" | "intent" | "wallet" | "confirm">("idle");
  const [gcError, setGcError] = useState<string | null>(null);

  const privySolanaWallet = useMemo(() => {
    if (!walletsReady || wallets.length === 0) return null;
    if (merchant?.walletAddress) {
      return wallets.find((w) => w.address === merchant.walletAddress) ?? null;
    }
    return wallets[0] ?? null;
  }, [merchant?.walletAddress, wallets, walletsReady]);

  const resetGcDrawer = useCallback(() => {
    setGcStep("form");
    setGcAmount("");
    setGcMemo("");
    setGcValidityDays("90");
    setGcCreatedCode("");
    setGcBusy(false);
    setGcBusyPhase("idle");
    setGcError(null);
  }, []);

  const openGcDrawer = useCallback(() => {
    resetGcDrawer();
    setGcDrawerOpen(true);
  }, [resetGcDrawer]);

  const closeGcDrawer = useCallback(() => {
    setGcDrawerOpen(false);
    resetGcDrawer();
  }, [resetGcDrawer]);

  const handleCreateGiftCard = useCallback(async () => {
    setGcError(null);
    const token = await getAccessToken();
    if (!token) {
      setGcError("Not signed in");
      return;
    }
    if (!merchant?.walletAddress || !merchant?.network) {
      setGcError("Merchant wallet is not linked. Finish onboarding first.");
      return;
    }
    if (!privySolanaWallet || privySolanaWallet.address !== merchant.walletAddress) {
      setGcError("Connect the same Solana wallet as your merchant account (check Privy).");
      return;
    }
    const days = Number(gcValidityDays);
    setGcBusy(true);
    setGcBusyPhase("intent");
    try {
      const res = await fetch("/api/dashboard/gift-cards/intent", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: gcAmount.trim(),
          memo: gcMemo.trim(),
          validityDays: Number.isFinite(days) ? days : 90,
        }),
      });
      const intent = (await res.json().catch(() => ({}))) as {
        error?: string;
        giftId?: string;
        payToWallet?: string;
        payToAssociatedTokenAccount?: string;
        fundAmountRaw?: string;
        mint?: string;
      };
      if (!res.ok) throw new Error(intent.error ?? `HTTP ${res.status}`);
      if (
        !intent.giftId ||
        !intent.payToAssociatedTokenAccount ||
        !intent.payToWallet ||
        !intent.fundAmountRaw ||
        !intent.mint
      ) {
        throw new Error("Invalid server response");
      }

      setGcBusyPhase("wallet");
      const { signatureBase58 } = await signAndSendPrivyUsdcToGiftTreasury({
        privyWallet: privySolanaWallet,
        merchantWalletAddress: merchant.walletAddress,
        merchantNetwork: merchant.network,
        treasuryOwnerBase58: intent.payToWallet,
        treasuryAtaBase58: intent.payToAssociatedTokenAccount,
        mintBase58: intent.mint,
        amountRaw: BigInt(intent.fundAmountRaw),
      });

      setGcBusyPhase("confirm");
      const confirmRes = await fetch("/api/dashboard/gift-cards/confirm", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ giftId: intent.giftId, fundingTxSignature: signatureBase58 }),
      });
      const confirmed = (await confirmRes.json().catch(() => ({}))) as { error?: string; claimCode?: string };
      if (!confirmRes.ok) {
        throw new Error(
          confirmed.error ??
            "Payment was sent but we could not issue the code. Contact support with your wallet and time of payment.",
        );
      }
      if (!confirmed.claimCode) throw new Error("No claim code returned");
      setGcCreatedCode(confirmed.claimCode);
      setGcStep("done");
      window.dispatchEvent(new Event("dashboard:refresh"));
    } catch (e) {
      setGcError(e instanceof Error ? e.message : "Could not create gift card");
    } finally {
      setGcBusy(false);
      setGcBusyPhase("idle");
    }
  }, [getAccessToken, gcAmount, gcMemo, gcValidityDays, merchant?.network, merchant?.walletAddress, privySolanaWallet]);

  const handleShareGiftCode = useCallback(async () => {
    if (!gcCreatedCode || typeof window === "undefined") return;
    const redeemUrl = `${window.location.origin}/redeem`;
    const text = `Gift for you — code: ${gcCreatedCode}\nRedeem: ${redeemUrl}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: "Gift card", text });
        return;
      }
    } catch {
      /* user cancelled share sheet */
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      /* ignore */
    }
  }, [gcCreatedCode]);

  if (loading && !data) {
    return (
      <div className="d-card" style={{ minHeight: 220, display: "grid", placeItems: "center" }}>
        <div
          style={{
            width: 28,
            height: 28,
            border: "3px solid rgba(123,47,255,0.2)",
            borderTopColor: "#7b2fff",
            borderRadius: "50%",
            animation: "spin 0.8s linear infinite",
          }}
        />
      </div>
    );
  }

  /* ── Tiplink stats (stub list is usually empty) ───────────────────── */
  const tlActive = tiplinks.filter((t) => t.status === "active").length;
  const tlClaimed = tiplinks.filter((t) => t.status === "claimed").length;
  const tlTotalValue = tiplinks.reduce((sum, t) => sum + t.amount, 0);

  const gcActive = giftCards.filter((g) => g.status === "active").length;
  const gcRedeemed = giftCards.filter((g) => g.status === "redeemed").length;
  const gcTotalValue = giftCards.reduce((sum, g) => sum + g.amount, 0);

  function statusBadge(status: string) {
    const variant =
      status === "active" || status === "live"
        ? "success"
        : status === "claimed" || status === "redeemed"
          ? "violet"
          : status === "pending"
            ? "warning"
            : status === "failed"
              ? "error"
              : "muted";
    return (
      <DBadge variant={variant} dot>
        {status}
      </DBadge>
    );
  }

  const tiplinkColumns = [
    { key: "label", header: "Label", render: (r: Tiplink) => r.label },
    {
      key: "amount",
      header: "Amount",
      align: "right" as const,
      render: (r: Tiplink) => formatCurrency(r.amount, r.currency),
    },
    {
      key: "status",
      header: "Status",
      render: (r: Tiplink) => statusBadge(r.status),
    },
    {
      key: "link",
      header: "Link",
      hideOnMobile: true,
      render: (r: Tiplink) => <DCopyField value={r.url} />,
    },
    {
      key: "created",
      header: "Created",
      hideOnMobile: true,
      render: (r: Tiplink) => formatRelativeTime(r.createdAt),
    },
  ];

  const giftCardColumns = [
    { key: "memo", header: "Note", render: (r: GiftCard) => <span style={{ fontWeight: 500 }}>{r.memo}</span> },
    {
      key: "amount",
      header: "Amount",
      align: "right" as const,
      render: (r: GiftCard) => formatCurrency(r.amount, r.currency),
    },
    {
      key: "status",
      header: "Status",
      render: (r: GiftCard) => statusBadge(r.status),
    },
    {
      key: "claimCode",
      header: "Claim code",
      render: (r: GiftCard) =>
        r.claimCode ? (
          <DCopyField value={r.claimCode} />
        ) : (
          <span style={{ color: "var(--color-text-muted)", fontSize: 13 }}>—</span>
        ),
    },
    { key: "ref", header: "Ref", hideOnMobile: true, render: (r: GiftCard) => <span className="d-mono">{r.code}</span> },
    {
      key: "created",
      header: "Created",
      hideOnMobile: true,
      render: (r: GiftCard) => formatRelativeTime(r.createdAt),
    },
  ];

  return (
    <>
      <DPageHeader
        title="Gift cards & Tiplinks"
        description="Fund gift cards to a treasury wallet; recipients redeem with a code—no Umbra account required."
      />

      <DTabs
        items={[
          { id: "giftcards", label: "Gift Cards", count: giftCards.length },
          { id: "tiplinks", label: "Tiplinks", count: tiplinks.length },
        ]}
        active={activeTab}
        onChange={(id) => setActiveTab(id as Tab)}
      />

      {activeTab === "giftcards" && (
        <>
          <div className="d-stat-row">
            <DStatCard icon={Gift} label="Active" value={String(gcActive)} />
            <DStatCard icon={Copy} label="Redeemed" value={String(gcRedeemed)} />
            <DStatCard icon={Send} label="Total issued" value={formatCurrency(gcTotalValue, "USDC")} />
          </div>

          <div className="d-section-actions d-flex d-flex--between d-flex--align-center" style={{ flexWrap: "wrap", gap: 12 }}>
            <DButton icon={Plus} onClick={openGcDrawer}>
              Create gift card
            </DButton>
            <Link href="/redeem" className="d-btn d-btn--ghost" style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
              <ExternalLink size={16} /> Recipient redeem page
            </Link>
          </div>

          <p style={{ fontSize: 13, color: "var(--color-text-muted)", margin: "12px 0 20px" }}>
            Create a gift card: your wallet will ask you to approve a USDC payment to Unseen&apos;s treasury (face amount +
            fee), then you get a one-time code to share. Recipients redeem at <Link href="/redeem">/redeem</Link> with any
            Solana wallet.
          </p>

          <DTable
            columns={giftCardColumns}
            data={loading ? [] : giftCards}
            emptyTitle="No gift cards yet"
            emptyDescription="Create a gift card to get a claim code for your recipient."
          />

          <DDrawer open={gcDrawerOpen} onClose={() => !gcBusy && closeGcDrawer()} title="Create gift card">
            {gcError ? (
              <p style={{ color: "#b91c1c", fontSize: 14, margin: "0 0 12px" }}>{gcError}</p>
            ) : null}

            {gcStep === "form" ? (
              <div className="d-drawer-form">
                <DInput label="Amount (USDC)" value={gcAmount} onChange={setGcAmount} type="number" placeholder="e.g. 10" />
                <DInput label="Note (shown to recipient)" value={gcMemo} onChange={setGcMemo} placeholder="Happy birthday!" />
                <DInput
                  label="Valid for (days)"
                  value={gcValidityDays}
                  onChange={setGcValidityDays}
                  type="number"
                  placeholder="90"
                />
                <p style={{ fontSize: 13, color: "var(--color-text-muted)", margin: 0, lineHeight: 1.5 }}>
                  The next step opens your wallet: you&apos;ll send the gift amount plus a small platform fee in USDC on{" "}
                  <strong>{merchant?.network === "mainnet" ? "mainnet" : "devnet"}</strong>. Your connected wallet must match
                  your merchant wallet.
                </p>
                <DButton
                  onClick={() => void handleCreateGiftCard()}
                  loading={gcBusy}
                  disabled={!gcAmount.trim() || !gcMemo.trim() || !merchant?.walletAddress || !privySolanaWallet}
                >
                  {gcBusy && gcBusyPhase === "intent"
                    ? "Preparing…"
                    : gcBusy && gcBusyPhase === "wallet"
                      ? "Confirm in wallet…"
                      : gcBusy && gcBusyPhase === "confirm"
                        ? "Issuing code…"
                        : "Create gift card"}
                </DButton>
              </div>
            ) : null}

            {gcStep === "done" ? (
              <div className="d-drawer-success">
                <p className="d-drawer-success__msg">Gift card ready</p>
                <DCopyField label="Claim code" value={gcCreatedCode} />
                <div className="d-flex d-flex--gap-sm" style={{ marginTop: 12, flexWrap: "wrap" }}>
                  <DButton variant="secondary" icon={Share2} onClick={() => void handleShareGiftCode()}>
                    Share
                  </DButton>
                </div>
                <p style={{ fontSize: 13, color: "var(--color-text-muted)", margin: "12px 0 0" }}>
                  Recipients redeem at <Link href="/redeem">/redeem</Link>
                </p>
                <div style={{ marginTop: 16 }}>
                  <DButton variant="secondary" onClick={closeGcDrawer}>
                    Done
                  </DButton>
                </div>
              </div>
            ) : null}
          </DDrawer>
        </>
      )}

      {activeTab === "tiplinks" && (
        <>
          <div className="d-card" style={{ padding: 28, textAlign: "center", maxWidth: 520, margin: "0 auto" }}>
            <LinkIcon size={36} style={{ opacity: 0.35, marginBottom: 12 }} />
            <p style={{ fontSize: 16, fontWeight: 600, margin: "0 0 8px" }}>Tiplinks — coming soon</p>
            <p style={{ fontSize: 14, color: "var(--color-text-muted)", margin: 0, lineHeight: 1.55 }}>
              Shareable tip links will use the same privacy stack as gift cards. We&apos;re focused on gift cards first.
            </p>
          </div>

          <div className="d-stat-row" style={{ marginTop: 24, opacity: 0.5, pointerEvents: "none" }}>
            <DStatCard icon={LinkIcon} label="Active" value={String(tlActive)} />
            <DStatCard icon={Copy} label="Claimed" value={String(tlClaimed)} />
            <DStatCard icon={Gift} label="Total Value" value={formatCurrency(tlTotalValue, "USDC")} />
          </div>

          <DTable
            columns={tiplinkColumns}
            data={[]}
            emptyTitle="No tiplinks yet"
            emptyDescription="Tiplinks will appear here when the feature launches."
          />
        </>
      )}
    </>
  );
}
