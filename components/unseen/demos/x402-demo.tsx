"use client";

import { ArrowRight, LoaderCircle, Zap } from "lucide-react";
import {
  TypedSegments,
  phaseProgress,
  rangeActive,
  useLoopTime,
} from "@/components/unseen/demo-utils";

function countChars(text: string) {
  return text.length;
}

function TerminalLine({
  prompt,
  segments,
  visible,
}: {
  prompt?: string;
  segments: Array<{ className?: string; text: string }>;
  visible: number;
}) {
  if (visible <= 0) {
    return <div className="x402-demo__line" />;
  }

  return (
    <div className="x402-demo__line">
      {prompt ? <span className="x402-demo__prompt">{prompt}</span> : null}
      <TypedSegments segments={segments} visibleChars={visible} />
    </div>
  );
}

export default function X402Demo({
  large = false,
  active = true,
}: {
  large?: boolean;
  active?: boolean;
}) {
  const elapsed = useLoopTime(8500, { paused: !active });
  const fade = elapsed > 7000 ? 1 - Math.min((elapsed - 7000) / 1500, 1) : 1;
  const pressing = rangeActive(elapsed, 2850, 3000);
  const processing = rangeActive(elapsed, 3000, 5000);

  const requestOne = [
    { text: "GET", className: "code-method" },
    { text: " /api/premium/market-data", className: "code-default" },
  ];
  const requestTwo = [
    { text: "Authorization", className: "code-key" },
    { text: ": ", className: "code-default" },
    { text: "x402-payment", className: "code-string" },
  ];
  const requestThree = [
    { text: "Host", className: "code-key" },
    { text: ": api.unseenfi.com", className: "code-string" },
  ];
  const paywallOne = [
    { text: "HTTP 402 Payment Required", className: "code-status" },
  ];
  const paywallTwo = [
    { text: "X-Payment-Amount", className: "code-key" },
    { text: ": ", className: "code-default" },
    { text: "0.1 SOL", className: "code-number" },
  ];
  const paywallThree = [
    { text: "X-Payment-Recipient", className: "code-key" },
    { text: ": ", className: "code-default" },
    { text: "9mXP...7kQR", className: "code-string" },
  ];
  const successOne = [{ text: "HTTP 200 OK", className: "code-status" }];
  const successTwo = [
    { text: "X-Payment-Status", className: "code-key" },
    { text: ": ", className: "code-default" },
    { text: "shielded", className: "code-string" },
  ];
  const jsonOne = [{ text: "{", className: "code-default" }];
  const jsonTwo = [
    { text: '  "btc"', className: "code-key" },
    { text: ": ", className: "code-default" },
    { text: "94230.44", className: "code-number" },
    { text: ",", className: "code-default" },
  ];
  const jsonThree = [
    { text: '  "sol"', className: "code-key" },
    { text: ": ", className: "code-default" },
    { text: "182.91", className: "code-number" },
    { text: ",", className: "code-default" },
  ];
  const jsonFour = [
    { text: '  "status"', className: "code-key" },
    { text: ": ", className: "code-default" },
    { text: '"live"', className: "code-string" },
  ];
  const jsonFive = [{ text: "}", className: "code-default" }];

  return (
    <div
      className={`x402-demo ${large ? "x402-demo--large" : ""}`}
      style={{ opacity: fade }}
    >
      <div className="x402-demo__dots">
        <span />
        <span />
        <span />
      </div>

      <div className="x402-demo__screen">
        <TerminalLine
          prompt=">"
          segments={requestOne}
          visible={Math.floor(
            countChars("GET /api/premium/market-data") *
              phaseProgress(elapsed, 0, 550),
          )}
        />
        <TerminalLine
          prompt=">"
          segments={requestTwo}
          visible={Math.floor(
            countChars("Authorization: x402-payment") *
              phaseProgress(elapsed, 400, 1000),
          )}
        />
        <TerminalLine
          prompt=">"
          segments={requestThree}
          visible={Math.floor(
            countChars("Host: api.unseenfi.com") *
              phaseProgress(elapsed, 800, 1500),
          )}
        />

        {elapsed >= 1500 ? (
          <>
            <TerminalLine
              prompt="<"
              segments={paywallOne}
              visible={Math.floor(
                countChars("HTTP 402 Payment Required") *
                  phaseProgress(elapsed, 1500, 2100),
              )}
            />
            <TerminalLine
              prompt="<"
              segments={paywallTwo}
              visible={Math.floor(
                countChars("X-Payment-Amount: 0.1 SOL") *
                  phaseProgress(elapsed, 1800, 2400),
              )}
            />
            <TerminalLine
              prompt="<"
              segments={paywallThree}
              visible={Math.floor(
                countChars("X-Payment-Recipient: 9mXP...7kQR") *
                  phaseProgress(elapsed, 2200, 2900),
              )}
            />
          </>
        ) : null}

        {rangeActive(elapsed, 2200, 4900) ? (
          <div className="x402-demo__paywall-card">
            <p>⚡ Paywall · 0.1 SOL · Sign to unlock</p>
            <button 
              className={`x402-demo__paywall-button ${pressing ? "is-pressing" : ""}`} 
              type="button"
            >
              {processing ? (
                <>
                  <LoaderCircle className="gateway-demo__spinner" size={13} />
                  Processing
                </>
              ) : (
                <>
                  Sign &amp; Pay
                  <ArrowRight size={13} />
                </>
              )}
            </button>
          </div>
        ) : null}

        {elapsed >= 5000 ? (
          <>
            <TerminalLine
              prompt="<"
              segments={successOne}
              visible={Math.floor(
                countChars("HTTP 200 OK") * phaseProgress(elapsed, 5000, 5300),
              )}
            />
            <TerminalLine
              prompt="<"
              segments={successTwo}
              visible={Math.floor(
                countChars("X-Payment-Status: shielded") *
                  phaseProgress(elapsed, 5250, 5700),
              )}
            />
            <TerminalLine
              segments={jsonOne}
              visible={Math.floor(countChars("{") * phaseProgress(elapsed, 5500, 5550))}
            />
            <TerminalLine
              segments={jsonTwo}
              visible={Math.floor(
                countChars('"btc": 94230.44,') * phaseProgress(elapsed, 5550, 6000),
              )}
            />
            <TerminalLine
              segments={jsonThree}
              visible={Math.floor(
                countChars('"sol": 182.91,') * phaseProgress(elapsed, 5900, 6350),
              )}
            />
            <TerminalLine
              segments={jsonFour}
              visible={Math.floor(
                countChars('"status": "live"') * phaseProgress(elapsed, 6250, 6650),
              )}
            />
            <TerminalLine
              segments={jsonFive}
              visible={Math.floor(countChars("}") * phaseProgress(elapsed, 6600, 6700))}
            />
            <p className="x402-demo__status-line">
              <Zap aria-hidden="true" size={12} />
              ✓ Access granted · Payment private
            </p>
          </>
        ) : null}
      </div>
    </div>
  );
}
