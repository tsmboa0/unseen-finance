import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { requireAdminPrivyAuth } from "@/lib/admin-auth";

export async function GET(request: Request) {
  const { admin, error } = await requireAdminPrivyAuth(request);
  if (!admin) {
    return NextResponse.json({ error: error ?? "Unauthorized" }, { status: error === "Forbidden" ? 403 : 401 });
  }

  const rows = await prisma.betaProgramPendingAccess.findMany({
    orderBy: { createdAt: "desc" },
    take: 500,
  });

  return NextResponse.json({
    pending: rows.map((r) => ({
      id: r.id,
      email: r.email,
      privyUserId: r.privyUserId,
      createdAt: r.createdAt.toISOString(),
    })),
  });
}
