"use client";

import { LoaderCircle, Lock, ShoppingCart } from "lucide-react";
import { phaseProgress, rangeActive, useLoopTime } from "@/components/unseen/demo-utils";

const PRODUCTS = [
  { name: "Ghost Tee", price: "0.8 SOL", type: "tee" },
  { name: "Void Hoodie", price: "2.1 SOL", type: "hoodie" },
  { name: "Cipher Cap", price: "0.5 SOL", type: "cap" },
] as const;

export default function StorefrontDemo({
  large = false,
  active = true,
}: {
  large?: boolean;
  active?: boolean;
}) {
  const elapsed = useLoopTime(10000, { paused: !active });
  const detailOpen = elapsed >= 1500;
  const checkoutOpen = elapsed >= 3500 && elapsed < 8500;
  const pressing = rangeActive(elapsed, 4850, 5000);
  const processing = rangeActive(elapsed, 5000, 7000);
  const success = elapsed >= 7000 && elapsed < 8500;
  const fade = elapsed > 8500 ? 1 - Math.min((elapsed - 8500) / 1500, 1) : 1;

  return (
    <div
      className={`storefront-demo ${large ? "storefront-demo--large" : ""}`}
      style={{ opacity: fade }}
    >
      <div className="storefront-demo__browser">
        <div className="storefront-demo__chrome">
          <div className="storefront-demo__chrome-dots">
            <span />
            <span />
            <span />
          </div>
          <div className="storefront-demo__url">
            <Lock aria-hidden="true" size={12} />
            unseen.fi/store/phantom-goods
          </div>
        </div>

        <div className="storefront-demo__surface">
          <div className="storefront-demo__nav">
            <div>
              <p className="storefront-demo__brand-title">Phantom Goods</p>
              <p className="storefront-demo__brand-copy">Privacy-native merch</p>
            </div>
            <div className="storefront-demo__cart">
              <ShoppingCart aria-hidden="true" size={14} />
              <span
                className={`storefront-demo__cart-badge ${
                  elapsed >= 2500 ? "is-active" : ""
                }`}
              >
                1
              </span>
            </div>
          </div>

          <div className="storefront-demo__grid">
            {PRODUCTS.map((product, index) => (
              <div
                className={`storefront-demo__product ${
                  index === 0 && elapsed >= 1500 && elapsed < 2500
                    ? "is-highlighted"
                    : ""
                }`}
                key={product.name}
              >
                <div className={`storefront-demo__shape storefront-demo__shape--${product.type}`} />
                <p>{product.name}</p>
                <span>{product.price}</span>
              </div>
            ))}
          </div>

          <div
            className={`storefront-demo__detail ${
              detailOpen ? "is-visible" : ""
            }`}
          >
            <p className="storefront-demo__detail-label">Selected product</p>
            <h4>Ghost Tee</h4>
            <p className="storefront-demo__detail-price">0.8 SOL</p>
            <button className="storefront-demo__detail-button" type="button">
              Add to Cart
            </button>
          </div>

          <div
            className={`storefront-demo__checkout ${
              checkoutOpen ? "is-visible" : ""
            }`}
          >
            <div className="storefront-demo__checkout-card">
              {!success ? (
                <>
                  <p className="storefront-demo__checkout-brand">Phantom Goods</p>
                  <div className="storefront-demo__checkout-row">
                    <span>Ghost Tee</span>
                    <span>0.8 SOL</span>
                  </div>
                  <div className="storefront-demo__checkout-wallet">
                    <span>Wallet connected</span>
                    <span>7xKP...3mR2</span>
                  </div>
                  <button 
                    className={`storefront-demo__checkout-button ${pressing ? "is-pressing" : ""}`} 
                    type="button"
                  >
                    {processing ? (
                      <>
                        <LoaderCircle className="gateway-demo__spinner" size={13} />
                        Processing...
                      </>
                    ) : (
                      "Pay Privately"
                    )}
                  </button>
                </>
              ) : (
                <div className="storefront-demo__checkout-success">
                  <p>Order confirmed</p>
                  <span>Transaction shielded 🛡</span>
                </div>
              )}
            </div>
          </div>

          <div
            className="storefront-demo__wipe"
            style={{
              transform: `scaleX(${phaseProgress(elapsed, 5000, 5600)})`,
            }}
          />
        </div>
      </div>
    </div>
  );
}
