"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Package, Minus, Plus, Trash2, ShoppingCart, User, MapPin } from "lucide-react";
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

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 14px",
  borderRadius: 10,
  border: "1px solid var(--color-line-soft)",
  background: "var(--color-bg-input, rgba(255,255,255,0.04))",
  color: "var(--color-text-primary)",
  fontSize: 14,
  outline: "none",
  boxSizing: "border-box",
  fontFamily: "inherit",
  transition: "border-color 0.15s",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 12,
  fontWeight: 600,
  color: "var(--color-text-secondary)",
  marginBottom: 6,
  letterSpacing: "0.04em",
  textTransform: "uppercase",
};

const sectionHeaderStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  fontSize: 15,
  fontWeight: 700,
  color: "var(--color-text-primary)",
  marginBottom: 16,
};

export default function CartPage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const { items, removeItem, updateQty, clearCart, totalItems, totalAmount } = useCart();
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [paymentConfirmed, setPaymentConfirmed] = useState(false);

  // Customer details
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [addressLine, setAddressLine] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("");
  const [postalCode, setPostalCode] = useState("");

  const currency = "USDC";
  const reference = `storefront_${slug}`;

  const formValid =
    fullName.trim().length > 0 &&
    email.trim().includes("@") &&
    addressLine.trim().length > 0 &&
    city.trim().length > 0 &&
    country.trim().length > 0 &&
    postalCode.trim().length > 0;

  const createPaymentSession = useCallback(async (): Promise<PaymentResult> => {
    setCheckoutError(null);
    const res = await fetch(`/api/public/stores/${slug}/checkout`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: items.map((i) => ({ productId: i.productId, qty: i.qty })),
        customerName: fullName.trim(),
        customerEmail: email.trim(),
        shippingAddress: {
          addressLine: addressLine.trim(),
          city: city.trim(),
          country: country.trim(),
          postalCode: postalCode.trim(),
        },
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
      amount: data.amount,
      reference: data.reference,
      paymentToken: data.paymentToken ? `${data.paymentToken.slice(0, 20)}...` : "MISSING",
    });

    return {
      id: data.paymentId,
      status: "pending",
      amount: data.amount,
      checkoutUrl: data.checkoutUrl,
      reference: data.reference,
      paymentToken: data.paymentToken,
    };
  }, [items, slug, fullName, email, addressLine, city, country, postalCode]);

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
        Checkout
      </h1>
      <p style={{ fontSize: 14, color: "var(--color-text-secondary)", margin: "0 0 28px" }}>
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

          {/* Left column: items + customer form */}
          <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>

            {/* Cart items */}
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
                    style={{ background: "none", border: "none", color: "var(--color-text-muted)", cursor: "pointer", padding: 4, display: "flex" }}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>

            {/* Contact details */}
            <div style={{
              borderRadius: 16,
              background: "var(--color-bg-card)",
              border: "1px solid var(--color-line-soft)",
              padding: 24,
            }}>
              <p style={sectionHeaderStyle}>
                <User size={17} style={{ color: "var(--color-violet-glow)", flexShrink: 0 }} />
                Contact Details
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div>
                  <label style={labelStyle}>Full Name *</label>
                  <input
                    style={inputStyle}
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Jane Doe"
                  />
                </div>
                <div>
                  <label style={labelStyle}>Email *</label>
                  <input
                    style={inputStyle}
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="jane@example.com"
                  />
                </div>
              </div>
            </div>

            {/* Shipping details */}
            <div style={{
              borderRadius: 16,
              background: "var(--color-bg-card)",
              border: "1px solid var(--color-line-soft)",
              padding: 24,
            }}>
              <p style={sectionHeaderStyle}>
                <MapPin size={17} style={{ color: "var(--color-violet-glow)", flexShrink: 0 }} />
                Shipping Address
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div>
                  <label style={labelStyle}>Street Address *</label>
                  <input
                    style={inputStyle}
                    value={addressLine}
                    onChange={(e) => setAddressLine(e.target.value)}
                    placeholder="123 Main St, Apt 4B"
                  />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                  <div>
                    <label style={labelStyle}>City *</label>
                    <input
                      style={inputStyle}
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="Lagos"
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Postal Code *</label>
                    <input
                      style={inputStyle}
                      value={postalCode}
                      onChange={(e) => setPostalCode(e.target.value)}
                      placeholder="100001"
                    />
                  </div>
                </div>
                <div>
                  <label style={labelStyle}>Country *</label>
                  <input
                    style={inputStyle}
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    placeholder="Nigeria"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Right column: order summary */}
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

            {items.map((item) => (
              <div key={item.productId} style={{ display: "flex", justifyContent: "space-between", marginBottom: 10, fontSize: 13 }}>
                <span style={{ color: "var(--color-text-secondary)" }}>
                  {item.name} <span style={{ color: "var(--color-text-muted)" }}>×{item.qty}</span>
                </span>
                <span style={{ color: "var(--color-text-primary)", fontWeight: 500 }}>
                  {formatPrice((BigInt(item.price) * BigInt(item.qty)).toString(), currency)}
                </span>
              </div>
            ))}

            <div style={{
              display: "flex", justifyContent: "space-between",
              padding: "16px 0", margin: "12px 0 20px",
              borderTop: "1px solid var(--color-line-soft)",
              borderBottom: "1px solid var(--color-line-soft)",
            }}>
              <span style={{ fontSize: 16, fontWeight: 700, color: "var(--color-text-primary)" }}>Total</span>
              <span style={{ fontSize: 16, fontWeight: 700, color: "var(--color-violet-glow)" }}>
                {formatBigIntPrice(totalAmount, currency)}
              </span>
            </div>

            {!formValid && (
              <p style={{ fontSize: 12, color: "var(--color-text-muted)", textAlign: "center", marginBottom: 12, lineHeight: 1.5 }}>
                Fill in your contact and shipping details to continue.
              </p>
            )}

            <UnseenProvider baseUrl="">
              <UnseenPayButton
                amount={Number(totalAmount)}
                reference={reference}
                className="sf-checkout-btn"
                disabled={items.length === 0 || !formValid}
                createPaymentSession={createPaymentSession}
                onSuccess={() => {
                  // Mark confirmed but DON'T clear cart yet — clearing unmounts
                  // this component and closes the modal before user sees the screen
                  setPaymentConfirmed(true);
                }}
                onDismiss={() => {
                  // User clicked Done on the confirmed screen → now safe to clear
                  if (paymentConfirmed) {
                    clearCart();
                  }
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

      <style>{`
        @media (max-width: 768px) {
          .storefront__main > div[style*="grid-template-columns: 1fr 360px"] {
            grid-template-columns: 1fr !important;
          }
        }
        input:focus {
          border-color: rgba(123,47,255,0.5) !important;
          box-shadow: 0 0 0 3px rgba(123,47,255,0.08);
        }
      `}</style>
    </>
  );
}
