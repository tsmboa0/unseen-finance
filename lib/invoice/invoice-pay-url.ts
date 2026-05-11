import { appBaseUrl } from "@/lib/invoice/app-base-url";

/** Query flag so hosted checkout can complete invoice payments without merchant "verify" click. */
export const INVOICE_CHECKOUT_REF = "invoice" as const;

export function invoicePayRelativePath(paymentId: string): string {
  return `/pay/${paymentId}?ref=${INVOICE_CHECKOUT_REF}`;
}

export function invoicePayAbsoluteUrl(baseNoTrailingSlash: string, paymentId: string): string {
  return `${baseNoTrailingSlash.replace(/\/$/, "")}${invoicePayRelativePath(paymentId)}`;
}

export function invoicePayUrlFromAppBase(paymentId: string): string {
  return invoicePayAbsoluteUrl(appBaseUrl(), paymentId);
}
