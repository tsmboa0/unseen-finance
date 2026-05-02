"use client";

import { Check, LoaderCircle, Shield } from "lucide-react";
import { rangeActive, useLoopTime } from "@/components/unseen/demo-utils";

const RECIPIENTS = ["Alex M.", "Jordan K.", "Sam T.", "Riley P."] as const;

export default function PayrollDemo({
  large = false,
  active = true,
}: {
  large?: boolean;
  active?: boolean;
}) {
  const elapsed = useLoopTime(10650, { paused: !active });
  const fade =
    elapsed > 9150 ? 1 - Math.min((elapsed - 9150) / 1500, 1) : 1;
  
  const pressing = rangeActive(elapsed, 2000, 2150);
  const processing = rangeActive(elapsed, 2150, 4150);

  const completedCount =
    elapsed < 4150 ? 0 : Math.min(4, Math.floor((elapsed - 4150) / 500) + 1);
  const activeRow = rangeActive(elapsed, 4150, 6150)
    ? Math.floor((elapsed - 4150) / 500)
    : -1;

  const allDone = completedCount >= 4;

  return (
    <div
      className={`payroll-demo ${large ? "payroll-demo--large" : ""}`}
      style={{ opacity: fade }}
    >
      <div className="payroll-demo__header">
        <span>Payroll — April 2026</span>
        <span>4 recipients</span>
      </div>
      <div className="payroll-demo__list">
        {RECIPIENTS.map((person, index) => {
          const completed = completedCount > index;
          const active = activeRow === index;

          return (
            <div
              className={`payroll-demo__row ${completed ? "is-complete" : ""} ${
                active ? "is-active" : ""
              }`}
              key={person}
            >
              <span className="payroll-demo__avatar">
                {person
                  .split(" ")
                  .map((segment) => segment[0])
                  .join("")}
              </span>
              <span className="payroll-demo__name">{person}</span>
              <span className="payroll-demo__amount">••••• SOL</span>
              <span className="payroll-demo__status">
                {completed ? <Check size={14} /> : <Shield size={14} />}
              </span>
            </div>
          );
        })}
      </div>
      <div className="payroll-demo__divider" />
      <button
        className={`payroll-demo__button ${pressing ? "is-pressed" : ""} ${allDone ? "is-complete" : ""}`}
        type="button"
      >
        {processing ? (
          <>
            <LoaderCircle className="gateway-demo__spinner" size={14} />
            Processing...
          </>
        ) : allDone ? (
          <>
            <Check size={14} strokeWidth={2.5} />
            Payroll Complete
          </>
        ) : (
          "Run Payroll"
        )}
      </button>

      {elapsed >= 7150 ? (
        <div className="payroll-demo__summary">
          <div className="payroll-demo__confetti">
            <span />
            <span />
            <span />
            <span />
            <span />
          </div>
          <p>4 payments dispatched</p>
          <p className="payroll-demo__summary-accent">$0 visible on-chain</p>
        </div>
      ) : null}
    </div>
  );
}
