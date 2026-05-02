"use client";

import { Check, FileText, LoaderCircle, Lock, Send } from "lucide-react";
import {
  phaseProgress,
  rangeActive,
  typeByProgress,
  useLoopTime,
} from "@/components/unseen/demo-utils";

const ITEMS = [
  { name: "Design Sprint · April", amount: "4,200.00" },
  { name: "Frontend Engineering", amount: "8,400.00" },
  { name: "ZK Integration Review", amount: "2,000.00" },
] as const;

export default function HeroInvoiceDemo({ active = false }: { active?: boolean }) {
  const t = useLoopTime(5000, { paused: !active });

  const clientTyped = typeByProgress("Acme Corp", phaseProgress(t, 200, 700));
  const rowsVisible = Math.min(3, Math.floor(phaseProgress(t, 700, 1600) * 3.3));
  const totalsVisible = t >= 1600;
  const pressing = rangeActive(t, 2000, 2150);
  const sending = rangeActive(t, 2150, 3200);

  const activeStep =
    t < 2000 ? 0
      : t < 3400 ? 1
        : t < 3900 ? 2
          : 3;
  const paid = activeStep >= 3;
  const fade = t > 4500 ? 1 - phaseProgress(t, 4500, 4900) : 1;

  return (
    <div className="hd-invoice" style={{ opacity: fade }}>
      <div className="hd-invoice__header">
        <div className="hd-invoice__brand">
          <span className="hd-invoice__logo">
            <FileText aria-hidden="true" size={11} strokeWidth={2.2} />
          </span>
          <div>
            <p className="hd-invoice__label">INVOICE</p>
            <p className="hd-invoice__number">INV-2026-0412</p>
          </div>
        </div>
        <div className="hd-invoice__total-head">
          <p className="hd-invoice__total-label">TOTAL</p>
          <p className="hd-invoice__total-value">
            {paid ? (
              <span className="hd-invoice__shielded">
                <Lock aria-hidden="true" size={8} strokeWidth={2.4} />
                SHIELDED
              </span>
            ) : (
              <>{totalsVisible ? "14,600.00" : "0.00"} <span className="hd-invoice__ccy">USDC</span></>
            )}
          </p>
        </div>
      </div>

      <div className="hd-invoice__client">
        <p className="hd-invoice__mini-label">BILL TO</p>
        <p className="hd-invoice__client-name">
          {clientTyped || "\u00A0"}
          {clientTyped.length < 9 ? (
            <span className="hd-invoice__caret" aria-hidden="true" />
          ) : null}
        </p>
      </div>

      <div className="hd-invoice__items">
        <div className="hd-invoice__item-head">
          <span>Description</span>
          <span>Amount</span>
        </div>
        {ITEMS.map((item, index) => (
          <div
            className="hd-invoice__item"
            key={item.name}
            style={{ opacity: index < rowsVisible ? 1 : 0 }}
          >
            <span>{item.name}</span>
            <span>{item.amount}</span>
          </div>
        ))}
      </div>

      <button
        className={`hd-invoice__send${pressing ? " is-pressing" : ""}${paid ? " is-paid" : ""}`}
        type="button"
      >
        {sending ? (
          <>
            <LoaderCircle className="gateway-demo__spinner" size={12} />
            Sending…
          </>
        ) : paid ? (
          <>
            <Check aria-hidden="true" size={12} strokeWidth={2.6} />
            Paid privately
          </>
        ) : (
          <>
            <Send aria-hidden="true" size={12} />
            Send invoice
          </>
        )}
      </button>

      <div className="hd-invoice__steps">
        {["Draft", "Sent", "Viewed", "Paid"].map((label, index) => (
          <div
            className={`hd-invoice__step${index <= activeStep ? " is-reached" : ""}${index === activeStep ? " is-current" : ""}`}
            key={label}
          >
            <span className="hd-invoice__step-dot">
              {index <= activeStep ? <Check aria-hidden="true" size={7} strokeWidth={3} /> : null}
            </span>
            <span className="hd-invoice__step-label">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
