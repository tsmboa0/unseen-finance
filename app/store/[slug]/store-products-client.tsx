"use client";

import Link from "next/link";
import { Package, Plus } from "lucide-react";
import { useCart } from "@/components/store/cart-context";

type ProductCard = {
  id: string;
  name: string;
  shortDesc: string | null;
  price: string;
  imageUrl: string | null;
  stock: number | null;
};

function formatPrice(raw: string, currency: string): string {
  const decimals = currency === "SOL" ? 9 : 6;
  const num = Number(raw) / Math.pow(10, decimals);
  return `${num.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;
}

export function StoreProductGrid({
  products,
  currency,
  storeSlug,
}: {
  products: ProductCard[];
  currency: string;
  storeSlug: string;
}) {
  const { addItem } = useCart();

  if (products.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "80px 24px" }}>
        <Package size={48} style={{ opacity: 0.15, marginBottom: 16, color: "var(--color-text-muted)" }} />
        <h2 style={{ fontSize: 20, color: "var(--color-text-primary)", margin: "0 0 8px" }}>No products yet</h2>
        <p style={{ fontSize: 14, color: "var(--color-text-secondary)" }}>
          This store is being set up. Check back soon!
        </p>
      </div>
    );
  }

  return (
    <div className="sf-product-grid">
      {products.map((p) => (
        <div key={p.id} className="sf-product-card">
          <Link href={`/store/${storeSlug}/${p.id}`} style={{ textDecoration: "none", color: "inherit" }}>
            <div className="sf-product-card__image">
              {p.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.imageUrl} alt={p.name} />
              ) : (
                <Package size={36} style={{ opacity: 0.12 }} />
              )}
            </div>
            <div className="sf-product-card__body">
              <h3 className="sf-product-card__name">{p.name}</h3>
              {p.shortDesc && <p className="sf-product-card__desc">{p.shortDesc}</p>}
            </div>
          </Link>

          <div className="sf-product-card__footer">
            <span className="sf-product-card__price">{formatPrice(p.price, currency)}</span>
            <button
              className="sf-product-card__add-btn"
              onClick={(e) => {
                e.preventDefault();
                addItem({
                  productId: p.id,
                  name: p.name,
                  price: p.price,
                  imageUrl: p.imageUrl,
                });
              }}
              disabled={p.stock === 0}
            >
              <Plus size={14} />
              {p.stock === 0 ? "Sold out" : "Add"}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
