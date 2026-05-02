"use client";

import {
  Check,
  ChevronDown,
  Copy,
  LoaderCircle,
  Share2,
  Wallet,
} from "lucide-react";
import {
  phaseProgress,
  rangeActive,
  typeByProgress,
  useLoopTime,
} from "@/components/unseen/demo-utils";

const CYCLE = 10150;
const DESCRIPTION = "Thanks for the coffee ☕";
const TIP_LINK = "unseen.fi/t/a7xK2m";

export default function TiplinkDemo({
  large = false,
  active = true,
}: {
  large?: boolean;
  active?: boolean;
}) {
  const elapsed = useLoopTime(CYCLE, { paused: !active });

  const walletSelected = elapsed >= 1400;
  const amountFilled = elapsed >= 2600;
  const descTyped = typeByProgress(
    DESCRIPTION,
    phaseProgress(elapsed, 3200, 4400),
  );
  const pressing = rangeActive(elapsed, 4800, 4950);
  const generating = rangeActive(elapsed, 4950, 6950);
  const success = elapsed >= 6950;
  const copied = rangeActive(elapsed, 7950, 8950);

  const entryOpacity =
    elapsed < 300
      ? phaseProgress(elapsed, 0, 300)
      : elapsed >= CYCLE - 400
        ? 1 - phaseProgress(elapsed, CYCLE - 400, CYCLE - 100)
        : 1;

  return (
    <div
      className={`tiplink-demo${large ? " tiplink-demo--large" : ""}`}
      style={{ opacity: entryOpacity }}
    >
      <div className="tiplink-phone">
        <span aria-hidden="true" className="tiplink-phone__notch" />
        <div className="tiplink-phone__screen">
          <div className="tiplink-phone__statusbar" aria-hidden="true">
            <span>9:41</span>
            <span className="tiplink-phone__statusbar-right">
              <span className="tiplink-phone__signal" />
              <span className="tiplink-phone__battery" />
            </span>
          </div>

          <div
            className="tiplink-phone__body"
            style={{ opacity: success ? 0 : 1 }}
          >
            <p className="tiplink-phone__eyebrow">◈ UNSEEN TIP</p>
            <h4 className="tiplink-phone__title">Send a private tip</h4>

            <label className="tiplink-phone__field-label">From wallet</label>
            <div
              className={`tiplink-phone__wallet${walletSelected ? " is-selected" : ""}`}
            >
              <span className="tiplink-phone__wallet-avatar">
                <Wallet aria-hidden="true" size={11} strokeWidth={2.4} />
              </span>
              <span className="tiplink-phone__wallet-text">
                {walletSelected ? "Phantom · 7xKP...3mR2" : "Select wallet"}
              </span>
              <ChevronDown
                aria-hidden="true"
                className="tiplink-phone__chevron"
                size={11}
                strokeWidth={2.4}
              />
            </div>

            <label className="tiplink-phone__field-label">Amount</label>
            <div className="tiplink-phone__amount">
              <span className="tiplink-phone__amount-value">
                {amountFilled ? "5" : "0"}
              </span>
              <span className="tiplink-phone__amount-unit">SOL</span>
              <span className="tiplink-phone__amount-usd">
                {amountFilled ? "≈ $725" : "≈ $0"}
              </span>
            </div>

            <label className="tiplink-phone__field-label">Description</label>
            <div className="tiplink-phone__description">
              <span>{descTyped || "\u00A0"}</span>
              {!success && descTyped.length < DESCRIPTION.length && amountFilled ? (
                <span aria-hidden="true" className="tiplink-phone__caret" />
              ) : null}
            </div>

            <button
              className={[
                "tiplink-phone__button",
                descTyped.length === DESCRIPTION.length ? "is-live" : "",
                pressing ? "is-pressing" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              tabIndex={-1}
              type="button"
            >
              {generating ? (
                <>
                  <LoaderCircle
                    aria-hidden="true"
                    className="gateway-demo__spinner"
                    size={12}
                    strokeWidth={2.4}
                  />
                  Generating…
                </>
              ) : (
                "Generate Tip Link"
              )}
            </button>
          </div>

          <div
            aria-hidden={!success}
            className="tiplink-phone__success"
            style={{ opacity: success ? 1 : 0 }}
          >
            {success ? (
              <span
                className="tiplink-phone__check"
                key={`check-${Math.floor(elapsed / CYCLE)}`}
              >
                <Check aria-hidden="true" size={18} strokeWidth={3} />
              </span>
            ) : (
              <span
                aria-hidden="true"
                className="tiplink-phone__check tiplink-phone__check--placeholder"
              />
            )}
            <p className="tiplink-phone__success-title">Tip Link ready</p>
            <p className="tiplink-phone__success-sub">
              Share privately with anyone.
            </p>

            <div className="tiplink-phone__link-card">
              <p className="tiplink-phone__link-label">YOUR LINK</p>
              <p className="tiplink-phone__link-url">{TIP_LINK}</p>
            </div>

            <div className="tiplink-phone__actions">
              <button
                className={`tiplink-phone__action${copied ? " is-done" : ""}`}
                tabIndex={-1}
                type="button"
              >
                {copied ? (
                  <>
                    <Check aria-hidden="true" size={11} strokeWidth={2.6} />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy aria-hidden="true" size={11} strokeWidth={2.4} />
                    Copy
                  </>
                )}
              </button>
              <button
                className="tiplink-phone__action tiplink-phone__action--primary"
                tabIndex={-1}
                type="button"
              >
                <Share2 aria-hidden="true" size={11} strokeWidth={2.4} />
                Share
              </button>
            </div>

            <p className="tiplink-phone__shielded">
              ◆ Amount shielded · Identity hidden
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
