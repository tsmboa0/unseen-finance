import prisma from "@/lib/db";

/** Set linked merchant invoice to paid when its Payment is confirmed. */
export async function syncMerchantInvoicePaidForPayment(paymentId: string): Promise<void> {
  await prisma.merchantInvoice.updateMany({
    where: { paymentId },
    data: { status: "paid" },
  });
}
