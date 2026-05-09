-- Add merchant onboarding profile fields.
ALTER TABLE "Merchant"
ADD COLUMN "businessSize" TEXT,
ADD COLUMN "industry" TEXT,
ADD COLUMN "country" TEXT,
ADD COLUMN "onboardingCompletedAt" TIMESTAMP(3);

-- Existing merchants have already onboarded outside this new flow.
UPDATE "Merchant"
SET "onboardingCompletedAt" = NOW()
WHERE "onboardingCompletedAt" IS NULL;
