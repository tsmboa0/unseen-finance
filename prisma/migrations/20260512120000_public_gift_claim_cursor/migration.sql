-- CreateTable
CREATE TABLE "PublicGiftClaimCursor" (
    "id" TEXT NOT NULL,
    "recipientKey" TEXT NOT NULL,
    "network" TEXT NOT NULL,
    "treeBaselines" JSONB NOT NULL DEFAULT '{}',
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PublicGiftClaimCursor_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PublicGiftClaimCursor_recipientKey_network_key" ON "PublicGiftClaimCursor"("recipientKey", "network");

-- CreateIndex
CREATE INDEX "PublicGiftClaimCursor_network_idx" ON "PublicGiftClaimCursor"("network");

-- AlterTable
ALTER TABLE "GiftCard" DROP COLUMN IF EXISTS "recipientAddress";
