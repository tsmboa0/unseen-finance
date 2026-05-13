import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { requirePrivyAuthForDashboard } from "@/lib/privy";
import { dashboardApiRequireMerchant } from "@/lib/dashboard-api-auth";
import type { Product } from "@/lib/dashboard-types";

const ALLOWED: Product[] = [
  "gateway",
  "payroll",
  "storefronts",
  "x402",
  "invoice",
  "tiplinks",
];

function parseProducts(raw: unknown): Product[] {
  if (!Array.isArray(raw)) return [];
  const out: Product[] = [];
  for (const x of raw) {
    if (typeof x === "string" && (ALLOWED as string[]).includes(x)) {
      out.push(x as Product);
    }
  }
  return out;
}

export async function GET(request: NextRequest) {
  const auth = await requirePrivyAuthForDashboard(request as unknown as Request);
  const gate = dashboardApiRequireMerchant(auth);
  if (gate instanceof NextResponse) return gate;
  const { merchant } = gate;

  const reports = await prisma.complianceDisclosureReport.findMany({
    where: { merchantId: merchant.id },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return NextResponse.json({ reports });
}

export async function POST(request: NextRequest) {
  const auth = await requirePrivyAuthForDashboard(request as unknown as Request);
  const gate = dashboardApiRequireMerchant(auth);
  if (gate instanceof NextResponse) return gate;
  const { merchant } = gate;

  let body: {
    title?: string;
    dateFrom?: string;
    dateTo?: string;
    txType?: string;
    products?: string[];
    recipientEmail?: string;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const title = typeof body.title === "string" ? body.title.trim().slice(0, 300) : "";
  const dateFromRaw = typeof body.dateFrom === "string" ? body.dateFrom : "";
  const dateToRaw = typeof body.dateTo === "string" ? body.dateTo : "";
  const txType = body.txType === "inflow" || body.txType === "outflow" ? body.txType : "all";
  const products = parseProducts(body.products);
  const recipientEmail =
    typeof body.recipientEmail === "string" ? body.recipientEmail.trim().slice(0, 320) : "";

  if (!title) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }
  if (!dateFromRaw || !dateToRaw) {
    return NextResponse.json({ error: "dateFrom and dateTo are required (YYYY-MM-DD)" }, { status: 400 });
  }

  const dateFrom = new Date(`${dateFromRaw}T00:00:00.000Z`);
  const dateTo = new Date(`${dateToRaw}T23:59:59.999Z`);
  if (Number.isNaN(dateFrom.getTime()) || Number.isNaN(dateTo.getTime())) {
    return NextResponse.json({ error: "Invalid date range" }, { status: 400 });
  }
  if (dateFrom.getTime() > dateTo.getTime()) {
    return NextResponse.json({ error: "dateFrom must be before dateTo" }, { status: 400 });
  }

  const report = await prisma.complianceDisclosureReport.create({
    data: {
      merchantId: merchant.id,
      title,
      dateFrom,
      dateTo,
      txType,
      productsJson: JSON.stringify(products.length > 0 ? products : ALLOWED),
      recipientEmail: recipientEmail || null,
      status: "ready",
      approxSizeBytes: 48_000,
    },
  });

  return NextResponse.json({ report });
}
