import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { requirePrivyAuth } from "@/lib/privy";
import { normalizeLineItems, type InvoiceLineItemInput } from "@/lib/invoice/line-items";
import { nextMerchantInvoiceNumber } from "@/lib/invoice/invoice-number";
import { payrollStableMint, toPayrollRawUnits, type PayrollCurrency } from "@/lib/payroll/constants";
import { generatePaymentId, addSeconds } from "@/lib/utils";
import { buildPaymentOptionalDataHash } from "@/lib/payment-optional-data";
import { appBaseUrl } from "@/lib/invoice/app-base-url";
import { invoicePayAbsoluteUrl } from "@/lib/invoice/invoice-pay-url";
import type { InvoiceLineItemStored } from "@/lib/invoice/line-items";
import { sendMerchantInvoiceEmail } from "@/lib/invoice/send-invoice-email";

const PAYMENT_TTL_SEC = 7 * 24 * 3600;

function isLikelyEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

export async function POST(request: NextRequest) {
  const { merchant, error } = await requirePrivyAuth(request as unknown as Request);
  if (!merchant) {
    return NextResponse.json({ error: error ?? "Unauthorized" }, { status: 401 });
  }

  let body: {
    action?: string;
    clientName?: string;
    clientEmail?: string;
    dueDate?: string;
    currency?: string;
    notes?: string;
    lineItems?: InvoiceLineItemInput[];
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const action = body.action === "send" ? "send" : "draft";
  const clientName = typeof body.clientName === "string" ? body.clientName.trim() : "";
  const clientEmail = typeof body.clientEmail === "string" ? body.clientEmail.trim() : "";
  const notes = typeof body.notes === "string" ? body.notes.trim().slice(0, 2000) : "";
  const currency = body.currency === "USDT" ? "USDT" : "USDC";
  const mint = payrollStableMint(currency as PayrollCurrency, merchant.network);

  if (!clientName) {
    return NextResponse.json({ error: "Client name is required" }, { status: 400 });
  }

  if (action === "send" && (!clientEmail || !isLikelyEmail(clientEmail))) {
    return NextResponse.json(
      { error: "A valid client email is required to send an invoice" },
      { status: 400 },
    );
  }

  const dueRaw = typeof body.dueDate === "string" ? body.dueDate : "";
  if (!dueRaw) {
    return NextResponse.json({ error: "Due date is required" }, { status: 400 });
  }
  const dueAt = new Date(`${dueRaw}T23:59:59.999Z`);
  if (Number.isNaN(dueAt.getTime())) {
    return NextResponse.json({ error: "Invalid due date" }, { status: 400 });
  }

  const rawLines = Array.isArray(body.lineItems) ? body.lineItems : [];
  const { items, subtotal } = normalizeLineItems(rawLines);
  if (items.length === 0 || subtotal <= 0) {
    return NextResponse.json({ error: "Add at least one valid line item with amount" }, { status: 400 });
  }

  let totalAmountRaw: bigint;
  try {
    totalAmountRaw = toPayrollRawUnits(subtotal.toFixed(6), 6);
  } catch {
    return NextResponse.json({ error: "Invalid total" }, { status: 400 });
  }

  const invoiceNumber = await nextMerchantInvoiceNumber(merchant.id);
  const base = appBaseUrl();

  if (action === "draft") {
    const invoice = await prisma.merchantInvoice.create({
      data: {
        merchantId: merchant.id,
        invoiceNumber,
        status: "draft",
        clientName,
        clientEmail: clientEmail || null,
        lineItems: items,
        currency,
        subtotalDisplay: subtotal,
        totalAmountRaw,
        mint,
        notes: notes || null,
        dueAt,
      },
    });
    return NextResponse.json({
      ok: true,
      invoice: {
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        status: invoice.status,
        pdfPath: `/api/dashboard/invoices/${invoice.id}/pdf`,
      },
    });
  }

  const result = await prisma.$transaction(async (tx) => {
    const invoice = await tx.merchantInvoice.create({
      data: {
        merchantId: merchant.id,
        invoiceNumber,
        status: "draft",
        clientName,
        clientEmail: clientEmail || null,
        lineItems: items,
        currency,
        subtotalDisplay: subtotal,
        totalAmountRaw,
        mint,
        notes: notes || null,
        dueAt,
      },
    });

    const paymentId = generatePaymentId();
    const reference = `invoice:${invoice.id}`;
    const expectedOptionalDataHash = buildPaymentOptionalDataHash({ paymentId, reference });
    const expiresAt = addSeconds(new Date(), PAYMENT_TTL_SEC);

    await tx.payment.create({
      data: {
        id: paymentId,
        merchantId: merchant.id,
        amount: totalAmountRaw,
        mint,
        reference,
        description: `Invoice ${invoice.invoiceNumber} — ${clientName}`,
        metadata: JSON.stringify({ invoiceId: invoice.id, invoiceNumber: invoice.invoiceNumber }),
        status: "PENDING",
        expiresAt,
        expectedOptionalDataHash,
      },
    });

    return tx.merchantInvoice.update({
      where: { id: invoice.id },
      data: { paymentId, status: "sent" },
    });
  });

  const paymentIdForCheckout = result.paymentId;
  if (!paymentIdForCheckout) {
    return NextResponse.json({ error: "Payment link could not be created" }, { status: 500 });
  }

  const checkoutUrl = invoicePayAbsoluteUrl(base, paymentIdForCheckout);

  const lineItemsStored = result.lineItems as unknown as InvoiceLineItemStored[];
  const emailResult = await sendMerchantInvoiceEmail({
    to: clientEmail,
    replyTo: merchant.email,
    merchantName: merchant.name,
    invoiceNumber: result.invoiceNumber,
    issuedAtIso: result.issuedAt.toISOString(),
    dueAtIso: result.dueAt.toISOString(),
    clientName: result.clientName,
    clientEmail: result.clientEmail ?? clientEmail,
    currency: result.currency,
    lineItems: lineItemsStored,
    subtotal: result.subtotalDisplay,
    notes: result.notes,
    checkoutUrl,
  });

  return NextResponse.json({
    ok: true,
    invoice: {
      id: result.id,
      invoiceNumber: result.invoiceNumber,
      status: result.status,
      paymentId: result.paymentId,
      checkoutUrl,
      pdfPath: `/api/dashboard/invoices/${result.id}/pdf`,
    },
    emailSent: emailResult.ok,
    ...(emailResult.ok ? {} : { emailError: emailResult.error }),
  });
}
