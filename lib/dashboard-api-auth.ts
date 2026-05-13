import { NextResponse } from "next/server";
import type { Merchant } from "@prisma/client";
import type { AuthUser, DashboardPrivyAuthResult } from "@/lib/privy";

/** 401 / 403 before any merchant-only logic. */
export function dashboardApiUnauthorized(auth: DashboardPrivyAuthResult): NextResponse | null {
  if (!auth.authUser) {
    return NextResponse.json({ error: auth.error ?? "Unauthorized" }, { status: 401 });
  }
  if (auth.betaAccessDenied) {
    return NextResponse.json(
      { error: auth.error ?? "Beta access required", code: "BETA_REQUIRED" },
      { status: 403 },
    );
  }
  return null;
}

/** Require authenticated beta user with an existing merchant row. */
export function dashboardApiRequireMerchant(
  auth: DashboardPrivyAuthResult,
): NextResponse | { merchant: Merchant; authUser: AuthUser } {
  const early = dashboardApiUnauthorized(auth);
  if (early) return early;
  if (!auth.merchant || !auth.authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return { merchant: auth.merchant, authUser: auth.authUser };
}
