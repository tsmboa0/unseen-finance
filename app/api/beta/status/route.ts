import { NextResponse } from "next/server";
import { verifyPrivyToken } from "@/lib/privy";
import { getBetaProgramAccessState, normalizeBetaProgramEmail } from "@/lib/beta-program";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const authHeader = request.headers.get("Authorization");
  const token = authHeader?.replace("Bearer ", "").trim();
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const authUser = await verifyPrivyToken(token);
  if (!authUser?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const email = normalizeBetaProgramEmail(authUser.email);
  const state = await getBetaProgramAccessState(email);

  return NextResponse.json(
    {
      allowed: state.allowed,
      pendingRequest: state.pendingRequest,
    },
    {
      headers: {
        "Cache-Control": "private, no-store, max-age=0, must-revalidate",
      },
    },
  );
}
