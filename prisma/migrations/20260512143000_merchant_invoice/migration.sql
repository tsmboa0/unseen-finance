-- CreateTable
CREATE TABLE "MerchantInvoice" (
    "id" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "clientName" TEXT NOT NULL,
    "clientEmail" TEXT,
    "lineItems" JSONB NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USDC',
    "subtotalDisplay" DOUBLE PRECISION NOT NULL,
    "totalAmountRaw" BIGINT NOT NULL,
    "mint" TEXT NOT NULL,
    "notes" TEXT,
    "dueAt" TIMESTAMP(3) NOT NULL,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paymentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MerchantInvoice_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MerchantInvoice_paymentId_key" ON "MerchantInvoice"("paymentId");

-- CreateIndex
CREATE UNIQUE INDEX "MerchantInvoice_merchantId_invoiceNumber_key" ON "MerchantInvoice"("merchantId", "invoiceNumber");

-- CreateIndex
CREATE INDEX "MerchantInvoice_merchantId_status_idx" ON "MerchantInvoice"("merchantId", "status");

-- CreateIndex
CREATE INDEX "MerchantInvoice_merchantId_createdAt_idx" ON "MerchantInvoice"("merchantId", "createdAt");

-- AddForeignKey
ALTER TABLE "MerchantInvoice" ADD CONSTRAINT "MerchantInvoice_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MerchantInvoice" ADD CONSTRAINT "MerchantInvoice_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
