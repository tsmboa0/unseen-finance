"use client";

import { ArrowRight, LoaderCircle, Zap } from "lucide-react";
import {
  phaseProgress,
  rangeActive,
  useLoopTime,
} from "@/components/unseen/demo-utils";

export default function HeroX402Demo({ active = false }: { active?: boolean }) {
  const t = useLoopTime(5000, { paused: !active });

  const reqVisible = phaseProgress(t, 0, 600);
  const resVisible = t >= 700;
  const pressing = rangeActive(t, 1500, 1650);
  const processing = rangeActive(t, 1650, 2800);
  const granted = t >= 2800;
  const fade = t > 4500 ? 1 - phaseProgress(t, 4500, 4900) : 1;

  return (
    <div className="hd-x402" style={{ opacity: fade }}>
      <div className="hd-x402__terminal">
        {/* Request */}
        <div className="hd-x402__line" style={{ opacity: reqVisible }}>
          <span className="hd-x402__prompt">&gt;</span>
          <span className="code-method">GET</span>{" "}
          <span>/api/premium/data</span>
        </div>

        {/* 402 Response */}
        {resVisible ? (
          <div className="hd-x402__line hd-x402__line--402">
            <span className="hd-x402__prompt">&lt;</span>
            <span className="code-status">HTTP 402 Payment Required</span>
          </div>
        ) : null}

        {/* Paywall card */}
        {rangeActive(t, 1200, 2800) ? (
          <div className="hd-x402__paywall">
            <p>⚡ Paywall · 0.1 SOL</p>
            <button
              className={`hd-x402__pay-btn${pressing ? " is-pressing" : ""}`}
              type="button"
            >
              {processing ? (
                <>
                  <LoaderCircle className="gateway-demo__spinner" size={12} />
                  Processing
                </>
              ) : (
                <>
                  Sign &amp; Pay
                  <ArrowRight size={12} />
                </>
              )}
            </button>
          </div>
        ) : null}

        {/* 200 OK */}
        {granted ? (
          <>
            <div className="hd-x402__line hd-x402__line--ok">
              <span className="hd-x402__prompt">&lt;</span>
              <span className="code-string">HTTP 200 OK</span>
            </div>
            <div className="hd-x402__json">
              <p>{"{"}</p>
              <p>  <span className="code-key">&quot;btc&quot;</span>: <span className="code-number">94230.44</span>,</p>
              <p>  <span className="code-key">&quot;sol&quot;</span>: <span className="code-number">182.91</span>,</p>
              <p>  <span className="code-key">&quot;status&quot;</span>: <span className="code-string">&quot;live&quot;</span></p>
              <p>{"}"}</p>
            </div>
            <div className="hd-x402__spacer" />
            <p className="hd-x402__granted">
              <Zap aria-hidden="true" size={11} />
              ✓ Access granted · Payment private
            </p>
          </>
        ) : null}
      </div>
    </div>
  );
}
