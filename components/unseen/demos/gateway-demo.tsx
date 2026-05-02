"use client";

import { Check, LoaderCircle, Lock } from "lucide-react";
import {
  phaseProgress,
  rangeActive,
  useLoopTime,
} from "@/components/unseen/demo-utils";

const MERCHANT_ROWS = [
  { name: "Phantom Goods", initial: "P", color: "#7B2FFF", network: "Mainnet", volume: "847.2" },
  { name: "Nova Threads", initial: "N", color: "#9333EA", network: "Mainnet", volume: "2,104.8" },
  { name: "Crest Digital", initial: "C", color: "#6D28D9", network: "Mainnet", volume: "14,302.1" },
  { name: "Drift Protocol", initial: "D", color: "#A855F7", network: "Mainnet", volume: "8,891.5" },
  { name: "Void Market", initial: "V", color: "#4A1A8C", network: "Devnet", volume: "223.4" },
  { name: "Cipher Labs", initial: "C", color: "#7C3AED", network: "Mainnet", volume: "5,670.0" },
  { name: "Silent Pay", initial: "S", color: "#8B5CF6", network: "Mainnet", volume: "1,190.3" },
] as const;

// ── Timing map (ms) ──────────────────────────────────────
// 0      – 300   : card fade-in
// 300    – 3600  : checkout screen visible, button active
// 3600   – 3750  : "Pay Privately" press animation
// 3750   – 4300  : "Shielding…" spinner on button
// 3900   – 5900  : cross-fade out checkout → QR
// 5900   – 9700  : QR screen visible, "Paid" button active
// 9700   – 9850  : "Paid" press animation
// 9850   – 11850 : "Processing…" spinner on Paid button
// 11850  – 12150 : cross-fade out QR → success
// 12150  – 16050 : success screen visible
// 16050  – 16650 : card fade-out
// 16650  : loop
const CYCLE = 16650;

