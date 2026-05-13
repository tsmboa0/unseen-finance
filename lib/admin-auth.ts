import { verifyPrivyToken, type AuthUser } from "@/lib/privy";
import { normalizeBetaProgramEmail } from "@/lib/beta-program";

function parseAdminEmails(): string[] {
  const raw = process.env.ADMIN_EMAILS?.trim();
  if (!raw) {
    return [normalizeBetaProgramEmail("tsmboa@gmail.com")];
  }
  return raw
    .split(",")
    .map((s) => normalizeBetaProgramEmail(s))
    .filter(Boolean);
}

export async function requireAdminPrivyAuth(request: Request): Promise<{
  admin: AuthUser | null;
  error: string | null;
}> {
  const authHeader = request.headers.get("Authorization");
  const token = authHeader?.replace("Bearer ", "").trim();
  if (!token) {
    return { admin: null, error: "Authorization header missing" };
  }

  const authUser = await verifyPrivyToken(token);
  if (!authUser) {
    return { admin: null, error: "Invalid or expired session" };
  }

  const email = authUser.email ? normalizeBetaProgramEmail(authUser.email) : null;
  if (!email) {
    return { admin: null, error: "Admin email required" };
  }

  const admins = parseAdminEmails();
  if (!admins.includes(email)) {
    return { admin: null, error: "Forbidden" };
  }

  return { admin: authUser, error: null };
}
