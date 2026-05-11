/**
 * Phased plan — merchant invoicing + PDF
 *
 * Phase 1 (this PR): Persist invoices with line items; create Payment on “send”;
 *   PDF via @react-pdf/renderer; dashboard list from DB.
 * Phase 2: HTML invoice email (Resend) on send; optional PDF link in dashboard.
 * Phase 3: Tax/discount lines, multi-currency, webhook → mark paid on Payment CONFIRMED.
 */

export type InvoiceLineItemStored = {
  name: string;
  description: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
};

export type InvoiceLineItemInput = {
  name: string;
  description: string;
  quantity: number;
  unitPrice: number;
};

export function roundMoney2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function normalizeLineItems(raw: InvoiceLineItemInput[]): { items: InvoiceLineItemStored[]; subtotal: number } {
  const items: InvoiceLineItemStored[] = [];
  let subtotal = 0;
  for (const row of raw) {
    const name = row.name.trim();
    const qty = Number(row.quantity);
    const unit = Number(row.unitPrice);
    if (!name || !Number.isFinite(qty) || qty <= 0 || !Number.isFinite(unit) || unit < 0) continue;
    const lineTotal = roundMoney2(qty * unit);
    subtotal = roundMoney2(subtotal + lineTotal);
    items.push({
      name,
      description: row.description.trim(),
      quantity: qty,
      unitPrice: roundMoney2(unit),
      lineTotal,
    });
  }
  return { items, subtotal };
}
