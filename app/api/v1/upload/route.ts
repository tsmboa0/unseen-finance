import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { requireApiKey } from "@/lib/auth";
import {
  getSupabaseAdmin,
  getSupabaseStorageBucket,
  getSupabaseStorageWithOpaqueSecret,
  pickAnySupabaseServiceKey,
  wantsSupabaseStorage,
} from "@/lib/supabase-admin";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/svg+xml"];

const MIME_BY_EXT: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  svg: "image/svg+xml",
};

const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

function effectiveMimeType(file: File, ext: string): string | null {
  if (file.type && ALLOWED_TYPES.includes(file.type)) return file.type;
  const fromExt = MIME_BY_EXT[ext];
  return fromExt && ALLOWED_TYPES.includes(fromExt) ? fromExt : null;
}

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

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "bin";
  const mime = effectiveMimeType(file, ext);
  if (!mime) {
    return NextResponse.json({
      error: `File type not allowed. Allowed: ${ALLOWED_TYPES.join(", ")}`,
    }, { status: 422 });
  }

  if (file.size > MAX_SIZE_BYTES) {
    return NextResponse.json({ error: "File too large (max 5 MB)" }, { status: 422 });
  }

  const safeName = `${Date.now()}_${Math.random().toString(36).slice(2, 10)}.${ext}`;
  const objectPath = `${merchant.id}/${safeName}`;
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  if (wantsSupabaseStorage() && !pickAnySupabaseServiceKey()) {
    return NextResponse.json(
      {
        error:
          "Supabase is partially configured: set SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SECRET_KEY to your service_role JWT (eyJ…) or secret key (sb_secret_…).",
      },
      { status: 422 },
    );
  }

  const supabaseJwt = getSupabaseAdmin();
  if (supabaseJwt) {
    const bucket = getSupabaseStorageBucket();
    const { error: uploadError } = await supabaseJwt.storage.from(bucket).upload(objectPath, buffer, {
      contentType: mime,
      upsert: false,
    });

    if (uploadError) {
      console.error("[upload] Supabase storage error:", uploadError.message);
      return NextResponse.json(
        { error: uploadError.message || "Storage upload failed" },
        { status: 502 },
      );
    }

    const { data: pub } = supabaseJwt.storage.from(bucket).getPublicUrl(objectPath);
    return NextResponse.json({ url: pub.publicUrl }, { status: 201 });
  }

  const storageOpaque = getSupabaseStorageWithOpaqueSecret();
  if (storageOpaque) {
    const bucket = getSupabaseStorageBucket();
    const { error: uploadError } = await storageOpaque.from(bucket).upload(objectPath, buffer, {
      contentType: mime,
      upsert: false,
    });

    if (uploadError) {
      console.error("[upload] Supabase storage error:", uploadError.message);
      return NextResponse.json(
        { error: uploadError.message || "Storage upload failed" },
        { status: 502 },
      );
    }

    const { data: pub } = storageOpaque.from(bucket).getPublicUrl(objectPath);
    return NextResponse.json({ url: pub.publicUrl }, { status: 201 });
  }

  // Local fallback when Supabase is not configured (e.g. local dev)
  const diskName = `${merchant.id}_${safeName}`;
  const uploadsDir = join(process.cwd(), "public", "uploads");
  await mkdir(uploadsDir, { recursive: true });
  await writeFile(join(uploadsDir, diskName), buffer);

  const url = `/uploads/${diskName}`;
  return NextResponse.json({ url }, { status: 201 });
}
