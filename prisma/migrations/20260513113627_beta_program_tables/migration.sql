-- CreateTable
CREATE TABLE "beta_program_allowlist" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "note" TEXT,
    "source" TEXT NOT NULL DEFAULT 'manual',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "beta_program_allowlist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "beta_program_pending_access" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "privyUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "beta_program_pending_access_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "beta_program_allowlist_email_key" ON "beta_program_allowlist"("email");

-- CreateIndex
CREATE UNIQUE INDEX "beta_program_pending_access_email_key" ON "beta_program_pending_access"("email");
