import prisma from "@/lib/db";

/**
 * Next invoice number INV-{UTC year}-{001..} per merchant.
 */
export async function nextMerchantInvoiceNumber(merchantId: string): Promise<string> {
  const year = new Date().getUTCFullYear();
  const prefix = `INV-${year}-`;
  const last = await prisma.merchantInvoice.findFirst({
    where: { merchantId, invoiceNumber: { startsWith: prefix } },
    orderBy: { invoiceNumber: "desc" },
    select: { invoiceNumber: true },
  });
  let nextSeq = 1;
  if (last?.invoiceNumber) {
    const part = last.invoiceNumber.slice(prefix.length);
    const n = parseInt(part, 10);
    if (Number.isFinite(n)) nextSeq = n + 1;
  }
  return `${prefix}${String(nextSeq).padStart(3, "0")}`;
}