export default function GatewayDemo({
  large = false,
  active = true,
}: {
  large?: boolean;
  active?: boolean;
}) {
  const t = useLoopTime(CYCLE, { paused: !active });

  // ── Checkout screen ─────────────────────────────────
  const payButtonLive = t >= 500 && t < 3600;
  const pressingPay = rangeActive(t, 3600, 3750);
  const shieldingPay = rangeActive(t, 3750, 5750);

  // ── QR screen ────────────────────────────────────────
  const paidButtonLive = rangeActive(t, 5900, 9700);
  const pressingPaid = rangeActive(t, 9700, 9850);
  const processingPaid = rangeActive(t, 9850, 11850);

  // ── Success screen ───────────────────────────────────
  const inSuccess = t >= 12150 && t < 16050;

  // ── Per-screen opacities ─────────────────────────────
  const checkoutOpacity =
    t < 5350 ? 1
      : t < 5850 ? 1 - phaseProgress(t, 5350, 5850)
        : 0;

  const qrOpacity =
    t < 5650 ? 0
      : t < 6050 ? phaseProgress(t, 5650, 6050)
        : t < 11850 ? 1
          : t < 12150 ? 1 - phaseProgress(t, 11850, 12150)
            : 0;

  const successOpacity =
    t < 12150 ? 0
      : t < 12450 ? phaseProgress(t, 12150, 12450)
        : t < 16050 ? 1
          : t < 16450 ? 1 - phaseProgress(t, 16050, 16450)
            : 0;

  // ── Card fade in / out ────────────────────────────────
  const cardOpacity =
    t < 300 ? phaseProgress(t, 0, 300)
      : t > 16050 ? 1 - phaseProgress(t, 16050, CYCLE)
        : 1;

  return (
    <div className={`gateway-demo${large ? " gateway-demo--large" : ""}`}>
      {/* ── Animated flow lines (unchanged) ─────────────── */}
      <svg
        aria-hidden="true"
        className="gateway-demo__flow"
        preserveAspectRatio="none"
        viewBox="0 0 100 100"
      >
        <defs>
          <linearGradient id="gateway-flow-grad" x1="0%" x2="100%" y1="0%" y2="0%">
            <stop offset="0%" stopColor="rgba(168,85,247,0)" />
            <stop offset="35%" stopColor="rgba(168,85,247,0.5)" />
            <stop offset="65%" stopColor="rgba(168,85,247,0.5)" />
            <stop offset="100%" stopColor="rgba(168,85,247,0)" />
          </linearGradient>
        </defs>
        {[
          { d: "M 32 30 Q 50 30 68 34", delay: "0s" },
          { d: "M 32 52 Q 50 52 68 50", delay: "0.5s" },
          { d: "M 32 74 Q 50 74 68 70", delay: "1s" },
        ].map((line) => (
          <g key={line.d}>
            <path className="gateway-demo__flow-base" d={line.d} vectorEffect="non-scaling-stroke" />
            <path className="gateway-demo__flow-dash" d={line.d} style={{ animationDelay: line.delay }} vectorEffect="non-scaling-stroke" />
          </g>
        ))}
      </svg>

      {/* ── LEFT PANEL: Hoodie checkout demo ─────────────── */}
      <div className="gateway-demo__panel gateway-demo__panel--left">
        <div
          className={`gateway-checkout${inSuccess ? " gateway-checkout--glow" : ""}`}
          style={{ opacity: cardOpacity }}
        >

          {/* SCREEN 1 – Product checkout */}
          <div
            className="gateway-checkout__screen"
            style={{ opacity: checkoutOpacity, pointerEvents: checkoutOpacity > 0.5 ? undefined : "none" }}
          >
            <div className="gateway-checkout__merchant">
              <span className="gateway-checkout__avatar gateway-checkout__avatar--youth">Y</span>
              <div className="gateway-checkout__merchant-meta">
                <p className="gateway-checkout__name">YOUTH</p>
                <p className="gateway-checkout__tag">SHIELDED CHECKOUT</p>
              </div>
            </div>

            <div className="gateway-checkout__hoodie">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/hoodie.png" alt="Classic Hoodie" className="gateway-checkout__hoodie-img" />
            </div>

            <div className="gateway-checkout__product">
              <div className="gateway-checkout__product-row">
                <span className="gateway-checkout__product-name">Classic Hoodie</span>
                <span className="gateway-checkout__product-price">$89.00</span>
              </div>
              <div className="gateway-checkout__product-meta">
                <span className="gateway-checkout__size-badge">M</span>
                <span className="gateway-checkout__product-desc">Limited drop · Midnight Black</span>
              </div>
            </div>

            <button
              className={[
                "gateway-checkout__button",
                payButtonLive ? "is-live" : "",
                pressingPay ? "is-pressing" : "",
              ].filter(Boolean).join(" ")}
              tabIndex={-1}
              type="button"
            >
              {shieldingPay ? (
                <>
                  <LoaderCircle aria-hidden="true" className="gateway-checkout__spinner" size={10} strokeWidth={2.4} />
                  Shielding…
                </>
              ) : (
                <>
                  <Lock aria-hidden="true" size={10} strokeWidth={2.4} />
                  Pay Privately
                </>
              )}
            </button>
          </div>

          {/* SCREEN 2 – QR code */}
          <div
            className="gateway-checkout__screen gateway-checkout__screen--abs"
            style={{ opacity: qrOpacity, pointerEvents: qrOpacity > 0.5 ? undefined : "none" }}
          >
            <div className="gateway-checkout__merchant">
              <span className="gateway-checkout__avatar gateway-checkout__avatar--youth">Y</span>
              <div className="gateway-checkout__merchant-meta">
                <p className="gateway-checkout__name">YOUTH</p>
                <p className="gateway-checkout__tag">SCAN TO PAY</p>
              </div>
            </div>

            <div className="gateway-checkout__qr-wrap">
              <p className="gateway-checkout__qr-amount">$89.00</p>
              <div className="gateway-checkout__qr-box">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/qr-code.png" alt="Payment QR Code" className="gateway-checkout__qr-img" />
                <div className="gateway-checkout__qr-corner gateway-checkout__qr-corner--tl" />
                <div className="gateway-checkout__qr-corner gateway-checkout__qr-corner--tr" />
                <div className="gateway-checkout__qr-corner gateway-checkout__qr-corner--bl" />
                <div className="gateway-checkout__qr-corner gateway-checkout__qr-corner--br" />
              </div>
              <p className="gateway-checkout__qr-caption">Scan to pay · wallet app</p>
              <p className="gateway-checkout__qr-private">🔒 Amount hidden from public ledger</p>
            </div>

            <button
              className={[
                "gateway-checkout__button",
                paidButtonLive ? "is-live" : "",
                pressingPaid ? "is-pressing" : "",
              ].filter(Boolean).join(" ")}
              tabIndex={-1}
              type="button"
            >
              {processingPaid ? (
                <>
                  <LoaderCircle className="gateway-demo__spinner" size={13} />
                  Processing...
                </>
              ) : (
                <>
                  <Check aria-hidden="true" size={10} strokeWidth={2.4} />
                  I have paid
                </>
              )}
            </button>
          </div>

          {/* SCREEN 3 – Success */}
          <div
            aria-hidden={!inSuccess}
            className="gateway-checkout__body gateway-checkout__body--success"
            style={{ opacity: successOpacity, pointerEvents: "none" }}
          >
            {inSuccess ? (
              <span className="gateway-checkout__check" key="check-youth">
                <Check aria-hidden="true" size={16} strokeWidth={3} />
              </span>
            ) : (
              <span aria-hidden="true" className="gateway-checkout__check gateway-checkout__check--placeholder" />
            )}
            <p className="gateway-checkout__success-title">Payment Confirmed</p>
            <p className="gateway-checkout__success-merchant">YOUTH</p>
            <div className="gateway-checkout__success-divider" />
            <div className="gateway-checkout__success-rows">
              <div className="gateway-checkout__success-row">
                <span className="gateway-checkout__success-label">Item</span>
                <span className="gateway-checkout__success-value">Hoodie · M</span>
              </div>
              <div className="gateway-checkout__success-row">
                <span className="gateway-checkout__success-label">Amount</span>
                <span className="gateway-checkout__private-badge">
                  <Lock aria-hidden="true" size={7} strokeWidth={2.4} />
                  PRIVATE
                </span>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* ── Divider (unchanged) ──────────────────────────── */}
      <div aria-hidden="true" className="gateway-demo__divider" />

      {/* ── RIGHT PANEL: merchant dashboard (completely unchanged) ─── */}
      <div className="gateway-demo__panel gateway-demo__panel--right">
        <div className="gateway-browser" aria-hidden="true">
          <div className="gateway-browser__dots">
            <span /><span /><span />
          </div>
          <div className="gateway-browser__url">
            <Lock size={8} strokeWidth={2.4} />
            <span>dashboard.unseenfi.com</span>
          </div>
          <div className="gateway-browser__spacer" />
        </div>
        <div className="gateway-dashboard">
          <p className="gateway-dashboard__title">Connected Merchants</p>
          <div className="gateway-dashboard__columns">
            <span>Merchant</span>
            <span>Network</span>
            <span>Volume (SOL)</span>
          </div>
          <div className="gateway-dashboard__rows">
            {MERCHANT_ROWS.map((row) => (
              <div className="gateway-dashboard__row" key={row.name}>
                <div className="gateway-dashboard__merchant">
                  <span
                    className="gateway-dashboard__avatar"
                    style={{ background: row.color }}
                  >
                    {row.initial}
                  </span>
                  <span className="gateway-dashboard__name">{row.name}</span>
                </div>
                <span
                  className={`gateway-dashboard__network${row.network === "Devnet" ? " gateway-dashboard__network--devnet" : ""
                    }`}
                >
                  {row.network}
                </span>
                <span className="gateway-dashboard__volume">{row.volume}</span>
              </div>
            ))}
          </div>
          <p className="gateway-dashboard__summary">
            7 merchants · 33,233.3 SOL total volume
          </p>
        </div>
      </div>
    </div>
  );
}
