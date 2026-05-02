"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, Copy, Settings, Store } from "lucide-react";
import { DButton } from "@/components/dashboard/primitives";
import { truncateMiddle } from "@/components/dashboard/formatters";
import { useMerchantApi } from "@/hooks/use-merchant-api";

export function MerchantIdentity() {
  const [copied, setCopied] = useState(false);
  const { merchant, loading } = useMerchantApi();

  const merchantId = merchant?.id ?? "";
  const businessName = merchant?.name ?? (loading ? "Loading merchant..." : "Merchant");
  const handle = merchant?.handle || merchant?.name.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "merchant";
  const wallet = merchant?.walletAddress ? truncateMiddle(merchant.walletAddress, 6, 6) : "No wallet connected";
  const owner = merchant?.ownerName || merchant?.email || "Owner";

  function copyId() {
    if (!merchantId) return;
    navigator.clipboard.writeText(merchantId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="dash-identity">
      <div className="dash-identity__left">
        <div className="dash-identity__avatar">
          <Store size={20} />
        </div>
        <div className="dash-identity__info">
          <h1 className="dash-identity__name">{businessName}</h1>
          <div className="dash-identity__meta">
            <span className="dash-identity__meta-item">
              <span className="dash-identity__meta-label">ID</span>
              <span className="dash-identity__meta-value dash-identity__id-val">
                {merchantId ? truncateMiddle(merchantId, 8, 6) : "Pending"}
              </span>
              <button
                aria-label={copied ? "Merchant ID copied" : "Copy merchant ID"}
                className={`dash-identity__copy ${copied ? "is-copied" : ""}`}
                disabled={!merchantId}
                onClick={copyId}
                type="button"
              >
                {copied ? <Check size={12} aria-hidden /> : <Copy size={12} aria-hidden />}
              </button>
            </span>
            <span className="dash-identity__meta-item">
              <span className="dash-identity__meta-label">Handle</span>
              <span className="dash-identity__meta-value">@{handle}</span>
            </span>
            <span className="dash-identity__meta-item">
              <span className="dash-identity__meta-label">Owner</span>
              <span className="dash-identity__meta-value">{owner}</span>
            </span>
            <span className="dash-identity__meta-item">
              <span className="dash-identity__meta-label">Wallet</span>
              <span className="dash-identity__meta-value">{wallet}</span>
            </span>
          </div>
        </div>
      </div>
      <div className="dash-identity__right">
        <Link href="/dashboard/settings" style={{ textDecoration: "none" }}>
          <DButton variant="secondary" size="sm" icon={Settings}>
            Settings
          </DButton>
        </Link>
      </div>
      <style>{identityCSS}</style>
    </div>
  );
}

const identityCSS = `
.dash-identity {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24px;
  background: var(--color-bg-card);
  border: 1px solid var(--color-line-soft);
  border-radius: 16px;
  margin-bottom: 28px;
}

.dash-identity__left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.dash-identity__avatar {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: rgba(123, 47, 255, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-violet-glow);
  border: 1px solid rgba(123, 47, 255, 0.2);
}

.dash-identity__info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.dash-identity__name {
  font-size: 18px;
  font-weight: 700;
  color: var(--color-text-primary);
  margin: 0;
  font-family: var(--font-display), sans-serif;
}

.dash-identity__meta {
  display: flex;
  align-items: center;
  gap: 16px;
}

.dash-identity__meta-item {
  display: flex;
  align-items: center;
  gap: 6px;
}

.dash-identity__meta-label {
  font-size: 11px;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  font-weight: 600;
}

.dash-identity__meta-value {
  font-size: 13px;
  color: var(--color-text-secondary);
  font-weight: 500;
}

.dash-identity__id-val {
  font-weight: 700;
  color: var(--color-text-primary);
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.01em;
}

.dash-identity__copy {
  background: none;
  border: none;
  padding: 4px;
  color: var(--color-text-muted);
  cursor: pointer;
  border-radius: 4px;
  display: flex;
  align-items: center;
  transition: all 0.15s ease;
}

.dash-identity__copy:hover {
  color: var(--color-text-primary);
  background: rgba(255, 255, 255, 0.05);
}

.dash-identity__copy.is-copied {
  color: var(--color-success);
}

@media (max-width: 640px) {
  .dash-identity {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
    padding: 16px;
  }
  
  .dash-identity__meta {
    flex-direction: column;
    align-items: flex-start;
    gap: 6px;
  }
}
`;
