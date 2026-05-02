"use client";

import { Check, LoaderCircle, Lock } from "lucide-react";
import {
  phaseProgress,
  rangeActive,
  useLoopTime,
} from "@/components/unseen/demo-utils";

export default function HeroGatewayDemo({ active = false }: { active?: boolean }) {
  const t = useLoopTime(5000, { paused: !active });

  const pressing   = rangeActive(t, 1200, 1350);
  const processing = rangeActive(t, 1350, 2100);
  const showQR     = t >= 2100 && t < 3400;
  const success    = t >= 3400;
  const fade       = t > 4500 ? 1 - phaseProgress(t, 4500, 4900) : 1;

  const showProduct  = t < 2100;

  return (
    <div className="hd-gateway" style={{ opacity: fade }}>

      {/* ── SCREEN 1: Product + checkout ── */}
      <div
        className="hd-gateway__view"
        style={{ opacity: showProduct ? 1 : 0, pointerEvents: showProduct ? "auto" : "none" }}
      >
        {/* Merchant header */}
        <div className="hd-gateway__merchant">
          <span className="hd-gateway__avatar">Y</span>
          <div>
            <p className="hd-gateway__merchant-name">YOUTH</p>
            <p className="hd-gateway__merchant-tag">SHIELDED CHECKOUT</p>
          </div>
        </div>

        {/* Product image */}
        <div className="hd-gateway__img-wrap">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img alt="Classic Hoodie" className="hd-gateway__img" src="/hoodie.png" />
        </div>

        {/* Product info */}
        <div className="hd-gateway__product-row">
          <div>
            <p className="hd-gateway__product-name">Classic Hoodie</p>
            <p className="hd-gateway__product-meta">Limited drop · Midnight Black</p>
          </div>
          <p className="hd-gateway__product-price">$89.00</p>
        </div>

        {/* Size badge */}
        <div className="hd-gateway__meta-row">
          <span className="hd-gateway__size-badge">M</span>
          <span className="hd-gateway__qty-badge">Qty: 1</span>
        </div>

        {/* Pay button */}
        <button
          className={`hd-gateway__pay${pressing ? " is-pressing" : ""}`}
          type="button"
        >
          {processing ? (
            <>
              <LoaderCircle className="gateway-demo__spinner" size={13} />
              Shielding…
            </>
          ) : (
            <>
              <Lock aria-hidden="true" size={11} strokeWidth={2.4} />
              Pay Privately · $89.00
            </>
          )}
        </button>

        <p className="hd-gateway__shield-note">◆ Zero-knowledge shielded on Solana</p>
      </div>

      {/* ── SCREEN 2: QR Code ── */}
      <div
        className="hd-gateway__qr-screen"
        style={{ opacity: showQR ? 1 : 0, pointerEvents: showQR ? "auto" : "none" }}
      >
        <div className="hd-gateway__merchant hd-gateway__merchant--qr">
          <span className="hd-gateway__avatar">Y</span>
          <div>
            <p className="hd-gateway__merchant-name">YOUTH</p>
            <p className="hd-gateway__merchant-tag">SCAN TO PAY</p>
          </div>
        </div>
        <p className="hd-gateway__qr-amount">$89.00</p>
        <div className="hd-gateway__qr-wrap">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img alt="QR Code" className="hd-gateway__qr-img" src="/qr-code.png" />
          <div className="hd-gateway__qr-corner hd-gateway__qr-corner--tl" />
          <div className="hd-gateway__qr-corner hd-gateway__qr-corner--tr" />
          <div className="hd-gateway__qr-corner hd-gateway__qr-corner--bl" />
          <div className="hd-gateway__qr-corner hd-gateway__qr-corner--br" />
        </div>
        <p className="hd-gateway__qr-hint">Open your wallet and scan</p>
        <p className="hd-gateway__qr-private">🔒 Amount hidden from public ledger</p>
      </div>

      {/* ── SCREEN 3: Success ── */}
      <div
        className="hd-gateway__success"
        style={{ opacity: success ? 1 : 0, pointerEvents: success ? "auto" : "none" }}
      >
        <span className="hd-gateway__check">
          <Check aria-hidden="true" size={20} strokeWidth={3} />
        </span>
        <p className="hd-gateway__success-title">Payment Confirmed</p>
        <p className="hd-gateway__success-sub">Transaction shielded 🛡</p>
        <div className="hd-gateway__success-card">
          <div className="hd-gateway__success-row">
            <span>Item</span>
            <span>Classic Hoodie · M</span>
          </div>
          <div className="hd-gateway__success-divider" />
          <div className="hd-gateway__success-row">
            <span>Amount</span>
            <span className="hd-gateway__private">
              <Lock aria-hidden="true" size={8} strokeWidth={2.4} />
              PRIVATE
            </span>
          </div>
          <div className="hd-gateway__success-row">
            <span>Merchant</span>
            <span>YOUTH</span>
          </div>
        </div>
      </div>
    </div>
  );
}
