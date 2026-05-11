import { NextRequest, NextResponse } from "next/server";
import { requirePrivyAuth } from "@/lib/privy";
import { nextMerchantInvoiceNumber } from "@/lib/invoice/invoice-number";

export async function GET(request: NextRequest) {
  const { merchant, error } = await requirePrivyAuth(request as unknown as Request);
  if (!merchant) {
    return NextResponse.json({ error: error ?? "Unauthorized" }, { status: 401 });
  }
  const number = await nextMerchantInvoiceNumber(merchant.id);
  return NextResponse.json({ number });
}
