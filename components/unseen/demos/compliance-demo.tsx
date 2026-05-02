"use client";

import { BadgeCheck, KeyRound, Lock } from "lucide-react";
import { phaseProgress, typeByProgress, useLoopTime } from "@/components/unseen/demo-utils";

export default function ComplianceDemo({
  large = false,
  active = true,
}: {
  large?: boolean;
  active?: boolean;
}) {
  const elapsed = useLoopTime(8000, { paused: !active });
  const reveal =
    elapsed < 3000
      ? 0
      : elapsed < 5000
        ? phaseProgress(elapsed, 3000, 5000)
        : elapsed < 6500
          ? 1
          : 1 - phaseProgress(elapsed, 6500, 7500);

  const values = {
    sender: typeByProgress("9mXP...7kQR", reveal),
    receiver: typeByProgress("4rLM...9xPQ", reveal),
    amount: typeByProgress("14.80 SOL ($2,147.60)", reveal),
    time: typeByProgress("2026-04-22 14:32 UTC", reveal),
  };

  return (
    <div className={`compliance-demo ${large ? "compliance-demo--large" : ""}`}>
      <div className="compliance-demo__panel">
        <p className="compliance-demo__label compliance-demo__label--public">
          PUBLIC BLOCKCHAIN VIEW
        </p>
        <ComplianceRow label="Sender" value="[SHIELDED]" />
        <ComplianceRow label="Receiver" value="[SHIELDED]" />
        <ComplianceRow label="Amount" value="[SHIELDED]" />
        <ComplianceRow label="Time" value="2026-04-22 14:32 UTC" />
      </div>

      <div className="compliance-demo__connector">
        <div
          className={`compliance-demo__connector-line ${
            elapsed >= 2000 && elapsed < 3200 ? "is-pulsing" : ""
          }`}
        />
        <div className="compliance-demo__key-wrap">
          <KeyRound
            aria-hidden="true"
            className={`compliance-demo__key ${
              elapsed >= 2000 && elapsed < 3200 ? "is-turning" : ""
            }`}
            size={14}
          />
        </div>
        <div
          className={`compliance-demo__connector-line ${
            elapsed >= 2000 && elapsed < 3200 ? "is-pulsing" : ""
          }`}
        />
        <span className="compliance-demo__connector-copy">Authorized Disclosure</span>
      </div>

      <div className="compliance-demo__panel compliance-demo__panel--report">
        <p className="compliance-demo__label compliance-demo__label--report">
          COMPLIANCE REPORT · AUTHORIZED
        </p>
        <div
          className="compliance-demo__watermark"
          style={{ opacity: reveal > 0.3 ? 1 : 0 }}
        >
          AUTHORIZED DISCLOSURE
        </div>
        <ComplianceRow label="Sender" value={reveal > 0 ? values.sender : "[SHIELDED]"} />
        <ComplianceRow
          label="Receiver"
          value={reveal > 0 ? values.receiver : "[SHIELDED]"}
        />
        <ComplianceRow label="Amount" value={reveal > 0 ? values.amount : "[SHIELDED]"} />
        <ComplianceRow label="Time" value={reveal > 0 ? values.time : "[SHIELDED]"} />
        <div
          className="compliance-demo__verified"
          style={{
            opacity: reveal > 0.75 ? 1 : 0,
            transform: `scale(${0.92 + reveal * 0.08})`,
          }}
        >
          <BadgeCheck aria-hidden="true" size={14} />
          ✓ Verified
        </div>
      </div>
    </div>
  );
}

function ComplianceRow({ label, value }: { label: string; value: string }) {
  const shielded = value === "[SHIELDED]";

  return (
    <div className="compliance-demo__row">
      <span>{label}</span>
      <span className={`compliance-demo__value ${shielded ? "is-shielded" : ""}`}>
        {shielded ? <Lock aria-hidden="true" size={12} /> : null}
        {value}
      </span>
    </div>
  );
}
