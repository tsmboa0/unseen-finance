"use client";

import Link from "next/link";
import { ArrowLeft, Package, Plus, ShoppingCart, Shield } from "lucide-react";
import { useCart } from "@/components/store/cart-context";
import { useState } from "react";

type Product = {
  id: string;
  name: string;
  shortDesc: string | null;
  longDesc: string | null;
  price: string;
  imageUrl: string | null;
  stock: number | null;
  sku: string | null;
};

function formatPrice(raw: string, currency: string): string {
  const decimals = currency === "SOL" ? 9 : 6;
  const num = Number(raw) / Math.pow(10, decimals);
  return `${num.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;
}

export function ProductDetailClient({
  product,
  currency,
  storeSlug,
}: {
  product: Product;
  currency: string;
  storeSlug: string;
}) {
  const { addItem } = useCart();
  const [added, setAdded] = useState(false);

  function handleAdd() {
    addItem({
      productId: product.id,
      name: product.name,
      price: product.price,
      imageUrl: product.imageUrl,
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  }

  const outOfStock = product.stock === 0;

  return (
    <>
      {/* Back link */}
      <Link
        href={`/store/${storeSlug}`}
        style={{
          display: "inline-flex", alignItems: "center", gap: 6,
          color: "var(--color-text-muted)", textDecoration: "none",
          fontSize: 14, marginBottom: 24,
        }}
      >
        <ArrowLeft size={14} /> Back to store
      </Link>

      <div className="sf-detail">
        {/* Image */}
        <div className="sf-detail__image">
          {product.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={product.imageUrl} alt={product.name} />
          ) : (
            <Package size={64} style={{ opacity: 0.1 }} />
          )}
        </div>

        {/* Info */}
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: "var(--color-text-primary)", margin: "0 0 8px", letterSpacing: "-0.02em" }}>
            {product.name}
          </h1>

          <p style={{ fontSize: 28, fontWeight: 700, color: "var(--color-violet-glow)", margin: "0 0 20px" }}>
            {formatPrice(product.price, currency)}
          </p>

          {/* Stock */}
          <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
            {outOfStock ? (
              <span style={{
                display: "inline-flex", alignItems: "center", gap: 4,
                padding: "4px 10px", borderRadius: 8,
                background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.15)",
                fontSize: 13, color: "#ef4444", fontWeight: 500,
              }}>
                Out of stock
              </span>
            ) : product.stock !== null ? (
              <span style={{
                display: "inline-flex", alignItems: "center", gap: 4,
                padding: "4px 10px", borderRadius: 8,
                background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.12)",
                fontSize: 13, color: "#22c55e", fontWeight: 500,
              }}>
                {product.stock} in stock
              </span>
            ) : (
              <span style={{
                display: "inline-flex", alignItems: "center", gap: 4,
                padding: "4px 10px", borderRadius: 8,
                background: "var(--color-bg-card)", border: "1px solid var(--color-line-soft)",
                fontSize: 13, color: "var(--color-text-secondary)", fontWeight: 500,
              }}>
                In stock
              </span>
            )}

            {product.sku && (
              <span style={{
                padding: "4px 10px", borderRadius: 8,
                background: "var(--color-bg-card)", border: "1px solid var(--color-line-soft)",
                fontSize: 12, color: "var(--color-text-muted)",
              }}>
                SKU: {product.sku}
              </span>
            )}
          </div>

          {/* Short description */}
          {product.shortDesc && (
            <p style={{ fontSize: 15, color: "var(--color-text-secondary)", lineHeight: 1.7, margin: "0 0 16px" }}>
              {product.shortDesc}
            </p>
          )}

          {/* Long description */}
          {product.longDesc && (
            <div style={{
              padding: 16, borderRadius: 12,
              background: "var(--color-bg-card)", border: "1px solid var(--color-line-soft)",
              fontSize: 14, color: "var(--color-text-secondary)", lineHeight: 1.8,
              marginBottom: 24, whiteSpace: "pre-wrap",
            }}>
              {product.longDesc}
            </div>
          )}

          {/* Action buttons */}
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <button
              onClick={handleAdd}
              disabled={outOfStock}
              style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "14px 28px", borderRadius: 14, border: "none",
                background: added ? "linear-gradient(135deg, #22c55e 0%, #16a34a 100%)" : "linear-gradient(135deg, #7b2fff 0%, #6020cc 100%)",
                color: "#fff", fontSize: 15, fontWeight: 600, cursor: outOfStock ? "not-allowed" : "pointer",
                opacity: outOfStock ? 0.5 : 1, fontFamily: "inherit",
                transition: "all 0.2s ease",
              }}
            >
              {added ? (
                <>✓ Added to cart</>
              ) : (
                <><Plus size={16} /> Add to cart</>
              )}
            </button>

            <Link
              href={`/store/${storeSlug}/cart`}
              style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "14px 28px", borderRadius: 14,
                background: "var(--color-bg-card)", border: "1px solid var(--color-line-soft)",
                color: "var(--color-text-primary)", fontSize: 15, fontWeight: 500, textDecoration: "none",
                fontFamily: "inherit",
              }}
            >
              <ShoppingCart size={16} /> View cart
            </Link>
          </div>

          {/* Privacy badge */}
          <div style={{
            display: "flex", alignItems: "center", gap: 8,
            marginTop: 24, padding: "10px 14px", borderRadius: 10,
            background: "var(--color-violet-shimmer)", border: "1px solid var(--color-violet-border)",
            fontSize: 13, color: "var(--color-violet-glow)",
          }}>
            <Shield size={14} />
            Payment is private — powered by Unseen Pay
          </div>
        </div>
      </div>
    </>
  );
}
