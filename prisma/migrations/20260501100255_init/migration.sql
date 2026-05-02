-- CreateTable
CREATE TABLE "Merchant" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "walletAddress" TEXT,
    "apiKey" TEXT NOT NULL,
    "apiKeyPrefix" TEXT NOT NULL,
    "network" TEXT NOT NULL DEFAULT 'devnet',
    "webhookUrl" TEXT,
    "webhookSecret" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "merchantId" TEXT NOT NULL,
    "amount" BIGINT NOT NULL,
    "mint" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "description" TEXT,
    "metadata" TEXT,
    "txSignature" TEXT,
    "submittedAmount" BIGINT,
    "successUrl" TEXT,
    "cancelUrl" TEXT,
    "webhookUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "expiresAt" DATETIME NOT NULL,
    "confirmedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Payment_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Merchant_email_key" ON "Merchant"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Merchant_walletAddress_key" ON "Merchant"("walletAddress");

-- CreateIndex
CREATE UNIQUE INDEX "Merchant_apiKey_key" ON "Merchant"("apiKey");

-- CreateIndex
CREATE INDEX "Payment_merchantId_idx" ON "Payment"("merchantId");

-- CreateIndex
CREATE INDEX "Payment_merchantId_status_idx" ON "Payment"("merchantId", "status");

-- CreateIndex
CREATE INDEX "Payment_reference_idx" ON "Payment"("reference");

-- CreateIndex
CREATE INDEX "Payment_createdAt_idx" ON "Payment"("createdAt");
