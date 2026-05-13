import prisma from "@/lib/db";

const DAY_MS = 24 * 60 * 60 * 1000;

export type PlatformVolumeDay = {
  day: string;
  inflow: number;
  outflow: number;
  shielded: number;
};

function startOfUtcDay(ts: number): number {
  const d = new Date(ts);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

export function utcYmd(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function eachUtcDayInclusive(start: Date, end: Date): string[] {
  const out: string[] = [];
  const cur = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate()));
  const last = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate()));
  while (cur.getTime() <= last.getTime()) {
    out.push(utcYmd(cur));
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return out;
}

function txStatusFromPayment(status: string): "shielded" | "pending" | "failed" {
  if (status === "CONFIRMED") return "shielded";
  if (status === "EXPIRED" || status === "CANCELLED") return "failed";
  return "pending";
}

function txStatusFromEvent(category: string, status: string): string {
  if (status === "failed") return "failed";
  if (status === "pending") return "pending";
  if (category === "claim") return "claimed";
  if (category === "transfer") return "transferred";
  if (category === "unshield") return "unshielded";
  if (category === "payroll") return "released";
  return "shielded";
}

function addVolume(
  map: Map<number, { inflow: number; outflow: number; shielded: number }>,
  ts: number,
  rangeStartMs: number,
  rangeEndMs: number,
  direction: "in" | "out",
  status: string,
  amount: number,
) {
  if (ts < rangeStartMs || ts > rangeEndMs) return;
  if (!Number.isFinite(amount)) return;
  const day = startOfUtcDay(ts);
  const v = map.get(day) ?? { inflow: 0, outflow: 0, shielded: 0 };
  if (direction === "in") v.inflow += amount;
  else v.outflow += amount;
  if (status === "shielded") v.shielded += amount;
  map.set(day, v);
}

/**
 * Platform-wide daily volumes using the same semantics as `/api/dashboard/overview`
 * (payments + dashboard events + claimed Umbra UTXOs), aggregated across all merchants.
 */
export async function computePlatformVolumeSeries(days: number): Promise<{
  volumeSeries: PlatformVolumeDay[];
  rangeEndDayUtc: string;
  rangeDays: number;
}> {
  const safeDays = Math.min(90, Math.max(7, days));
  const now = Date.now();
  const rangeEndUtc = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate()));
  const rangeStartUtc = new Date(rangeEndUtc.getTime() - (safeDays - 1) * DAY_MS);
  const rangeStartMs = rangeStartUtc.getTime();
  const rangeEndMs = now;

  const rangeStartDate = new Date(rangeStartMs);

  const [events, payments, claims] = await Promise.all([
    prisma.dashboardEvent.findMany({
      where: { createdAt: { gte: rangeStartDate } },
      select: {
        direction: true,
        category: true,
        status: true,
        amount: true,
        createdAt: true,
      },
    }),
    prisma.payment.findMany({
      where: {
        OR: [{ createdAt: { gte: rangeStartDate } }, { confirmedAt: { gte: rangeStartDate } }],
      },
      select: {
        amount: true,
        status: true,
        createdAt: true,
        confirmedAt: true,
        mint: true,
      },
    }),
    prisma.umbraMerchantUtxo.findMany({
      where: {
        status: "claimed",
        claimedAt: { gte: rangeStartDate },
      },
      select: {
        amount: true,
        claimedAt: true,
      },
    }),
  ]);

  const volumeByDay = new Map<number, { inflow: number; outflow: number; shielded: number }>();

  for (const e of events) {
    const ts = e.createdAt.getTime();
    const direction = e.direction === "out" ? "out" : "in";
    const status = txStatusFromEvent(e.category, e.status);
    addVolume(volumeByDay, ts, rangeStartMs, rangeEndMs, direction, status, e.amount);
  }

  for (const p of payments) {
    const ts = (p.confirmedAt ?? p.createdAt).getTime();
    const status = txStatusFromPayment(p.status);
    const amount = Number(p.amount) / 1_000_000;
    addVolume(volumeByDay, ts, rangeStartMs, rangeEndMs, "in", status, amount);
  }

  for (const c of claims) {
    const ts = (c.claimedAt ?? new Date(rangeStartMs)).getTime();
    addVolume(volumeByDay, ts, rangeStartMs, rangeEndMs, "in", "claimed", c.amount);
  }

  const dayKeys = eachUtcDayInclusive(rangeStartUtc, rangeEndUtc);

  const volumeSeries: PlatformVolumeDay[] = dayKeys.map((day) => {
    const ts = Date.UTC(Number(day.slice(0, 4)), Number(day.slice(5, 7)) - 1, Number(day.slice(8, 10)));
    const v = volumeByDay.get(ts) ?? { inflow: 0, outflow: 0, shielded: 0 };
    return { day, inflow: v.inflow, outflow: v.outflow, shielded: v.shielded };
  });

  return {
    volumeSeries,
    rangeEndDayUtc: utcYmd(rangeEndUtc),
    rangeDays: safeDays,
  };
}
