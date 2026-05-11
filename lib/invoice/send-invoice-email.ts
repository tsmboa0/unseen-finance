import { Resend } from "resend";
import { buildMerchantInvoiceEmailHtml } from "@/lib/invoice/invoice-email-html";
import type { InvoiceLineItemStored } from "@/lib/invoice/line-items";

export type SendMerchantInvoiceEmailInput = {
  to: string;
  replyTo?: string | null;
  merchantName: string;
  invoiceNumber: string;
  issuedAtIso: string;
  dueAtIso: string;
  clientName: string;
  clientEmail: string;
  currency: string;
  lineItems: InvoiceLineItemStored[];
  subtotal: number;
  notes: string | null;
  checkoutUrl: string;
};

let resendSingleton: Resend | null = null;

function getResend(): Resend | null {
  const key = process.env.RESEND_API_KEY?.trim();
  if (!key) return null;
  if (!resendSingleton) resendSingleton = new Resend(key);
  return resendSingleton;
}

export async function sendMerchantInvoiceEmail(
  input: SendMerchantInvoiceEmailInput,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const resend = getResend();
  if (!resend) {
    return { ok: false, error: "RESEND_API_KEY is not set" };
  }

  const from =
    process.env.RESEND_FROM?.trim() || "Unseen Finance <onboarding@resend.dev>";

  const html = buildMerchantInvoiceEmailHtml({
    merchantName: input.merchantName,
    invoiceNumber: input.invoiceNumber,
    issuedAtIso: input.issuedAtIso,
    dueAtIso: input.dueAtIso,
    clientName: input.clientName,
    clientEmail: input.clientEmail,
    currency: input.currency,
    lineItems: input.lineItems,
    subtotal: input.subtotal,
    notes: input.notes ?? "",
    checkoutUrl: input.checkoutUrl,
  });

  const subject = `Invoice ${input.invoiceNumber} — ${input.merchantName}`;

  try {
    const { error } = await resend.emails.send({
      from,
      to: input.to,
      subject,
      html,
      ...(input.replyTo && input.replyTo.trim() ? { replyTo: input.replyTo.trim() } : {}),
    });

    if (error) {
      return { ok: false, error: error.message };
    }
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to send email";
    return { ok: false, error: msg };
  }
}
