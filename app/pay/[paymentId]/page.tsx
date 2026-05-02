import prisma from "@/lib/db";
import CheckoutClient from "./checkout-client";
import { serializePayment, getMintInfo, isExpired } from "@/lib/utils";

type Params = { params: Promise<{ paymentId: string }> };

export default async function CheckoutPage({ params }: Params) {
  const { paymentId } = await params;

  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: { merchant: { select: { name: true, walletAddress: true } } },
  });

  if (!payment) {
    return <CheckoutError title="Payment Not Found" message="This payment link is invalid or has been removed." />;
  }

  // Auto-expire
  if (payment.status === "PENDING" && isExpired(payment.expiresAt)) {
    await prisma.payment.update({ where: { id: paymentId }, data: { status: "EXPIRED" } });
    return <CheckoutError title="Payment Expired" message="This payment session has expired. Please request a new payment link from the merchant." />;
  }

  if (payment.status === "CONFIRMED") {
    return <CheckoutSuccess payment={payment} />;
  }

  if (payment.status === "CANCELLED") {
    return <CheckoutError title="Payment Cancelled" message="This payment was cancelled by the merchant." />;
  }

  if (payment.status === "EXPIRED") {
    return <CheckoutError title="Payment Expired" message="This payment session has expired. Please request a new payment link from the merchant." />;
  }

  const mintInfo = getMintInfo(payment.mint);
  const serialized = serializePayment({
    id: payment.id,
    amount: payment.amount,
    mint: payment.mint,
    mintSymbol: mintInfo.symbol,
    mintDecimals: mintInfo.decimals,
    description: payment.description,
    merchantName: payment.merchant.name,
    merchantWallet: payment.merchant.walletAddress,
    expiresAt: payment.expiresAt.toISOString(),
  });

  return <CheckoutClient payment={serialized} />;
}

// ─── Server-rendered states ─────────────────────────────────────────────────

function CheckoutError({ title, message }: { title: string; message: string }) {
  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        <div style={iconCircleStyle}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></svg>
        </div>
        <h1 style={titleStyle}>{title}</h1>
        <p style={messageStyle}>{message}</p>
      </div>
    </div>
  );
}

function CheckoutSuccess({ payment }: { payment: { id: string; description?: string | null } }) {
  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        <div style={{ ...iconCircleStyle, background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.2)" }}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
        </div>
        <h1 style={titleStyle}>Payment Confirmed</h1>
        <p style={messageStyle}>{payment.description ?? "Your payment has been confirmed."}</p>
        <p style={{ ...messageStyle, fontSize: "13px", marginTop: "8px", opacity: 0.5 }}>You can close this page.</p>
      </div>
    </div>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────

const containerStyle: React.CSSProperties = {
  minHeight: "100vh",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontFamily: "'Inter', sans-serif",
  padding: "24px",
  background: "linear-gradient(135deg, #0a0a0f 0%, #12101f 50%, #0a0a0f 100%)",
};

const cardStyle: React.CSSProperties = {
  background: "rgba(255,255,255,0.03)",
  border: "1px solid rgba(255,255,255,0.06)",
  borderRadius: "20px",
  padding: "48px 32px",
  maxWidth: "420px",
  width: "100%",
  textAlign: "center",
  backdropFilter: "blur(20px)",
};

const iconCircleStyle: React.CSSProperties = {
  width: "64px",
  height: "64px",
  borderRadius: "50%",
  background: "rgba(239,68,68,0.1)",
  border: "1px solid rgba(239,68,68,0.2)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  margin: "0 auto 24px",
};

const titleStyle: React.CSSProperties = {
  color: "#fff",
  fontSize: "22px",
  fontWeight: 600,
  margin: "0 0 12px",
};

const messageStyle: React.CSSProperties = {
  color: "rgba(255,255,255,0.5)",
  fontSize: "15px",
  lineHeight: 1.6,
  margin: 0,
};
