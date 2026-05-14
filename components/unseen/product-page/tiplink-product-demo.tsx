"use client";

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
import type { GiftCard } from "@/lib/dashboard-types";
import { formatCurrency, formatRelativeTime } from "@/components/dashboard/formatters";
import { UnseenLogo } from "@/components/unseen/logo";
import { CheckCircle2, Copy, ExternalLink, Gift, Loader2, Plus, Send, Share2, Sparkles, LayoutDashboard } from "lucide-react";
import { rangeActive, useLoopTime } from "@/components/unseen/demo-utils";

import "@/app/redeem/redeem.css";

/** < 1 = faster timeline (0.5 ≈ 2× speed). */
const DEMO_PACE = 0.5;
const ms = (n: number) => Math.round(n * DEMO_PACE);

const CYCLE_MS = ms(44000);

/** Aligns with drawer + table demo so the redeem phase feels like the same gift. */
const CLAIM_CODE = "DEMO-CLAIM-7QX";
const REDEEM_GIFT_MEMO = "Thanks for the stream!";
const REDEEM_AMOUNT = 25;
/** When the embedded browser switches from dashboard → /redeem */
const REDEEM_START_MS = ms(17500);

const EXPIRY_LABEL = new Date("2026-12-31T00:00:00.000Z").toLocaleDateString("en-US", {
  dateStyle: "medium",
  timeZone: "UTC",
});

const DEMO_WALLET_DISPLAY = "Demo7xKP…mR9a";

