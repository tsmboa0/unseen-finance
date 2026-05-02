import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { requireApiKey } from "@/lib/auth";

type Params = { params: Promise<{ keyId: string }> };

// ─── PATCH /api/v1/api-keys/[keyId] — Update name ───────────────────────────

export async function PATCH(req: NextRequest, { params }: Params) {
  const auth = await requireApiKey(req);
  if (auth instanceof NextResponse) return auth;
  const { merchant } = auth;

  const { keyId } = await params;

  const existing = await prisma.apiKeyRecord.findFirst({
    where: { id: keyId, merchantId: merchant.id },
  });

  if (!existing) {
    return NextResponse.json({ error: "API key not found" }, { status: 404 });
  }

  let body: { name?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const updated = await prisma.apiKeyRecord.update({
    where: { id: keyId },
    data: { name: body.name?.trim() ?? existing.name },
    select: { id: true, name: true, prefix: true, environment: true, status: true, createdAt: true },
  });

  return NextResponse.json(updated);
}

// ─── DELETE /api/v1/api-keys/[keyId] — Revoke key ───────────────────────────

export async function DELETE(req: NextRequest, { params }: Params) {
  const auth = await requireApiKey(req);
  if (auth instanceof NextResponse) return auth;
  const { merchant } = auth;

  const { keyId } = await params;

  const existing = await prisma.apiKeyRecord.findFirst({
    where: { id: keyId, merchantId: merchant.id },
  });

  if (!existing) {
    return NextResponse.json({ error: "API key not found" }, { status: 404 });
  }

  if (existing.status === "revoked") {
    return NextResponse.json({ error: "Key is already revoked" }, { status: 409 });
  }

  await prisma.apiKeyRecord.update({
    where: { id: keyId },
    data: { status: "revoked" },
  });

  return NextResponse.json({ success: true, id: keyId, status: "revoked" });
}
