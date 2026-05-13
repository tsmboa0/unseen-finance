import { NextRequest, NextResponse } from "next/server";
import { requirePrivyAuthForDashboard } from "@/lib/privy";
import { dashboardApiRequireMerchant } from "@/lib/dashboard-api-auth";
import { nextMerchantInvoiceNumber } from "@/lib/invoice/invoice-number";

export async function GET(request: NextRequest) {
  const auth = await requirePrivyAuthForDashboard(request as unknown as Request);
  const gate = dashboardApiRequireMerchant(auth);
  if (gate instanceof NextResponse) return gate;
  const { merchant } = gate;
  const number = await nextMerchantInvoiceNumber(merchant.id);
  return NextResponse.json({ number });
}