function RedeemEmbedPhase({ r }: { r: number }) {
  const codeChars = Math.max(0, Math.min(CLAIM_CODE.length, Math.floor(Math.max(0, r - ms(200)) / ms(140))));
  const codeDisplay = CLAIM_CODE.slice(0, codeChars);

  const tapReveal = rangeActive(r, ms(2200), ms(2650));
  const lookupBusy = rangeActive(r, ms(2500), ms(4050));
  const revealed = r >= ms(4050);

  const walletConnected = r >= ms(5400);
  const tapClaim = rangeActive(r, ms(6150), ms(6550));
  const claimBusy = rangeActive(r, ms(6300), ms(7700));
  const claimSuccess = r >= ms(7700);

  if (claimSuccess) {
    return (
      <div className="redeem-root redeem-root--success redeem-root--embed">
        <div className="redeem-aurora" aria-hidden />
        <header className="redeem-header">
          <UnseenLogo compact href="/" />
        </header>
        <div className="redeem-inner redeem-inner--success">
          <div className="redeem-success-icon-wrap">
            <CheckCircle2 className="redeem-success-check" size={72} strokeWidth={2} aria-hidden />
          </div>
          <h1 className="redeem-success-title">You&apos;re all set</h1>
          <p className="redeem-success-body">
            <strong>{formatCurrency(REDEEM_AMOUNT, "USDC")}</strong> is on its way to your wallet&apos;s public ATA on Solana · Devnet.
          </p>
          <div className="redeem-success-actions">
            <a
              className={`redeem-btn redeem-btn--secondary ${rangeActive(r, ms(7900), ms(8300)) ? "tiplink-product-demo__btn--tap" : ""}`}
              href="https://solscan.io/tx/demoSig"
              rel="noopener noreferrer"
              style={{ textAlign: "center", textDecoration: "none", display: "block" }}
              target="_blank"
            >
              View transaction
            </a>
            <button type="button" className={`redeem-btn redeem-btn--primary ${rangeActive(r, ms(8400), ms(8800)) ? "tiplink-product-demo__btn--tap" : ""}`}>
              Redeem another gift
            </button>
          </div>
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
    <div className="redeem-root redeem-root--embed">
      <div className="redeem-aurora" aria-hidden />
      <header className="redeem-header">
        <UnseenLogo compact href="/" />
      </header>
      <div className="redeem-inner">
        <div className="redeem-hero-icon">
          <Gift size={28} strokeWidth={2} />
        </div>

        <h1 className="redeem-title">Redeem your gift</h1>
        <p className="redeem-sub">
          Enter your code, connect any Solana wallet, and claim USDC to your public balance.
        </p>

        <div className="redeem-card">
          {!revealed ? (
            <>
              <label className="redeem-label" htmlFor="tiplink-demo-redeem-code">
                Claim code
              </label>
              <input
                readOnly
                autoComplete="off"
                className="redeem-input"
                id="tiplink-demo-redeem-code"
                placeholder="Paste or type your code"
                spellCheck={false}
                value={codeDisplay}
              />
              <button
                className={`redeem-btn redeem-btn--primary ${tapReveal ? "tiplink-product-demo__btn--tap" : ""}`}
                disabled={codeDisplay.length < CLAIM_CODE.length}
                type="button"
              >
                {lookupBusy ? "Checking…" : "Reveal gift"}
              </button>
            </>
          ) : (
            <>
              <div className="redeem-gift-panel">
                <p className="redeem-gift-eyebrow">
                  <Sparkles size={14} style={{ display: "inline", marginRight: 6, verticalAlign: "middle" }} />
                  You&apos;re receiving
                </p>
                <p className="redeem-amount">{formatCurrency(REDEEM_AMOUNT, "USDC")}</p>
                <div className="redeem-memo-wrap">
                  <span className="redeem-memo-quote" aria-hidden>
                    “
                  </span>
                  <p className="redeem-memo-text">{REDEEM_GIFT_MEMO}</p>
                </div>
                <p className="redeem-expiry">Redeem by {EXPIRY_LABEL}</p>
              </div>

              <div className="redeem-wallet-row">
                <div className="redeem-network-pill">
                  <span aria-hidden>◎</span>
                  Solana · Devnet
                </div>

                {walletConnected ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    <p style={{ color: "var(--color-text-secondary)", fontSize: 12, margin: 0, wordBreak: "break-all" }}>
                      Connected:{" "}
                      <span style={{ color: "var(--color-text-primary)", fontFamily: "var(--font-mono)" }}>{DEMO_WALLET_DISPLAY}</span>
                    </p>
                    <div className="redeem-claim-row">
                      <button
                        className={`redeem-btn redeem-btn--primary redeem-btn--claim ${tapClaim ? "tiplink-product-demo__btn--tap" : ""}`}
                        disabled={claimBusy}
                        type="button"
                      >
                        {claimBusy ? (
                          <>
                            <Loader2 aria-hidden className="redeem-btn-spinner" size={18} strokeWidth={2} />
                            <span>Claiming…</span>
                          </>
                        ) : (
                          "Claim to my wallet"
                        )}
                      </button>
                      {claimBusy ? (
                        <span className="redeem-claim-countdown">{Math.max(0, 60 - Math.floor((r - ms(6300)) / Math.max(8, Math.round(23 * DEMO_PACE))))}s</span>
                      ) : null}
                    </div>
                    <button className="redeem-btn redeem-btn--secondary" disabled type="button">
                      Disconnect
                    </button>
                  </div>
                ) : (
                  <button className="redeem-btn redeem-btn--primary" disabled type="button">
                    Connect wallet…
                  </button>
                )}
              </div>
            </>
          )}
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

export default function TiplinkProductDemo({
  large = false,
  active = true,
}: {
  large?: boolean;
  active?: boolean;
}) {
  const elapsed = useLoopTime(CYCLE_MS, { paused: !active, intervalMs: 50 });

  const fadeEnd = elapsed > ms(42000) ? 1 - Math.min((elapsed - ms(42000)) / ms(2000), 1) : 1;

  const showRedeem = elapsed >= REDEEM_START_MS;

  const tapCreate = rangeActive(elapsed, ms(1700), ms(2100));
  const tapSubmit = rangeActive(elapsed, ms(9420), ms(9820));
  const tapShare = rangeActive(elapsed, ms(11600), ms(12000));
  const tapDone = rangeActive(elapsed, ms(13400), ms(13800));

  const drawerOpen = !showRedeem && elapsed >= ms(2200) && elapsed < ms(15000);
  const gcStep: "form" | "done" = elapsed >= ms(11500) && drawerOpen ? "done" : "form";
  const gcLoading = rangeActive(elapsed, ms(9500), ms(11500));

  const gcAmount = elapsed >= ms(3500) ? "25" : "";
  const gcMemo = elapsed >= ms(5000) ? "Thanks for the stream!" : "";
  const gcValidityDays = "90";

  const hasIssuedCard = !showRedeem && elapsed >= ms(15000);

  const giftCardRows: GiftCard[] = hasIssuedCard
    ? [
        {
          id: "demo_gc",
          memo: "Thanks for the stream!",
          amount: 25,
          currency: "USDC",
          status: "active",
          createdAt: Date.now(),
          code: "gfc_demo",
          claimCode: CLAIM_CODE,
        },
      ]
    : [];

  const gcActive = hasIssuedCard ? 1 : 0;
  const gcRedeemed = 0;
  const gcTotalValue = hasIssuedCard ? 25 : 0;

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

  const giftCardColumns = [
    { key: "memo", header: "Note", render: (row: GiftCard) => <span style={{ fontWeight: 500 }}>{row.memo}</span> },
    {
      key: "amount",
      header: "Amount",
      align: "right" as const,
      render: (row: GiftCard) => formatCurrency(row.amount, row.currency),
    },
    {
      key: "status",
      header: "Status",
      render: (row: GiftCard) => statusBadge(row.status),
    },
    {
      key: "claimCode",
      header: "Claim code",
      render: (row: GiftCard) =>
        row.claimCode ? (
          <DCopyField value={row.claimCode} />
        ) : (
          <span style={{ color: "var(--color-text-muted)", fontSize: 13 }}>—</span>
        ),
    },
    { key: "ref", header: "Ref", hideOnMobile: true, render: (row: GiftCard) => <span className="d-mono">{row.code}</span> },
    {
      key: "created",
      header: "Created",
      hideOnMobile: true,
      render: (row: GiftCard) => formatRelativeTime(row.createdAt),
    },
  ];

  const redeemR = elapsed - REDEEM_START_MS;

  return (
    <div
      className={`tiplink-product-demo storefront-demo ${large ? "storefront-demo--large tiplink-product-demo--large" : ""}`}
      style={{ opacity: fadeEnd }}
    >
      <div className="storefront-demo__browser">
        <div className="storefront-demo__chrome">
          <div className="storefront-demo__chrome-dots">
            <span />
            <span />
            <span />
          </div>
          <div className="storefront-demo__url storefront-demo__url--creator">
            {showRedeem ? <Gift aria-hidden="true" size={12} /> : <LayoutDashboard aria-hidden="true" size={12} />}
            <span className="storefront-demo__url-text">
              {showRedeem ? "app.unseen.finance/redeem" : "app.unseen.finance/dashboard/tiplinks"}
            </span>
          </div>
        </div>

        <div className="storefront-demo__surface storefront-demo__surface--tiplink tiplink-product-demo__surface">
          <div className="dashboard-embed-demo__stage">
            {!showRedeem ? (
              <>
                <div className="tiplink-product-demo__dash">
                  <DPageHeader
                    title="Gift cards & Tiplinks"
                    description="Fund gift cards to a treasury wallet; recipients redeem with a code—no Umbra account required."
                  />

                  <DTabs
                    active="giftcards"
                    items={[
                      { id: "giftcards", label: "Gift Cards", count: hasIssuedCard ? 1 : 0 },
                      { id: "tiplinks", label: "Tiplinks", count: 0 },
                    ]}
                    onChange={() => {}}
                  />

                  <div className="d-stat-row tiplink-product-demo__stat-row">
                    <DStatCard icon={Gift} label="Active" value={String(gcActive)} />
                    <DStatCard icon={Copy} label="Redeemed" value={String(gcRedeemed)} />
                    <DStatCard icon={Send} label="Total issued" value={formatCurrency(gcTotalValue, "USDC")} />
                  </div>

                  <div className="d-section-actions d-flex d-flex--between d-flex--align-center tiplink-product-demo__actions">
                    <DButton className={tapCreate ? "tiplink-product-demo__btn--tap" : undefined} icon={Plus} type="button">
                      Create gift card
                    </DButton>
                    <Link className="d-btn d-btn--ghost" href="/redeem" style={{ alignItems: "center", display: "inline-flex", gap: 8 }}>
                      <ExternalLink size={16} /> Recipient redeem page
                    </Link>
                  </div>

                  <p className="tiplink-product-demo__help">
                    Create a gift card: your wallet funds USDC to the treasury, then you get a code to share. Recipients redeem at{" "}
                    <Link href="/redeem">/redeem</Link>.
                  </p>

                  <DTable
                    columns={giftCardColumns}
                    data={giftCardRows}
                    emptyDescription="Create a gift card to get a claim code for your recipient."
                    emptyTitle="No gift cards yet"
                  />
                </div>

                <DDrawer onClose={() => {}} open={drawerOpen} title="Create gift card">
                  {gcStep === "form" ? (
                    <div className="d-drawer-form">
                      <DInput
                        label="Amount (USDC)"
                        onChange={() => {}}
                        placeholder="e.g. 10"
                        type="number"
                        value={gcAmount}
                      />
                      <DInput label="Note (shown to recipient)" onChange={() => {}} placeholder="Happy birthday!" value={gcMemo} />
                      <DInput label="Valid for (days)" onChange={() => {}} placeholder="90" type="number" value={gcValidityDays} />
                      <p className="tiplink-product-demo__drawer-hint">
                        The next step opens your wallet: you&apos;ll send the gift amount plus a small platform fee in USDC on{" "}
                        <strong>devnet</strong>. Your connected wallet must match your merchant wallet.
                      </p>
                      <DButton
                        className={tapSubmit ? "tiplink-product-demo__btn--tap" : undefined}
                        disabled={!gcAmount.trim() || !gcMemo.trim()}
                        loading={gcLoading}
                        type="button"
                      >
                        {gcLoading ? "Confirm in wallet…" : "Create gift card"}
                      </DButton>
                    </div>
                  ) : null}

                  {gcStep === "done" ? (
                    <div className="d-drawer-success">
                      <p className="d-drawer-success__msg">Gift card ready</p>
                      <DCopyField label="Claim code" value={CLAIM_CODE} />
                      <div className="d-flex d-flex--gap-sm" style={{ flexWrap: "wrap", marginTop: 12 }}>
                        <DButton className={tapShare ? "tiplink-product-demo__btn--tap" : undefined} icon={Share2} type="button" variant="secondary">
                          Share
                        </DButton>
                      </div>
                      <p className="tiplink-product-demo__drawer-hint" style={{ marginTop: 12 }}>
                        Recipients redeem at <Link href="/redeem">/redeem</Link>
                      </p>
                      <div style={{ marginTop: 16 }}>
                        <DButton className={tapDone ? "tiplink-product-demo__btn--tap" : undefined} type="button" variant="secondary">
                          Done
                        </DButton>
                      </div>
                    </div>
                  ) : null}
                </DDrawer>
              </>
            ) : (
              <div className="tiplink-product-demo__redeem">
                <RedeemEmbedPhase r={redeemR} />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
