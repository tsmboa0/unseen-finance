"use client";

import { Check, ChevronDown, Copy, LoaderCircle, Share2, Wallet } from "lucide-react";
import {
  phaseProgress,
  rangeActive,
  typeByProgress,
  useLoopTime,
} from "@/components/unseen/demo-utils";

const DESCRIPTION = "Thanks for the coffee ☕";

export default function HeroTiplinkDemo({ active = false }: { active?: boolean }) {
  const t = useLoopTime(5000, { paused: !active });

  const walletSelected = t >= 400;
  const amountFilled = t >= 900;
  const descTyped = typeByProgress(DESCRIPTION, phaseProgress(t, 1100, 2100));
  const pressing = rangeActive(t, 2300, 2450);
  const generating = rangeActive(t, 2450, 3200);
  const success = t >= 3200;
  const copied = rangeActive(t, 3800, 4400);
  const fade = t > 4500 ? 1 - phaseProgress(t, 4500, 4900) : 1;

  return (
    <div className="hd-tiplink" style={{ opacity: fade }}>
      {/* Form */}
      <div
        className="hd-tiplink__form"
        style={{ opacity: success ? 0 : 1 }}
      >
        <p className="hd-tiplink__eyebrow">◈ UNSEEN TIP</p>
        <h4 className="hd-tiplink__title">Send a private tip</h4>

        <label className="hd-tiplink__label">From wallet</label>
        <div className={`hd-tiplink__wallet${walletSelected ? " is-selected" : ""}`}>
          <Wallet aria-hidden="true" size={11} strokeWidth={2.4} />
          <span>{walletSelected ? "Phantom · 7xKP...3mR2" : "Select wallet"}</span>
          <ChevronDown aria-hidden="true" size={11} />
        </div>

        <label className="hd-tiplink__label">Amount</label>
        <div className="hd-tiplink__amount">
          <span className="hd-tiplink__amount-val">{amountFilled ? "5" : "0"}</span>
          <span className="hd-tiplink__amount-unit">SOL</span>
          <span className="hd-tiplink__amount-usd">
            {amountFilled ? "≈ $725" : "≈ $0"}
          </span>
        </div>

        <label className="hd-tiplink__label">Description</label>
        <div className="hd-tiplink__desc">
          <span>{descTyped || "\u00A0"}</span>
          {!success && descTyped.length < DESCRIPTION.length && amountFilled ? (
            <span className="hd-tiplink__caret" aria-hidden="true" />
          ) : null}
        </div>

        <button
          className={`hd-tiplink__button${pressing ? " is-pressing" : ""}`}
          type="button"
        >
          {generating ? (
            <>
              <LoaderCircle className="gateway-demo__spinner" size={12} />
              Generating…
            </>
          ) : (
            "Generate Tip Link"
          )}
        </button>
      </div>

      {/* Success */}
      <div
        className="hd-tiplink__success"
        style={{ opacity: success ? 1 : 0 }}
      >
        <span className="hd-tiplink__check">
          <Check aria-hidden="true" size={18} strokeWidth={3} />
        </span>
        <p className="hd-tiplink__success-title">Tip Link ready</p>
        <p className="hd-tiplink__success-sub">Share privately with anyone.</p>

        <div className="hd-tiplink__link-card">
          <p className="hd-tiplink__link-label">YOUR LINK</p>
          <p className="hd-tiplink__link-url">unseen.fi/t/a7xK2m</p>
        </div>

        <div className="hd-tiplink__actions">
          <button
            className={`hd-tiplink__action${copied ? " is-done" : ""}`}
            type="button"
          >
            {copied ? (
              <>
                <Check aria-hidden="true" size={11} strokeWidth={2.6} />
                Copied
              </>
            ) : (
              <>
                <Copy aria-hidden="true" size={11} />
                Copy
              </>
            )}
          </button>
          <button className="hd-tiplink__action hd-tiplink__action--primary" type="button">
            <Share2 aria-hidden="true" size={11} />
            Share
          </button>
        </div>

        <p className="hd-tiplink__shielded">◆ Amount shielded · Identity hidden</p>
      </div>
    </div>
  );
}
