-- CreateTable
CREATE TABLE "ComplianceGrant" (
    "id" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "receiverWallet" TEXT NOT NULL,
    "receiverX25519Hex" TEXT NOT NULL,
    "nonceDecimal" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createTxSignature" TEXT,
    "revokeTxSignature" TEXT,
    "lastChainCheckAt" TIMESTAMP(3),
    "lastChainCheckExists" BOOLEAN,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "ComplianceGrant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ComplianceDisclosureReport" (
    "id" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "dateFrom" TIMESTAMP(3) NOT NULL,
    "dateTo" TIMESTAMP(3) NOT NULL,
    "txType" TEXT NOT NULL DEFAULT 'all',
    "productsJson" TEXT NOT NULL,
    "recipientEmail" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ready',
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approxSizeBytes" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ComplianceDisclosureReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ComplianceGrant_merchantId_status_idx" ON "ComplianceGrant"("merchantId", "status");

-- CreateIndex
CREATE INDEX "ComplianceGrant_merchantId_createdAt_idx" ON "ComplianceGrant"("merchantId", "createdAt");

-- CreateIndex
CREATE INDEX "ComplianceDisclosureReport_merchantId_createdAt_idx" ON "ComplianceDisclosureReport"("merchantId", "createdAt");

-- AddForeignKey
ALTER TABLE "ComplianceGrant" ADD CONSTRAINT "ComplianceGrant_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComplianceDisclosureReport" ADD CONSTRAINT "ComplianceDisclosureReport_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
