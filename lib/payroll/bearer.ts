import type { NextRequest } from "next/server";

export function bearerTokenFromRequest(request: NextRequest): string | null {
  const h = request.headers.get("Authorization");
  if (!h?.startsWith("Bearer ")) return null;
  const t = h.slice(7).trim();
  return t.length > 0 ? t : null;
}
