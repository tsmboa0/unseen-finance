import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { verifyPrivyToken } from "@/lib/privy";
import {
  getBetaProgramAccessState,
  isBetaEmailApproved,
  normalizeBetaProgramEmail,
} from "@/lib/beta-program";

export async function POST(request: Request) {
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

  if (await isBetaEmailApproved(email)) {
    return NextResponse.json({ ok: true, alreadyApproved: true });
  }

  await prisma.betaProgramPendingAccess.upsert({
    where: { email },
    create: {
      email,
      privyUserId: authUser.privyId,
    },
    update: {
      privyUserId: authUser.privyId,
    },
  });

  const state = await getBetaProgramAccessState(email);

  return NextResponse.json({
    ok: true,
    pendingRequest: state.pendingRequest,
  });
}
