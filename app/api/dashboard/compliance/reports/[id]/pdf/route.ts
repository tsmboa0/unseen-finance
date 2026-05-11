import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import React from "react";
import prisma from "@/lib/db";
import { requirePrivyAuth } from "@/lib/privy";
import type { Product } from "@/lib/dashboard-types";
import {
  ComplianceReportPdfDocument,
  productLabelsFromSlugs,
  type PdfComplianceEventRow,
} from "@/lib/compliance/pdf/compliance-report-pdf";
import { resolveUnseenPdfLogoPath } from "@/lib/pdf/unseen-logo-path";

export const runtime = "nodejs";

const PRODUCT_LABELS: Record<Product, string> = {
  gateway: "Gateway",
  payroll: "Payroll",
  storefronts: "Storefronts",
  x402: "x402",
  invoice: "Invoice",
  tiplinks: "Tiplinks",
  transfer: "Transfer",
  claim: "Claim",
  shield: "Shield",
  unshield: "Unshield",
  payment: "Payment",
};

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { merchant, error } = await requirePrivyAuth(request as unknown as Request);
  if (!merchant) {
    return NextResponse.json({ error: error ?? "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const report = await prisma.complianceDisclosureReport.findFirst({
    where: { id, merchantId: merchant.id },
  });

  if (!report) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let products: Product[] = [];
  try {
    const parsed = JSON.parse(report.productsJson) as unknown;
    if (Array.isArray(parsed)) {
      products = parsed.filter((p): p is Product => typeof p === "string");
    }
  } catch {
    products = [];
  }

  const events = await prisma.dashboardEvent.findMany({
    where: {
      merchantId: merchant.id,
      createdAt: { gte: report.dateFrom, lte: report.dateTo },
    },
    orderBy: { createdAt: "desc" },
    take: 400,
  });

  const filtered =
    report.txType === "inflow"
      ? events.filter((e) => e.direction === "in")
      : report.txType === "outflow"
        ? events.filter((e) => e.direction === "out")
        : events;

  let inflowTotal = 0;
  let outflowTotal = 0;
  for (const e of filtered) {
    if (e.currency === "SOL") continue;
    if (e.direction === "in") inflowTotal += e.amount;
    else outflowTotal += e.amount;
  }

  const pdfEvents: PdfComplianceEventRow[] = filtered.map((e) => ({
    atIso: e.createdAt.toISOString().slice(0, 19).replace("T", " "),
    direction: e.direction,
    category: e.category,
    amount: e.amount,
    currency: e.currency,
    counterparty: e.counterparty ?? "—",
    memo: e.memo ?? "—",
  }));

  const logoPath = resolveUnseenPdfLogoPath();

  const props = {
    logoPath,
    merchantName: merchant.name,
    title: report.title,
    dateFromIso: report.dateFrom.toISOString().slice(0, 10),
    dateToIso: report.dateTo.toISOString().slice(0, 10),
    txType: report.txType,
    productLabels: productLabelsFromSlugs(products, PRODUCT_LABELS),
    recipientEmail: report.recipientEmail ?? "",
    generatedAtIso: report.generatedAt.toISOString(),
    reportId: report.id,
    eventCount: filtered.length,
    inflowTotal,
    outflowTotal,
    events: pdfEvents,
  };

  const element = React.createElement(ComplianceReportPdfDocument, props);
  const buf = await renderToBuffer(element as never);

  const filename = `compliance-${report.id.slice(0, 8)}.pdf`;
  return new NextResponse(Buffer.from(buf), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
