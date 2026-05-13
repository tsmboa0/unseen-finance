import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { requirePrivyAuthForDashboard } from "@/lib/privy";
import { dashboardApiUnauthorized } from "@/lib/dashboard-api-auth";
import { generateApiKey, generateWebhookSecret } from "@/lib/utils";

type OnboardingPayload = {
  businessName?: unknown;
  businessSize?: unknown;
  industry?: unknown;
  country?: unknown;
  ownerName?: unknown;
  email?: unknown;
  timezone?: unknown;
};

function toHandle(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function prismaCode(e: unknown): string | null {
  if (typeof e !== "object" || e === null || !("code" in e)) return null;
  const code = (e as { code?: unknown }).code;
  return typeof code === "string" ? code : null;
}

/**
 * POST /api/dashboard/onboarding
 *
 * For new users (no merchant record yet): CREATES the merchant.
 * For users who somehow have a merchant but haven't finished onboarding: UPDATES it.
 */
export async function POST(request: Request) {
  const auth = await requirePrivyAuthForDashboard(request);

  const unauthorized = dashboardApiUnauthorized(auth);
  if (unauthorized) return unauthorized;

  const authUser = auth.authUser;
  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { merchant } = auth;

  let body: OnboardingPayload;
  try {
    body = (await request.json()) as OnboardingPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const businessName = typeof body.businessName === "string" ? body.businessName.trim() : "";
  const businessSize = typeof body.businessSize === "string" ? body.businessSize.trim() : "";
  const industry     = typeof body.industry     === "string" ? body.industry.trim()     : "";
  const country      = typeof body.country      === "string" ? body.country.trim()      : "";
  const ownerName    = typeof body.ownerName    === "string" ? body.ownerName.trim()    : "";
  const email        = typeof body.email        === "string" ? body.email.trim()        : "";
  const timezone     = typeof body.timezone     === "string" ? body.timezone.trim()     : "";

  if (businessName.length < 2)  return NextResponse.json({ error: "Business name must be at least 2 characters" }, { status: 400 });
  if (businessSize.length === 0) return NextResponse.json({ error: "Select your business size" },                  { status: 400 });
  if (industry.length     === 0) return NextResponse.json({ error: "Select your business type" },                  { status: 400 });
  if (country.length      === 0) return NextResponse.json({ error: "Select your country" },                        { status: 400 });
  if (ownerName.length    < 2)  return NextResponse.json({ error: "Full name must be at least 2 characters" },     { status: 400 });
  if (!email.includes("@"))     return NextResponse.json({ error: "Enter a valid email" },                         { status: 400 });
  if (timezone.length     === 0) return NextResponse.json({ error: "Timezone is required" },                       { status: 400 });

  const normalizedHandle = toHandle(businessName) || toHandle(ownerName) || authUser.privyId.slice(0, 8);

  try {
    if (!merchant) {
      // ── New user: create the merchant record from scratch ──────────────────
      const apiKey       = generateApiKey("test");
      const apiKeyPrefix = apiKey.slice(0, 16) + "…";
      const webhookSecret = generateWebhookSecret();

      await prisma.merchant.create({
        data: {
          privyId:              authUser.privyId,
          name:                 businessName,
          businessSize,
          industry,
          country,
          ownerName,
          email,
          timezone,
          handle:               normalizedHandle,
          walletAddress:        authUser.walletAddress,
          apiKey,
          apiKeyPrefix,
          webhookSecret,
          network:              "devnet",
          onboardingCompletedAt: new Date(),
        },
      });
    } else {
      // ── Existing merchant (re-onboarding edge case) — update in place ──────
      await prisma.merchant.update({
        where: { id: merchant.id },
        data: {
          name:        businessName,
          businessSize,
          industry,
          country,
          ownerName,
          email,
          timezone,
          handle:      merchant.handle || normalizedHandle,
          onboardingCompletedAt: merchant.onboardingCompletedAt ?? new Date(),
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    if (prismaCode(e) === "P2002") {
      return NextResponse.json({ error: "That email is already used by another merchant" }, { status: 409 });
    }
    const message = e instanceof Error ? e.message : "Unable to complete onboarding";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
