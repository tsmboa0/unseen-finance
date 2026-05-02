"use client";

import { ShoppingBag } from "lucide-react";
import { useLoopTime } from "@/components/unseen/demo-utils";

const PRODUCTS = [
  { name: "Void Hoodie",   price: "0.8 SOL", emoji: "🧥", highlight: true },
  { name: "Ghost Tee",     price: "0.5 SOL", emoji: "👕", highlight: false },
  { name: "Cipher Cap",    price: "0.4 SOL", emoji: "🧢", highlight: false },
  { name: "Dark Jacket",   price: "1.2 SOL", emoji: "🥷", highlight: false },
  { name: "Stealth Bag",   price: "0.6 SOL", emoji: "🎒", highlight: false },
  { name: "Phantom Shirt", price: "0.3 SOL", emoji: "👔", highlight: false },
] as const;

// Hover cycles over items 0→1→4 every 1.5s
const HOVER_SEQUENCE = [0, 1, 4];

export default function HeroStorefrontDemo({ active = false }: { active?: boolean }) {
  const t = useLoopTime(5000, { paused: !active });

  // Cycle hover every ~1.4s: 0ms→1400ms→2800ms→...
  const hoverIdx = HOVER_SEQUENCE[Math.floor((t / 1400) % HOVER_SEQUENCE.length)];

  return (
    <div className="hd-store">
      {/* Store header */}
      <div className="hd-store__top">
        <div className="hd-store__logo-mark">P</div>
        <div className="hd-store__brand-wrap">
          <p className="hd-store__brand">Phantom Goods</p>
          <p className="hd-store__tagline">Privacy-native merch</p>
        </div>
        <div className="hd-store__cart-icon">
          <ShoppingBag aria-hidden="true" size={15} strokeWidth={1.8} />
        </div>
      </div>

      {/* Section label */}
      <p className="hd-store__section-label">NEW ARRIVALS</p>

      {/* Product grid */}
      <div className="hd-store__product-grid">
        {PRODUCTS.map((p, i) => (
          <div
            className={`hd-store__grid-item${i === hoverIdx ? " is-hovered" : ""}`}
            key={p.name}
          >
            <div className="hd-store__grid-emoji">{p.emoji}</div>
            <p className="hd-store__grid-name">{p.name}</p>
            <p className="hd-store__grid-price">{p.price}</p>
            {i === hoverIdx && (
              <div className="hd-store__grid-hover-btn">Add to cart</div>
            )}
          </div>
        ))}
      </div>

      {/* Footer bar */}
      <div className="hd-store__footer-bar">
        <span className="hd-store__footer-shield">🔒 Payments shielded on Solana</span>
        <span className="hd-store__footer-powered">by Unseen</span>
      </div>
    </div>
  );
}
