import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { requireAdminPrivyAuth } from "@/lib/admin-auth";
import { computePlatformVolumeSeries } from "@/lib/admin-analytics-volume";

export const dynamic = "force-dynamic";

const DAY_MS = 24 * 60 * 60 * 1000;

export async function GET(request: Request) {
  const { admin, error } = await requireAdminPrivyAuth(request);
  if (!admin) {
    return NextResponse.json({ error: error ?? "Unauthorized" }, { status: error === "Forbidden" ? 403 : 401 });
  }

  const url = new URL(request.url);
  const days = Math.min(90, Math.max(7, Number(url.searchParams.get("days")) || 30));

  const now = new Date();
  const rangeEndUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const rangeStartUtc = new Date(rangeEndUtc.getTime() - (days - 1) * DAY_MS);

  const [payments, volumeBlock] = await Promise.all([
    prisma.payment.groupBy({
      by: ["status"],
      where: { createdAt: { gte: rangeStartUtc } },
      _count: { id: true },
      _sum: { amount: true },
    }),
    computePlatformVolumeSeries(days),
  ]);

  return NextResponse.json({
    rangeDays: volumeBlock.rangeDays,
    rangeEndDayUtc: volumeBlock.rangeEndDayUtc,
    volumeSeries: volumeBlock.volumeSeries,
    paymentStatusBreakdown: payments.map((row) => ({
      status: row.status,
      count: row._count.id,
      volumeRawSum: row._sum.amount?.toString() ?? "0",
    })),
    generatedAt: new Date().toISOString(),
  });
}
