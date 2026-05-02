import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import prisma from "@/lib/db";
import { requireApiKey } from "@/lib/auth";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function generateRawApiKey(environment: string): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let rand = "";
  for (let i = 0; i < 40; i++) {
    rand += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  const prefix = environment === "live" ? "usk_live" : "usk_test";
  return `${prefix}_${rand}`;
}

function hashKey(rawKey: string): string {
  return createHash("sha256").update(rawKey).digest("hex");
}

// ─── GET /api/v1/api-keys — List merchant's API keys ─────────────────────────

export async function GET(req: NextRequest) {
  const auth = await requireApiKey(req);
  if (auth instanceof NextResponse) return auth;
  const { merchant } = auth;

  const keys = await prisma.apiKeyRecord.findMany({
    where: { merchantId: merchant.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      prefix: true,
      environment: true,
      scopes: true,
      status: true,
      lastUsedAt: true,
      createdAt: true,
    },
  });

  return NextResponse.json({
    data: keys.map((k) => ({
      ...k,
      scopes: JSON.parse(k.scopes) as string[],
    })),
  });
}

// ─── POST /api/v1/api-keys — Create a new API key ────────────────────────────

export async function POST(req: NextRequest) {
  const auth = await requireApiKey(req);
  if (auth instanceof NextResponse) return auth;
  const { merchant } = auth;

  let body: { name?: string; environment?: string; scopes?: string[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { name, environment = "test", scopes = [] } = body;

  if (!name?.trim()) {
    return NextResponse.json({ error: "name is required" }, { status: 422 });
  }
  if (!["test", "live"].includes(environment)) {
    return NextResponse.json({ error: "environment must be 'test' or 'live'" }, { status: 422 });
  }
  if (!Array.isArray(scopes) || scopes.length === 0) {
    return NextResponse.json({ error: "at least one scope is required" }, { status: 422 });
  }

  const rawKey = generateRawApiKey(environment);
  const hashedKey = hashKey(rawKey);
  const prefix = rawKey.slice(0, 16) + "…";

  const record = await prisma.apiKeyRecord.create({
    data: {
      merchantId: merchant.id,
      name: name.trim(),
      prefix,
      hashedKey,
      environment,
      scopes: JSON.stringify(scopes),
      status: "active",
    },
  });

  // Return the full key ONCE — it is never stored in plaintext
  return NextResponse.json({
    id: record.id,
    name: record.name,
    prefix: record.prefix,
    environment: record.environment,
    scopes,
    status: record.status,
    createdAt: record.createdAt,
    apiKey: rawKey,
  }, { status: 201 });
}
