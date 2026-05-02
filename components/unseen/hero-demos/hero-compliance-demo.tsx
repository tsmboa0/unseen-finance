"use client";

import { BadgeCheck, KeyRound, Lock } from "lucide-react";
import {
  phaseProgress,
  typeByProgress,
  useLoopTime,
} from "@/components/unseen/demo-utils";

export default function HeroComplianceDemo({ active = false }: { active?: boolean }) {
  const t = useLoopTime(5000, { paused: !active });

  const reveal =
    t < 1500 ? 0
      : t < 3000 ? phaseProgress(t, 1500, 3000)
        : t < 4000 ? 1
          : 1 - phaseProgress(t, 4000, 4800);

  const values = {
    sender: typeByProgress("9mXP...7kQR", reveal),
    receiver: typeByProgress("4rLM...9xPQ", reveal),
    amount: typeByProgress("14.80 SOL ($2,147)", reveal),
    time: typeByProgress("2026-04-22 14:32", reveal),
  };

  const keyTurning = t >= 1000 && t < 2000;

  return (
    <div className="hd-compliance">
      {/* Public view */}
      <div className="hd-compliance__panel">
        <p className="hd-compliance__label hd-compliance__label--public">
          PUBLIC BLOCKCHAIN VIEW
        </p>
        <CompRow label="Sender" value="[SHIELDED]" shielded />
        <CompRow label="Receiver" value="[SHIELDED]" shielded />
        <CompRow label="Amount" value="[SHIELDED]" shielded />
        <CompRow label="Time" value="2026-04-22 14:32" />
      </div>

      {/* Connector */}
      <div className="hd-compliance__connector">
        <div className={`hd-compliance__connector-line${keyTurning ? " is-pulsing" : ""}`} />
        <div className="hd-compliance__key-wrap">
          <KeyRound
            aria-hidden="true"
            className={keyTurning ? "is-turning" : ""}
            size={13}
          />
        </div>
        <div className={`hd-compliance__connector-line${keyTurning ? " is-pulsing" : ""}`} />
        <span className="hd-compliance__connector-label">Authorized Disclosure</span>
      </div>

      {/* Report */}
      <div className="hd-compliance__panel hd-compliance__panel--report">
        <p className="hd-compliance__label hd-compliance__label--report">
          COMPLIANCE REPORT
        </p>
        <CompRow label="Sender" value={reveal > 0 ? values.sender : "[SHIELDED]"} shielded={reveal === 0} />
        <CompRow label="Receiver" value={reveal > 0 ? values.receiver : "[SHIELDED]"} shielded={reveal === 0} />
        <CompRow label="Amount" value={reveal > 0 ? values.amount : "[SHIELDED]"} shielded={reveal === 0} />
        <CompRow label="Time" value={reveal > 0 ? values.time : "[SHIELDED]"} shielded={reveal === 0} />
        <div
          className="hd-compliance__verified"
          style={{ opacity: reveal > 0.75 ? 1 : 0 }}
        >
          <BadgeCheck aria-hidden="true" size={13} />
          ✓ Verified
        </div>
      </div>
    </div>
  );
}

function CompRow({ label, value, shielded }: { label: string; value: string; shielded?: boolean }) {
  return (
    <div className="hd-compliance__row">
      <span>{label}</span>
      <span className={`hd-compliance__value${shielded ? " is-shielded" : ""}`}>
        {shielded ? <Lock aria-hidden="true" size={9} strokeWidth={2.4} /> : null}
        {value}
      </span>
    </div>
  );
}
