-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "Merchant" (
    "id" TEXT NOT NULL,
    "privyId" TEXT,
    "name" TEXT NOT NULL,
    "handle" TEXT,
    "ownerName" TEXT,
    "email" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'Africa/Lagos',
    "walletAddress" TEXT,
    "apiKey" TEXT NOT NULL,
    "apiKeyPrefix" TEXT NOT NULL,
    "network" TEXT NOT NULL DEFAULT 'devnet',
    "plan" TEXT NOT NULL DEFAULT 'Starter',
    "kybStatus" TEXT NOT NULL DEFAULT 'Pending',
    "webhookUrl" TEXT,
    "webhookSecret" TEXT,
    "umbraRegistered" BOOLEAN NOT NULL DEFAULT false,
    "umbraRegisteredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Merchant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApiKeyRecord" (
    "id" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "prefix" TEXT NOT NULL,
    "hashedKey" TEXT NOT NULL,
    "environment" TEXT NOT NULL,
    "scopes" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "lastUsedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApiKeyRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "amount" BIGINT NOT NULL,
    "mint" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "description" TEXT,
    "metadata" TEXT,
    "txSignature" TEXT,
    "txSignatures" TEXT,
    "submittedAmount" BIGINT,
    "expectedOptionalDataHash" TEXT,
    "submittedOptionalDataHash" TEXT,
    "successUrl" TEXT,
    "cancelUrl" TEXT,
    "webhookUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "confirmedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Store" (
    "id" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "category" TEXT,
    "description" TEXT,
    "logoUrl" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'USDC',
    "privacy" TEXT NOT NULL DEFAULT 'shielded',
    "status" TEXT NOT NULL DEFAULT 'draft',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Store_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "shortDesc" TEXT,
    "longDesc" TEXT,
    "price" BIGINT NOT NULL,
    "mint" TEXT NOT NULL,
    "imageUrl" TEXT,
    "sku" TEXT,
    "stock" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'active',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "customerEmail" TEXT,
    "items" TEXT NOT NULL,
    "totalAmount" BIGINT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UmbraUtxoScanCursor" (
    "id" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "network" TEXT NOT NULL,
    "walletAddress" TEXT NOT NULL,
    "treeIndex" INTEGER NOT NULL DEFAULT 0,
    "nextInsertionIndex" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UmbraUtxoScanCursor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UmbraMerchantUtxo" (
    "id" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "network" TEXT NOT NULL,
    "walletAddress" TEXT NOT NULL,
    "treeIndex" INTEGER NOT NULL,
    "insertionIndex" INTEGER NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL,
    "usdValue" DOUBLE PRECISION NOT NULL,
    "sender" TEXT,
    "age" TEXT,
    "unlockerType" TEXT,
    "status" TEXT NOT NULL DEFAULT 'claimable',
    "claimTxSignature" TEXT,
    "claimError" TEXT,
    "claimedAt" TIMESTAMP(3),
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UmbraMerchantUtxo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DashboardEvent" (
    "id" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "network" TEXT NOT NULL,
    "walletAddress" TEXT,
    "category" TEXT NOT NULL,
    "direction" TEXT NOT NULL DEFAULT 'in',
    "status" TEXT NOT NULL DEFAULT 'completed',
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL,
    "counterparty" TEXT,
    "memo" TEXT,
    "txHash" TEXT,
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DashboardEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Merchant_privyId_key" ON "Merchant"("privyId");

-- CreateIndex
CREATE UNIQUE INDEX "Merchant_email_key" ON "Merchant"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Merchant_walletAddress_key" ON "Merchant"("walletAddress");

-- CreateIndex
CREATE UNIQUE INDEX "Merchant_apiKey_key" ON "Merchant"("apiKey");

-- CreateIndex
CREATE UNIQUE INDEX "ApiKeyRecord_hashedKey_key" ON "ApiKeyRecord"("hashedKey");

-- CreateIndex
CREATE INDEX "ApiKeyRecord_merchantId_idx" ON "ApiKeyRecord"("merchantId");

-- CreateIndex
CREATE INDEX "ApiKeyRecord_hashedKey_idx" ON "ApiKeyRecord"("hashedKey");

-- CreateIndex
CREATE INDEX "Payment_merchantId_idx" ON "Payment"("merchantId");

-- CreateIndex
CREATE INDEX "Payment_merchantId_status_idx" ON "Payment"("merchantId", "status");

-- CreateIndex
CREATE INDEX "Payment_reference_idx" ON "Payment"("reference");

-- CreateIndex
CREATE INDEX "Payment_createdAt_idx" ON "Payment"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Store_slug_key" ON "Store"("slug");

-- CreateIndex
CREATE INDEX "Store_merchantId_idx" ON "Store"("merchantId");

-- CreateIndex
CREATE INDEX "Store_slug_idx" ON "Store"("slug");

-- CreateIndex
CREATE INDEX "Product_storeId_idx" ON "Product"("storeId");

-- CreateIndex
CREATE INDEX "Product_storeId_status_idx" ON "Product"("storeId", "status");

-- CreateIndex
CREATE INDEX "Order_storeId_idx" ON "Order"("storeId");

-- CreateIndex
CREATE INDEX "Order_paymentId_idx" ON "Order"("paymentId");

-- CreateIndex
CREATE INDEX "UmbraUtxoScanCursor_merchantId_idx" ON "UmbraUtxoScanCursor"("merchantId");

-- CreateIndex
CREATE INDEX "UmbraUtxoScanCursor_walletAddress_idx" ON "UmbraUtxoScanCursor"("walletAddress");

-- CreateIndex
CREATE UNIQUE INDEX "UmbraUtxoScanCursor_merchantId_network_walletAddress_key" ON "UmbraUtxoScanCursor"("merchantId", "network", "walletAddress");

-- CreateIndex
CREATE INDEX "UmbraMerchantUtxo_merchantId_status_idx" ON "UmbraMerchantUtxo"("merchantId", "status");

-- CreateIndex
CREATE INDEX "UmbraMerchantUtxo_walletAddress_status_idx" ON "UmbraMerchantUtxo"("walletAddress", "status");

-- CreateIndex
CREATE UNIQUE INDEX "UmbraMerchantUtxo_merchantId_network_walletAddress_treeInde_key" ON "UmbraMerchantUtxo"("merchantId", "network", "walletAddress", "treeIndex", "insertionIndex");

-- CreateIndex
CREATE INDEX "DashboardEvent_merchantId_createdAt_idx" ON "DashboardEvent"("merchantId", "createdAt");

-- CreateIndex
CREATE INDEX "DashboardEvent_merchantId_category_idx" ON "DashboardEvent"("merchantId", "category");

-- AddForeignKey
ALTER TABLE "ApiKeyRecord" ADD CONSTRAINT "ApiKeyRecord_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Store" ADD CONSTRAINT "Store_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UmbraUtxoScanCursor" ADD CONSTRAINT "UmbraUtxoScanCursor_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UmbraMerchantUtxo" ADD CONSTRAINT "UmbraMerchantUtxo_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DashboardEvent" ADD CONSTRAINT "DashboardEvent_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
