import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { PAYROLL_SIGNER_CONSENT_TTL_MS } from "@/lib/payroll/constants";
import { isPayrollDelegationApiEnabled } from "@/lib/privy-node";
import { requirePrivyAuthForDashboard } from "@/lib/privy";
import { dashboardApiRequireMerchant } from "@/lib/dashboard-api-auth";

/** Records successful client-side `addSigners` so we can skip the delegation explainer until expiry. */
export async function POST(request: NextRequest) {
  if (!isPayrollDelegationApiEnabled()) {
    return NextResponse.json({ error: "Payroll delegation is not enabled." }, { status: 404 });
  }

  const auth = await requirePrivyAuthForDashboard(request as unknown as Request);
  const gate = dashboardApiRequireMerchant(auth);
  if (gate instanceof NextResponse) return gate;
  const { merchant } = gate;

  const now = new Date();
  const validUntil = new Date(now.getTime() + PAYROLL_SIGNER_CONSENT_TTL_MS);

  const updated = await prisma.merchant.update({
    where: { id: merchant.id },
    data: {
      payrollPrivySignerConsentAt: now,
      payrollPrivySignerValidUntil: validUntil,
    },
  });

  return NextResponse.json({
    payrollPrivySignerConsentAt: updated.payrollPrivySignerConsentAt?.toISOString() ?? null,
    payrollPrivySignerValidUntil: updated.payrollPrivySignerValidUntil?.toISOString() ?? null,
  });
}
