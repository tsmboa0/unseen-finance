import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { requireAdminPrivyAuth } from "@/lib/admin-auth";
import { normalizeBetaProgramEmail } from "@/lib/beta-program";

export async function POST(request: Request) {
  const { admin, error } = await requireAdminPrivyAuth(request);
  if (!admin) {
    return NextResponse.json({ error: error ?? "Unauthorized" }, { status: error === "Forbidden" ? 403 : 401 });
  }

  let body: { email?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const raw = typeof body.email === "string" ? body.email : "";
  const email = normalizeBetaProgramEmail(raw);
  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "Valid email required" }, { status: 400 });
  }

  await prisma.$transaction(async (tx) => {
    await tx.betaProgramAllowlistEntry.upsert({
      where: { email },
      create: {
        email,
        source: "access_request",
        active: true,
      },
      update: {
        active: true,
        source: "access_request",
      },
    });
    await tx.betaProgramPendingAccess.deleteMany({ where: { email } });
  });

  const row = await prisma.betaProgramAllowlistEntry.findUnique({
    where: { email },
  });

  return NextResponse.json({
    entry: row
      ? {
          id: row.id,
          email: row.email,
          note: row.note,
          source: row.source,
          active: row.active,
          createdAt: row.createdAt.toISOString(),
          updatedAt: row.updatedAt.toISOString(),
        }
      : null,
  });
}
