import type { InvoiceLineItemStored } from "@/lib/invoice/line-items";

/** Minimal escaping for HTML email bodies (user-supplied invoice fields). */
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" });
  } catch {
    return iso;
  }
}

function formatMoney(n: number, currency: string): string {
  return `${n.toFixed(2)} ${escapeHtml(currency)}`;
}

export type InvoiceEmailHtmlProps = {
  merchantName: string;
  invoiceNumber: string;
  issuedAtIso: string;
  dueAtIso: string;
  clientName: string;
  clientEmail: string;
  currency: string;
  lineItems: InvoiceLineItemStored[];
  subtotal: number;
  notes: string;
  checkoutUrl: string;
};

/**
 * Table-based, inline-styled HTML for transactional email clients.
 */
export function buildMerchantInvoiceEmailHtml(p: InvoiceEmailHtmlProps): string {
  const accent = "#5b21b6";
  const text = "#111827";
  const muted = "#6b7280";
  const border = "#e5e7eb";
  const subtle = "#f3f4f6";

  const rows = p.lineItems
    .map((line) => {
      const desc = line.description.trim()
        ? `<div style="font-size:13px;color:${muted};margin-top:4px;line-height:1.4;">${escapeHtml(line.description)}</div>`
        : "";
      return `
        <tr>
          <td style="padding:14px 12px;border-bottom:1px solid ${subtle};vertical-align:top;">
            <div style="font-size:14px;font-weight:600;color:${text};">${escapeHtml(line.name)}</div>
            ${desc}
          </td>
          <td style="padding:14px 12px;border-bottom:1px solid ${subtle};text-align:right;font-size:14px;color:${text};vertical-align:top;">${escapeHtml(String(line.quantity))}</td>
          <td style="padding:14px 12px;border-bottom:1px solid ${subtle};text-align:right;font-size:14px;color:${text};vertical-align:top;">${formatMoney(line.unitPrice, p.currency)}</td>
          <td style="padding:14px 12px;border-bottom:1px solid ${subtle};text-align:right;font-size:14px;font-weight:600;color:${text};vertical-align:top;">${formatMoney(line.lineTotal, p.currency)}</td>
        </tr>`;
    })
    .join("");

  const notesBlock = p.notes.trim()
    ? `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:28px;">
      <tr>
        <td style="background:${subtle};border-radius:8px;padding:16px 18px;">
          <div style="font-size:11px;font-weight:600;color:${muted};text-transform:uppercase;letter-spacing:0.04em;margin-bottom:8px;">Notes</div>
          <div style="font-size:14px;color:${text};line-height:1.55;white-space:pre-wrap;">${escapeHtml(p.notes.trim())}</div>
        </td>
      </tr>
    </table>`
    : "";

  const payUrl = escapeHtml(p.checkoutUrl);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Invoice ${escapeHtml(p.invoiceNumber)}</title>
</head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:12px;border:1px solid ${border};overflow:hidden;">
          <tr>
            <td style="padding:28px 28px 8px;">
              <div style="font-size:11px;font-weight:600;color:${muted};text-transform:uppercase;letter-spacing:0.06em;">${escapeHtml(p.merchantName)}</div>
              <div style="font-size:28px;font-weight:700;color:${accent};margin-top:6px;line-height:1.2;">Invoice</div>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 28px 0;text-align:right;">
              <div style="font-size:11px;color:${muted};text-transform:uppercase;">Invoice #</div>
              <div style="font-size:15px;font-weight:600;color:${text};">${escapeHtml(p.invoiceNumber)}</div>
              <div style="font-size:11px;color:${muted};text-transform:uppercase;margin-top:10px;">Issue date</div>
              <div style="font-size:14px;font-weight:600;color:${text};">${escapeHtml(formatDate(p.issuedAtIso))}</div>
              <div style="font-size:11px;color:${muted};text-transform:uppercase;margin-top:10px;">Due date</div>
              <div style="font-size:14px;font-weight:600;color:${text};">${escapeHtml(formatDate(p.dueAtIso))}</div>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 28px 8px;">
              <div style="font-size:11px;font-weight:600;color:${muted};text-transform:uppercase;letter-spacing:0.04em;margin-bottom:8px;">Bill to</div>
              <div style="font-size:16px;font-weight:600;color:${text};">${escapeHtml(p.clientName)}</div>
              ${p.clientEmail ? `<div style="font-size:14px;color:${muted};margin-top:4px;">${escapeHtml(p.clientEmail)}</div>` : ""}
            </td>
          </tr>
          <tr>
            <td style="padding:8px 28px 0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
                <thead>
                  <tr>
                    <th align="left" style="padding:10px 12px;border-bottom:2px solid ${border};font-size:11px;font-weight:600;color:${muted};text-transform:uppercase;">Item</th>
                    <th align="right" style="padding:10px 12px;border-bottom:2px solid ${border};font-size:11px;font-weight:600;color:${muted};text-transform:uppercase;">Qty</th>
                    <th align="right" style="padding:10px 12px;border-bottom:2px solid ${border};font-size:11px;font-weight:600;color:${muted};text-transform:uppercase;">Rate</th>
                    <th align="right" style="padding:10px 12px;border-bottom:2px solid ${border};font-size:11px;font-weight:600;color:${muted};text-transform:uppercase;">Amount</th>
                  </tr>
                </thead>
                <tbody>${rows}</tbody>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 28px 0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="right" style="padding:8px 12px;font-size:14px;color:${muted};">Subtotal</td>
                  <td align="right" style="padding:8px 12px;font-size:14px;font-weight:600;color:${text};width:120px;">${formatMoney(p.subtotal, p.currency)}</td>
                </tr>
                <tr>
                  <td align="right" style="padding:8px 12px;font-size:15px;font-weight:700;color:${text};">Total due</td>
                  <td align="right" style="padding:8px 12px;font-size:17px;font-weight:700;color:${accent};">${formatMoney(p.subtotal, p.currency)}</td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:0 28px;">${notesBlock}</td>
          </tr>
          <tr>
            <td style="padding:28px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#faf5ff;border:1px solid ${accent};border-radius:10px;">
                <tr>
                  <td style="padding:22px 24px;text-align:center;">
                    <div style="font-size:15px;font-weight:700;color:${accent};margin-bottom:14px;">Pay online</div>
                    <a href="${payUrl}" style="display:inline-block;padding:12px 28px;background:${accent};color:#ffffff !important;text-decoration:none;border-radius:8px;font-weight:600;font-size:15px;">Pay now</a>
                    <div style="margin-top:16px;font-size:12px;color:${muted};line-height:1.5;">If the button does not work, copy and paste this link:<br><a href="${payUrl}" style="color:${accent};word-break:break-all;">${payUrl}</a></div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:0 28px 28px;text-align:center;border-top:1px solid ${border};">
              <div style="padding-top:18px;font-size:11px;color:${muted};">Powered by Unseen Finance</div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
