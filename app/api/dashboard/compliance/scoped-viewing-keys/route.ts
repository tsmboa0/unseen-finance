import { NextRequest, NextResponse } from "next/server";
import { PublicKey } from "@solana/web3.js";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/client";
import prisma from "@/lib/db";
import { requirePrivyAuth } from "@/lib/privy";
import type { ScopedViewingKeyScope } from "@/lib/dashboard-types";

const SCOPES: ScopedViewingKeyScope[] = [
  "mint",
  "yearly",
  "monthly",
  "daily",
  "hourly",
  "minute",
  "second",
];

function isScope(s: string): s is ScopedViewingKeyScope {
  return (SCOPES as string[]).includes(s);
}

function isHex64(s: string): boolean {
  return /^[0-9a-f]{64}$/i.test(s.trim().replace(/^0x/i, ""));
}

function normalizeKeyHex(s: string): string {
  return s.trim().replace(/^0x/i, "").toLowerCase();
}

function assertMint(addr: string): string {
  const t = addr.trim();
  try {
    new PublicKey(t);
  } catch {
    throw new Error("Invalid mint address.");
  }
  return t;
}

function validateScopeFields(
  scope: ScopedViewingKeyScope,
  y: number | null,
  m: number | null,
  d: number | null,
  h: number | null,
  mi: number | null,
  s: number | null,
): void {
  const need = (
    cond: boolean,
    msg: string,
  ) => {
    if (!cond) throw new Error(msg);
  };

  switch (scope) {
    case "mint":
      need(y === null && m === null && d === null && h === null && mi === null && s === null, "Mint scope must not include calendar fields.");
      break;
    case "yearly":
      need(y !== null && m === null && d === null && h === null && mi === null && s === null, "Yearly scope requires year only.");
      need(y! >= 1970 && y! <= 9999, "Year out of range.");
      break;
    case "monthly":
      need(y !== null && m !== null && d === null && h === null && mi === null && s === null, "Monthly scope requires year and month.");
      need(y! >= 1970 && y! <= 9999, "Year out of range.");
      need(m! >= 1 && m! <= 12, "Month must be 1–12.");
      break;
    case "daily":
      need(y !== null && m !== null && d !== null && h === null && mi === null && s === null, "Daily scope requires year, month, and day.");
      need(y! >= 1970 && y! <= 9999, "Year out of range.");
      need(m! >= 1 && m! <= 12, "Month must be 1–12.");
      need(d! >= 1 && d! <= 31, "Day must be 1–31.");
      break;
    case "hourly":
      need(
        y !== null && m !== null && d !== null && h !== null && mi === null && s === null,
        "Hourly scope requires year, month, day, and hour (UTC).",
      );
      need(y! >= 1970 && y! <= 9999, "Year out of range.");
      need(m! >= 1 && m! <= 12, "Month must be 1–12.");
      need(d! >= 1 && d! <= 31, "Day must be 1–31.");
      need(h! >= 0 && h! <= 23, "Hour must be 0–23.");
      break;
    case "minute":
      need(
        y !== null && m !== null && d !== null && h !== null && mi !== null && s === null,
        "Minute scope requires year through minute (UTC).",
      );
      need(y! >= 1970 && y! <= 9999, "Year out of range.");
      need(m! >= 1 && m! <= 12, "Month must be 1–12.");
      need(d! >= 1 && d! <= 31, "Day must be 1–31.");
      need(h! >= 0 && h! <= 23, "Hour must be 0–23.");
      need(mi! >= 0 && mi! <= 59, "Minute must be 0–59.");
      break;
    case "second":
      need(
        y !== null && m !== null && d !== null && h !== null && mi !== null && s !== null,
        "Second scope requires full UTC timestamp components.",
      );
      need(y! >= 1970 && y! <= 9999, "Year out of range.");
      need(m! >= 1 && m! <= 12, "Month must be 1–12.");
      need(d! >= 1 && d! <= 31, "Day must be 1–31.");
      need(h! >= 0 && h! <= 23, "Hour must be 0–23.");
      need(mi! >= 0 && mi! <= 59, "Minute must be 0–59.");
      need(s! >= 0 && s! <= 59, "Second must be 0–59.");
      break;
  }
}

export async function GET(request: NextRequest) {
  const { merchant, error } = await requirePrivyAuth(request as unknown as Request);
  if (!merchant) {
    return NextResponse.json({ error: error ?? "Unauthorized" }, { status: 401 });
  }

  try {
    const rows = await prisma.umbraScopedViewingKey.findMany({
      where: { merchantId: merchant.id },
      orderBy: { createdAt: "desc" },
      take: 200,
    });
    return NextResponse.json({ keys: rows });
  } catch (e) {
    if (e instanceof PrismaClientKnownRequestError && e.code === "P2021") {
      return NextResponse.json({ keys: [] });
    }
    throw e;
  }
}

export async function POST(request: NextRequest) {
  const { merchant, error } = await requirePrivyAuth(request as unknown as Request);
  if (!merchant) {
    return NextResponse.json({ error: error ?? "Unauthorized" }, { status: 401 });
  }

  let body: {
    label?: string;
    scope?: string;
    mintAddress?: string;
    year?: number | null;
    month?: number | null;
    day?: number | null;
    hour?: number | null;
    minute?: number | null;
    second?: number | null;
    keyHex?: string;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const label = typeof body.label === "string" ? body.label.trim().slice(0, 200) : "";
  const scopeRaw = typeof body.scope === "string" ? body.scope.trim() : "";
  const keyHex = normalizeKeyHex(typeof body.keyHex === "string" ? body.keyHex : "");

  if (!label) {
    return NextResponse.json({ error: "Label is required" }, { status: 400 });
  }
  if (!isScope(scopeRaw)) {
    return NextResponse.json({ error: "Invalid scope" }, { status: 400 });
  }
  const scope = scopeRaw;
  if (!isHex64(keyHex)) {
    return NextResponse.json({ error: "keyHex must be 64 hexadecimal characters" }, { status: 400 });
  }

  let mintAddress: string;
  try {
    mintAddress = assertMint(typeof body.mintAddress === "string" ? body.mintAddress : "");
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Invalid mint" }, { status: 400 });
  }

  const toIntOrNull = (v: unknown): number | null => {
    if (v === null || v === undefined || v === "") return null;
    if (typeof v === "number" && Number.isInteger(v)) return v;
    if (typeof v === "string" && /^-?\d+$/.test(v.trim())) return Number(v.trim());
    return null;
  };

  const year = toIntOrNull(body.year);
  const month = toIntOrNull(body.month);
  const day = toIntOrNull(body.day);
  const hour = toIntOrNull(body.hour);
  const minute = toIntOrNull(body.minute);
  const second = toIntOrNull(body.second);

  try {
    validateScopeFields(scope, year, month, day, hour, minute, second);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Invalid fields" }, { status: 400 });
  }

  try {
    const created = await prisma.umbraScopedViewingKey.create({
      data: {
        merchantId: merchant.id,
        label,
        scope,
        mintAddress,
        year: year ?? undefined,
        month: month ?? undefined,
        day: day ?? undefined,
        hour: hour ?? undefined,
        minute: minute ?? undefined,
        second: second ?? undefined,
        keyHex,
      },
    });
    return NextResponse.json({ key: created });
  } catch (e) {
    if (e instanceof PrismaClientKnownRequestError && e.code === "P2021") {
      return NextResponse.json({ error: "Database migration required for viewing keys" }, { status: 503 });
    }
    throw e;
  }
}
