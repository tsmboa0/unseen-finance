import prisma from "@/lib/db";

/** Normalize email for beta allowlist / pending lookups (lowercase, trim). */
export function normalizeBetaProgramEmail(email: string): string {
  return email.trim().toLowerCase();
}

export async function isBetaEmailApproved(normalizedEmail: string): Promise<boolean> {
  const row = await prisma.betaProgramAllowlistEntry.findFirst({
    where: { email: normalizedEmail, active: true },
    select: { id: true },
  });
  return Boolean(row);
}

export async function getBetaProgramAccessState(normalizedEmail: string): Promise<{
  allowed: boolean;
  pendingRequest: boolean;
}> {
  const allowed = await isBetaEmailApproved(normalizedEmail);
  if (allowed) {
    return { allowed: true, pendingRequest: false };
  }
  const pending = await prisma.betaProgramPendingAccess.findUnique({
    where: { email: normalizedEmail },
    select: { id: true },
  });
  return { allowed: false, pendingRequest: Boolean(pending) };
}
