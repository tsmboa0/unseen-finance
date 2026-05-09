"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Package, Minus, Plus, Trash2, ShoppingCart } from "lucide-react";
import { useCart } from "@/components/store/cart-context";
import { useCallback, useState } from "react";
import { UnseenPayButton, UnseenProvider, type PaymentResult } from "@unseen_fi/ui";

function formatPrice(raw: string, currency: string): string {
  const decimals = currency === "SOL" ? 9 : 6;
  const num = Number(raw) / Math.pow(10, decimals);
  return `${num.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;
}

function formatBigIntPrice(amount: bigint, currency: string): string {
  const decimals = currency === "SOL" ? 9 : 6;
  const num = Number(amount) / Math.pow(10, decimals);
  return `${num.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;
}

export default function CartPage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const { items, removeItem, updateQty, clearCart, totalItems, totalAmount } = useCart();
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  // Read the store currency from the first item's context or default
  // We'll pass it through the URL or use USDC as default
  const currency = "USDC"; // Will be overridden by checkout API

  const reference = `storefront_${slug}`;

  const createPaymentSession = useCallback(async (): Promise<PaymentResult> => {
    setCheckoutError(null);
    const res = await fetch(`/api/public/stores/${slug}/checkout`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: items.map((i) => ({ productId: i.productId, qty: i.qty })),
      }),
    });

    const data = (await res.json()) as {
      error?: string;
      paymentId?: string;
      checkoutUrl?: string;
      amount?: string;
      reference?: string;
      paymentToken?: string;
    };

    if (!res.ok || !data.paymentId || !data.checkoutUrl || !data.amount || !data.reference) {
      throw new Error(data.error ?? "Checkout failed. Please try again.");
    }

    console.log("[Unseen Checkout] Payment session created:", {
      paymentId: data.paymentId,
      checkoutUrl: data.checkoutUrl,
      amount: data.amount,
      reference: data.reference,
    });

    return {
      id: data.paymentId,
      status: "pending",
      amount: data.amount,
      checkoutUrl: data.checkoutUrl,
      reference: data.reference,
      paymentToken: data.paymentToken,
    };
  }, [items, slug]);

  return (
    <>
      <Link
        href={`/store/${slug}`}
        style={{
          display: "inline-flex", alignItems: "center", gap: 6,
          color: "var(--color-text-muted)", textDecoration: "none",
          fontSize: 14, marginBottom: 24,
        }}
      >
        <ArrowLeft size={14} /> Continue shopping
      </Link>

      <h1 style={{ fontSize: 24, fontWeight: 800, color: "var(--color-text-primary)", margin: "0 0 4px" }}>
        Your Cart
      </h1>
      <p style={{ fontSize: 14, color: "var(--color-text-secondary)", margin: "0 0 24px" }}>
        {totalItems} item{totalItems !== 1 ? "s" : ""}
      </p>

      {items.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 24px" }}>
          <ShoppingCart size={48} style={{ opacity: 0.12, marginBottom: 16, color: "var(--color-text-muted)" }} />
          <h2 style={{ fontSize: 18, color: "var(--color-text-primary)", margin: "0 0 8px" }}>Cart is empty</h2>
          <p style={{ fontSize: 14, color: "var(--color-text-secondary)", margin: "0 0 20px" }}>
            Browse products and add items to your cart.
          </p>
          <Link
            href={`/store/${slug}`}
            style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              padding: "10px 20px", borderRadius: 10,
              background: "var(--color-bg-card)", border: "1px solid var(--color-line-soft)",
              color: "var(--color-text-primary)", textDecoration: "none", fontSize: 14, fontWeight: 500,
            }}
          >
            <ArrowLeft size={14} /> Browse products
          </Link>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: 32, alignItems: "start" }}>
          {/* Items */}
          <div>
            {items.map((item) => (
              <div key={item.productId} className="sf-cart-item">
                <div className="sf-cart-item__image">
                  {item.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.imageUrl} alt={item.name} />
                  ) : (
                    <Package size={24} style={{ opacity: 0.12 }} />
                  )}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <h4 style={{ margin: "0 0 4px", fontSize: 15, fontWeight: 600, color: "var(--color-text-primary)" }}>
                    {item.name}
                  </h4>
                  <p style={{ margin: 0, fontSize: 14, color: "var(--color-violet-glow)", fontWeight: 600 }}>
                    {formatPrice(item.price, currency)}
                  </p>
                </div>

                <div className="sf-cart-qty">
                  <button onClick={() => updateQty(item.productId, item.qty - 1)}>
                    <Minus size={12} />
                  </button>
                  <span>{item.qty}</span>
                  <button onClick={() => updateQty(item.productId, item.qty + 1)}>
                    <Plus size={12} />
                  </button>
                </div>

                <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "var(--color-text-primary)", minWidth: 80, textAlign: "right" }}>
                  {formatPrice((BigInt(item.price) * BigInt(item.qty)).toString(), currency)}
                </p>

                <button
                  onClick={() => removeItem(item.productId)}
                  style={{
                    background: "none", border: "none", color: "var(--color-text-muted)",
                    cursor: "pointer", padding: 4, display: "flex",
                  }}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>

          {/* Summary */}
          <div style={{
            borderRadius: 16,
            background: "var(--color-bg-card)",
            border: "1px solid var(--color-line-soft)",
            padding: 24,
            position: "sticky",
            top: 80,
          }}>
            <h3 style={{ margin: "0 0 20px", fontSize: 16, fontWeight: 700, color: "var(--color-text-primary)" }}>
              Order Summary
            </h3>

            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
              <span style={{ fontSize: 14, color: "var(--color-text-secondary)" }}>Subtotal</span>
              <span style={{ fontSize: 14, color: "var(--color-text-primary)", fontWeight: 500 }}>
                {formatBigIntPrice(totalAmount, currency)}
              </span>
            </div>

            <div style={{
              display: "flex", justifyContent: "space-between",
              padding: "16px 0", margin: "8px 0",
              borderTop: "1px solid var(--color-line-soft)",
              borderBottom: "1px solid var(--color-line-soft)",
            }}>
              <span style={{ fontSize: 16, fontWeight: 700, color: "var(--color-text-primary)" }}>Total</span>
              <span style={{ fontSize: 16, fontWeight: 700, color: "var(--color-violet-glow)" }}>
                {formatBigIntPrice(totalAmount, currency)}
              </span>
            </div>

            <UnseenProvider baseUrl="">
              <UnseenPayButton
                amount={Number(totalAmount)}
                reference={reference}
                className="sf-checkout-btn"
                disabled={items.length === 0}
                createPaymentSession={createPaymentSession}
                onSuccess={() => {
                  clearCart();
                  router.push(`/store/${slug}`);
                }}
                onError={(error) => {
                  setCheckoutError(error.message);
                }}
                label="Pay with Unseen"
              />
            </UnseenProvider>
            {checkoutError ? (
              <p style={{ fontSize: 12, color: "#ef4444", textAlign: "center", marginTop: 10 }}>
                {checkoutError}
              </p>
            ) : null}

            <p style={{
              fontSize: 12, color: "var(--color-text-muted)", textAlign: "center",
              marginTop: 12, lineHeight: 1.5,
            }}>
              All transactions are private and shielded.
            </p>
          </div>
        </div>
      )}

      {/* Responsive override */}
      <style>{`
        @media (max-width: 768px) {
          .storefront__main > div[style*="grid-template-columns: 1fr 360px"] {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </>
  );
}
