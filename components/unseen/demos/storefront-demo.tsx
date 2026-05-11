"use client";

import { LayoutDashboard, Lock } from "lucide-react";
import { useLoopTime } from "@/components/unseen/demo-utils";
import {
  computeStorefrontCreatorPhase,
  StorefrontCreatorFlowUI,
} from "@/components/unseen/demos/storefront-creator-flow";

const LOOP_MS = 8000;

export default function StorefrontDemo({
  large = false,
  active = true,
}: {
  large?: boolean;
  active?: boolean;
}) {
  const t = useLoopTime(LOOP_MS, { paused: !active });
  const phase = computeStorefrontCreatorPhase(t, LOOP_MS);
  const k = LOOP_MS / 5000;
  const m = (ms: number) => ms * k;

  let urlIcon: "dash" | "store" = "dash";
  let urlText = "app.unseen.finance/dashboard/storefronts";

  if (t >= m(3400)) {
    urlIcon = "store";
    urlText = "urban-youth-co.store.unseen.finance";
  } else if (t >= m(1040)) {
    urlText = "Dashboard · New storefront";
  }

  return (
    <div
      className={`storefront-demo storefront-demo--creator ${large ? "storefront-demo--large" : ""}`}
      style={{ opacity: phase.fade }}
    >
      <div className="storefront-demo__browser">
        <div className="storefront-demo__chrome">
          <div className="storefront-demo__chrome-dots">
            <span />
            <span />
            <span />
          </div>
          <div className="storefront-demo__url storefront-demo__url--creator">
            {urlIcon === "store" ? (
              <Lock aria-hidden="true" size={12} />
            ) : (
              <LayoutDashboard aria-hidden="true" size={12} />
            )}
            <span className="storefront-demo__url-text">{urlText}</span>
          </div>
        </div>

        <div className="storefront-demo__surface storefront-demo__surface--creator">
          <div className="storefront-demo__creator-root">
            <StorefrontCreatorFlowUI phase={phase} />
          </div>
        </div>
      </div>
    </div>
  );
}
