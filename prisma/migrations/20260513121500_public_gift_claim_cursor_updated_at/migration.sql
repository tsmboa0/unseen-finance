-- Align PublicGiftClaimCursor.updatedAt with Prisma @updatedAt (no database default).
-- Safe to re-run if default was already dropped.
ALTER TABLE "PublicGiftClaimCursor" ALTER COLUMN "updatedAt" DROP DEFAULT;
