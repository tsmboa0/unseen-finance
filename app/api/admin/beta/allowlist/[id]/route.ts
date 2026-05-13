import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { requireAdminPrivyAuth } from "@/lib/admin-auth";

type Params = { id: string };

export async function PATCH(request: Request, context: { params: Promise<Params> }) {
  const { admin, error } = await requireAdminPrivyAuth(request);
  if (!admin) {
    return NextResponse.json({ error: error ?? "Unauthorized" }, { status: error === "Forbidden" ? 403 : 401 });
  }

  const { id } = await context.params;

  let body: { active?: unknown; note?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const data: { active?: boolean; note?: string | null } = {};
  if (typeof body.active === "boolean") data.active = body.active;
  if (body.note === null) data.note = null;
  else if (typeof body.note === "string") data.note = body.note.trim() || null;

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "No updates" }, { status: 400 });
  }

  try {
    const row = await prisma.betaProgramAllowlistEntry.update({
      where: { id },
      data,
    });
    return NextResponse.json({
      entry: {
        id: row.id,
        email: row.email,
        note: row.note,
        source: row.source,
        active: row.active,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
      },
    });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
