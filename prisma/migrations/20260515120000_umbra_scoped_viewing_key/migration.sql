-- CreateTable
CREATE TABLE "UmbraScopedViewingKey" (
    "id" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "mintAddress" TEXT NOT NULL,
    "year" INTEGER,
    "month" INTEGER,
    "day" INTEGER,
    "hour" INTEGER,
    "minute" INTEGER,
    "second" INTEGER,
    "keyHex" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UmbraScopedViewingKey_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UmbraScopedViewingKey_merchantId_createdAt_idx" ON "UmbraScopedViewingKey"("merchantId", "createdAt");

-- AddForeignKey
ALTER TABLE "UmbraScopedViewingKey" ADD CONSTRAINT "UmbraScopedViewingKey_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
