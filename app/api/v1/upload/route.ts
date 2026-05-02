import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { requireApiKey } from "@/lib/auth";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/svg+xml"];
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

// ─── POST /api/v1/upload ──────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const auth = await requireApiKey(req);
  if (auth instanceof NextResponse) return auth;
  const { merchant } = auth;

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 422 });

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({
      error: `File type not allowed. Allowed: ${ALLOWED_TYPES.join(", ")}`,
    }, { status: 422 });
  }

  if (file.size > MAX_SIZE_BYTES) {
    return NextResponse.json({ error: "File too large (max 5 MB)" }, { status: 422 });
  }

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "bin";
  const safeName = `${merchant.id}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;

  const uploadsDir = join(process.cwd(), "public", "uploads");
  await mkdir(uploadsDir, { recursive: true });

  const bytes = await file.arrayBuffer();
  await writeFile(join(uploadsDir, safeName), Buffer.from(bytes));

  const url = `/uploads/${safeName}`;

  return NextResponse.json({ url }, { status: 201 });
}
