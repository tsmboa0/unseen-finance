import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { PAYROLL_SIGNER_CONSENT_TTL_MS } from "@/lib/payroll/constants";
import { isPayrollDelegationApiEnabled } from "@/lib/privy-node";
import { requirePrivyAuth } from "@/lib/privy";

/** Records successful client-side `addSigners` so we can skip the delegation explainer until expiry. */
export async function POST(request: NextRequest) {
  if (!isPayrollDelegationApiEnabled()) {
    return NextResponse.json({ error: "Payroll delegation is not enabled." }, { status: 404 });
  }

  const { merchant, error } = await requirePrivyAuth(request as unknown as Request);
  if (!merchant) return NextResponse.json({ error: error ?? "Unauthorized" }, { status: 401 });

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
