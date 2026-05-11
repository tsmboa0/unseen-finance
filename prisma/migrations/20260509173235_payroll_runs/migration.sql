-- CreateTable
CREATE TABLE "PayrollRun" (
    "id" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "memo" TEXT NOT NULL,
    "currency" TEXT NOT NULL,
    "category" TEXT,
    "status" TEXT NOT NULL,
    "recipientCount" INTEGER NOT NULL,
    "successCount" INTEGER NOT NULL,
    "totalAmount" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PayrollRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayrollRunItem" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "destinationAddress" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL,
    "txHash" TEXT,
    "error" TEXT,

    CONSTRAINT "PayrollRunItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PayrollRun_merchantId_createdAt_idx" ON "PayrollRun"("merchantId", "createdAt");

-- CreateIndex
CREATE INDEX "PayrollRunItem_runId_idx" ON "PayrollRunItem"("runId");

-- AddForeignKey
ALTER TABLE "PayrollRun" ADD CONSTRAINT "PayrollRun_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollRunItem" ADD CONSTRAINT "PayrollRunItem_runId_fkey" FOREIGN KEY ("runId") REFERENCES "PayrollRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;
