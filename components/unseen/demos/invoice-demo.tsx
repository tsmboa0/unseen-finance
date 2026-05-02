"use client";

import { Check, FileText, LoaderCircle, Lock, Send } from "lucide-react";
import {
  phaseProgress,
  rangeActive,
  typeByProgress,
  useLoopTime,
} from "@/components/unseen/demo-utils";

const CYCLE = 10250;

const INVOICE = {
  number: "INV-2026-0412",
  client: "Acme Corp",
  clientEmail: "ops@acme.xyz",
  items: [
    { name: "Design Sprint · April", amount: "4,200.00" },
    { name: "Frontend Engineering", amount: "8,400.00" },
    { name: "ZK Integration Review", amount: "2,000.00" },
  ],
  subtotal: "14,600.00",
  tax: "200.00",
  total: "14,800.00",
  currency: "USDC",
};

const STEPS = [
  { key: "draft", label: "Draft" },
  { key: "sent", label: "Sent" },
  { key: "viewed", label: "Viewed" },
  { key: "paid", label: "Paid" },
] as const;

export default function InvoiceDemo({
  large = false,
  active = true,
}: {
  large?: boolean;
  active?: boolean;
}) {
  const elapsed = useLoopTime(CYCLE, { paused: !active });

  const clientTyped = typeByProgress(
    INVOICE.client,
    phaseProgress(elapsed, 400, 1200),
  );
  const emailTyped = typeByProgress(
    INVOICE.clientEmail,
    phaseProgress(elapsed, 1000, 1800),
  );
  const rowsVisible = Math.min(
    3,
    Math.floor(phaseProgress(elapsed, 1800, 3200) * 3.3),
  );
  const totalsVisible = elapsed >= 3200;
  const pressing = rangeActive(elapsed, 3800, 3950);
  const sending = rangeActive(elapsed, 3950, 5950);

  const activeStep =
    elapsed < 3800
      ? 0
      : elapsed < 6450
        ? 1
        : elapsed < 7750
          ? 2
          : 3;

  const paid = elapsed >= 7750;

  const entryOpacity =
    elapsed < 300
      ? phaseProgress(elapsed, 0, 300)
      : elapsed >= CYCLE - 400
        ? 1 - phaseProgress(elapsed, CYCLE - 400, CYCLE - 100)
        : 1;

  return (
    <div
      className={`invoice-demo${large ? " invoice-demo--large" : ""}`}
      style={{ opacity: entryOpacity }}
    >
      <div className={`invoice-card${paid ? " invoice-card--paid" : ""}`}>
        <div className="invoice-card__header">
          <div className="invoice-card__brand">
            <span className="invoice-card__logo">
              <FileText aria-hidden="true" size={12} strokeWidth={2.2} />
            </span>
            <div>
              <p className="invoice-card__label">INVOICE</p>
              <p className="invoice-card__number">{INVOICE.number}</p>
            </div>
          </div>
          <div className="invoice-card__amount-head">
            <p className="invoice-card__amount-label">TOTAL</p>
            <p className="invoice-card__amount-value">
              {paid ? (
                <span className="invoice-card__shielded">
                  <Lock aria-hidden="true" size={9} strokeWidth={2.4} />
                  SHIELDED
                </span>
              ) : (
                <>
                  {totalsVisible ? INVOICE.total : "0.00"}{" "}
                  <span className="invoice-card__ccy">{INVOICE.currency}</span>
                </>
              )}
            </p>
          </div>
        </div>

        <div className="invoice-card__client">
          <div>
            <p className="invoice-card__mini-label">BILL TO</p>
            <p className="invoice-card__client-name">
              {clientTyped || "\u00A0"}
              {clientTyped.length < INVOICE.client.length ? (
                <span aria-hidden="true" className="invoice-card__caret" />
              ) : null}
            </p>
            <p className="invoice-card__client-email">
              {emailTyped || "\u00A0"}
            </p>
          </div>
          <div className="invoice-card__date">
            <p className="invoice-card__mini-label">DUE</p>
            <p className="invoice-card__date-value">May 15</p>
          </div>
        </div>

        <div className="invoice-card__items">
          <div className="invoice-card__item-head">
            <span>Description</span>
            <span>Amount</span>
          </div>
          {INVOICE.items.map((item, index) => (
            <div
              className="invoice-card__item"
              key={item.name}
              style={{
                opacity: index < rowsVisible ? 1 : 0,
                transform:
                  index < rowsVisible ? "translateY(0)" : "translateY(4px)",
              }}
            >
              <span className="invoice-card__item-name">{item.name}</span>
              <span className="invoice-card__item-amount">{item.amount}</span>
            </div>
          ))}
        </div>

        <div
          className="invoice-card__totals"
          style={{ opacity: totalsVisible ? 1 : 0 }}
        >
          <div className="invoice-card__totals-row">
            <span>Subtotal</span>
            <span>{INVOICE.subtotal}</span>
          </div>
          <div className="invoice-card__totals-row">
            <span>Tax</span>
            <span>{INVOICE.tax}</span>
          </div>
          <div className="invoice-card__totals-row invoice-card__totals-row--total">
            <span>Total</span>
            <span>
              {INVOICE.total} {INVOICE.currency}
            </span>
          </div>
        </div>

        <button
          className={[
            "invoice-card__send",
            totalsVisible ? "is-live" : "",
            pressing ? "is-pressing" : "",
          ]
            .filter(Boolean)
            .join(" ")}
          tabIndex={-1}
          type="button"
        >
          {sending ? (
            <>
              <LoaderCircle className="gateway-demo__spinner" size={12} strokeWidth={2.4} />
              Sending…
            </>
          ) : paid ? (
            <>
              <Check aria-hidden="true" size={12} strokeWidth={2.6} />
              Paid privately
            </>
          ) : (
            <>
              <Send aria-hidden="true" size={12} strokeWidth={2.4} />
              Send invoice
            </>
          )}
        </button>

        <div className="invoice-card__status">
          {STEPS.map((step, index) => {
            const reached = index <= activeStep;
            const current = index === activeStep;
            return (
              <div
                className={[
                  "invoice-status",
                  reached ? "is-reached" : "",
                  current ? "is-current" : "",
                  step.key === "paid" && paid ? "is-paid" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                key={step.key}
              >
                <span className="invoice-status__dot">
                  {reached ? (
                    <Check aria-hidden="true" size={8} strokeWidth={3} />
                  ) : null}
                </span>
                <span className="invoice-status__label">{step.label}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
