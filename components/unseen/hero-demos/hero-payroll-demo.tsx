"use client";

import { Check, LoaderCircle, Shield } from "lucide-react";
import {
  phaseProgress,
  rangeActive,
  useLoopTime,
} from "@/components/unseen/demo-utils";

const RECIPIENTS = [
  { initials: "AM", name: "Alex M.", amount: "4,200" },
  { initials: "JK", name: "Jordan K.", amount: "3,800" },
  { initials: "ST", name: "Sam T.", amount: "5,100" },
  { initials: "RP", name: "Riley P.", amount: "2,900" },
] as const;

export default function HeroPayrollDemo({ active = false }: { active?: boolean }) {
  const t = useLoopTime(5000, { paused: !active });

  const pressing = rangeActive(t, 800, 950);
  const processing = rangeActive(t, 950, 1800);
  const completedCount =
    t < 1800 ? 0 : Math.min(4, Math.floor((t - 1800) / 400) + 1);
  const allDone = completedCount >= 4;
  const fade = t > 4500 ? 1 - phaseProgress(t, 4500, 4900) : 1;

  return (
    <div className="hd-payroll" style={{ opacity: fade }}>
      <div className="hd-payroll__header">
        <div>
          <p className="hd-payroll__eyebrow">UNSEEN PAYROLL</p>
          <p className="hd-payroll__period">April 2026</p>
        </div>
        <span className="hd-payroll__badge">4 recipients</span>
      </div>

      <div className="hd-payroll__list">
        {RECIPIENTS.map((person, index) => {
          const done = completedCount > index;
          return (
            <div
              className={`hd-payroll__row${done ? " is-done" : ""}`}
              key={person.initials}
            >
              <span className="hd-payroll__avatar">{person.initials}</span>
              <div className="hd-payroll__info">
                <span className="hd-payroll__name">{person.name}</span>
                <span className="hd-payroll__amt">{person.amount} USDC</span>
              </div>
              <span className="hd-payroll__status">
                {done ? (
                  <Check size={13} strokeWidth={2.6} />
                ) : (
                  <Shield size={13} strokeWidth={1.8} />
                )}
              </span>
            </div>
          );
        })}
      </div>

      <button
        className={`hd-payroll__button${pressing ? " is-pressing" : ""}${allDone ? " is-complete" : ""}`}
        type="button"
      >
        {processing ? (
          <>
            <LoaderCircle className="gateway-demo__spinner" size={13} />
            Processing...
          </>
        ) : allDone ? (
          <>
            <Check size={13} strokeWidth={2.6} />
            Payroll Complete
          </>
        ) : (
          "Run Payroll"
        )}
      </button>

      {allDone ? (
        <p className="hd-payroll__footer">
          ◆ $0 visible on-chain · 4 payments shielded
        </p>
      ) : null}
    </div>
  );
}
