import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import React from "react";
import prisma from "@/lib/db";
import { requirePrivyAuthForDashboard } from "@/lib/privy";
import { dashboardApiRequireMerchant } from "@/lib/dashboard-api-auth";
import { InvoicePdfDocument } from "@/lib/invoice/pdf/invoice-pdf";
import { resolveUnseenPdfLogoPath } from "@/lib/pdf/unseen-logo-path";
import type { InvoiceLineItemStored } from "@/lib/invoice/line-items";
import { invoicePayUrlFromAppBase } from "@/lib/invoice/invoice-pay-url";

export const runtime = "nodejs";

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = await requirePrivyAuthForDashboard(request as unknown as Request);
  const gate = dashboardApiRequireMerchant(auth);
  if (gate instanceof NextResponse) return gate;
  const { merchant } = gate;

  const { id } = await context.params;
  const inv = await prisma.merchantInvoice.findFirst({
    where: { id, merchantId: merchant.id },
    include: { payment: { select: { id: true, status: true } } },
  });

  if (!inv) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const rawLines = inv.lineItems;
  if (!Array.isArray(rawLines)) {
    return NextResponse.json({ error: "Invalid invoice data" }, { status: 500 });
  }

  const payUrl =
    inv.paymentId && inv.payment?.status === "PENDING" ? invoicePayUrlFromAppBase(inv.paymentId) : null;

  const logoPath = resolveUnseenPdfLogoPath();

  const element = React.createElement(InvoicePdfDocument, {
    logoPath,
    merchantName: merchant.name,
    invoiceNumber: inv.invoiceNumber,
    issuedAtIso: inv.issuedAt.toISOString(),
    dueAtIso: inv.dueAt.toISOString(),
    clientName: inv.clientName,
    clientEmail: inv.clientEmail ?? "",
    currency: inv.currency,
    lineItems: rawLines as InvoiceLineItemStored[],
    subtotal: inv.subtotalDisplay,
    notes: inv.notes ?? "",
    payUrl,
  });

  const buf = await renderToBuffer(element as never);

  const filename = `invoice-${inv.invoiceNumber.replace(/[^a-zA-Z0-9-]/g, "_")}.pdf`;
  return new NextResponse(Buffer.from(buf), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
