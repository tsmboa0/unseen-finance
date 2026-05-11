-- CreateTable
CREATE TABLE "GiftCard" (
    "id" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "network" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending_funding',
    "amountDisplay" DOUBLE PRECISION NOT NULL,
    "fundAmountRaw" BIGINT NOT NULL,
    "platformFeeRaw" BIGINT NOT NULL,
    "mint" TEXT NOT NULL,
    "memo" TEXT NOT NULL,
    "claimCodeHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "fundingTxSig" TEXT,
    "createUtxoTxSig" TEXT,
    "claimTxSig" TEXT,
    "utxoGenerationIndex" TEXT,
    "recipientAddress" TEXT,
    "claimError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "claimedAt" TIMESTAMP(3),
    "activatedAt" TIMESTAMP(3),

    CONSTRAINT "GiftCard_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GiftCard_claimCodeHash_key" ON "GiftCard"("claimCodeHash");

-- CreateIndex
CREATE INDEX "GiftCard_merchantId_createdAt_idx" ON "GiftCard"("merchantId", "createdAt");

-- CreateIndex
CREATE INDEX "GiftCard_merchantId_status_idx" ON "GiftCard"("merchantId", "status");

-- CreateIndex
CREATE INDEX "GiftCard_status_expiresAt_idx" ON "GiftCard"("status", "expiresAt");

-- AddForeignKey
ALTER TABLE "GiftCard" ADD CONSTRAINT "GiftCard_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
