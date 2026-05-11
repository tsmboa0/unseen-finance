import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { requirePrivyAuth } from "@/lib/privy";

function serializeMerchant(merchant: {
  id: string;
  name: string;
  businessSize: string | null;
  industry: string | null;
  country: string | null;
  handle: string | null;
  ownerName: string | null;
  email: string | null;
  timezone: string;
  walletAddress: string | null;
  apiKey: string;
  apiKeyPrefix: string;
  network: string;
  plan: string;
  kybStatus: string;
  webhookUrl: string | null;
  umbraRegistered: boolean;
  umbraRegisteredAt: Date | null;
  payrollPrivySignerConsentAt: Date | null;
  payrollPrivySignerValidUntil: Date | null;
  onboardingCompletedAt: Date | null;
  createdAt: Date;
}) {
  return {
    id: merchant.id,
    name: merchant.name,
    businessSize: merchant.businessSize,
    industry: merchant.industry,
    country: merchant.country,
    handle: merchant.handle,
    ownerName: merchant.ownerName,
    email: merchant.email,
    timezone: merchant.timezone,
    walletAddress: merchant.walletAddress,
    apiKey: merchant.apiKey,
    apiKeyPrefix: merchant.apiKeyPrefix,
    network: merchant.network,
    plan: merchant.plan,
    kybStatus: merchant.kybStatus,
    webhookUrl: merchant.webhookUrl,
    umbraRegistered: merchant.umbraRegistered,
    umbraRegisteredAt: merchant.umbraRegisteredAt?.toISOString() ?? null,
    payrollPrivySignerConsentAt: merchant.payrollPrivySignerConsentAt?.toISOString() ?? null,
    payrollPrivySignerValidUntil: merchant.payrollPrivySignerValidUntil?.toISOString() ?? null,
    onboardingCompletedAt: merchant.onboardingCompletedAt?.toISOString() ?? null,
    createdAt: merchant.createdAt,
  };
}

function getPrismaErrorCode(error: unknown): string | null {
  if (typeof error !== "object" || error === null || !("code" in error)) return null;
  const code = (error as { code?: unknown }).code;
  return typeof code === "string" ? code : null;
}

function getPrismaErrorTarget(error: unknown): string[] {
  if (typeof error !== "object" || error === null || !("meta" in error)) return [];
  const meta = (error as { meta?: { target?: unknown } }).meta;
  return Array.isArray(meta?.target) ? meta.target.filter((item): item is string => typeof item === "string") : [];
}

// ─── GET /api/dashboard/me — Get current merchant profile ────────────────────
// Used by dashboard pages to fetch the authenticated merchant's info
// (including their API key for subsequent API calls).

export async function GET(req: NextRequest) {
  const { merchant, authUser, error } = await requirePrivyAuth(req as unknown as Request);

  // Not authenticated at all
  if (!authUser) {
    return NextResponse.json({ error: error ?? "Unauthorized" }, { status: 401 });
  }

  // Authenticated but no merchant yet — needs to complete onboarding
  if (!merchant) {
    return NextResponse.json({ newUser: true }, { status: 200 });
  }

  return NextResponse.json(serializeMerchant(merchant));
}

export async function PATCH(req: NextRequest) {
  const { merchant, error } = await requirePrivyAuth(req as unknown as Request);

  if (!merchant) {
    return NextResponse.json({ error: error ?? "Unauthorized" }, { status: 401 });
  }

  let body: {
    name?: unknown;
    businessSize?: unknown;
    industry?: unknown;
    country?: unknown;
    handle?: unknown;
    ownerName?: unknown;
    email?: unknown;
    timezone?: unknown;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const data: {
    name?: string;
    businessSize?: string | null;
    industry?: string | null;
    country?: string | null;
    handle?: string | null;
    ownerName?: string | null;
    email?: string | null;
    timezone?: string;
  } = {};

  if (body.name !== undefined) {
    if (typeof body.name !== "string" || body.name.trim().length < 2) {
      return NextResponse.json({ error: "Business name must be at least 2 characters" }, { status: 400 });
    }
    data.name = body.name.trim();
  }

  if (body.businessSize !== undefined) {
    if (body.businessSize === null || body.businessSize === "") {
      data.businessSize = null;
    } else if (typeof body.businessSize === "string") {
      data.businessSize = body.businessSize.trim();
    } else {
      return NextResponse.json({ error: "Business size must be a string" }, { status: 400 });
    }
  }

  if (body.industry !== undefined) {
    if (body.industry === null || body.industry === "") {
      data.industry = null;
    } else if (typeof body.industry === "string") {
      data.industry = body.industry.trim();
    } else {
      return NextResponse.json({ error: "Industry must be a string" }, { status: 400 });
    }
  }

  if (body.country !== undefined) {
    if (body.country === null || body.country === "") {
      data.country = null;
    } else if (typeof body.country === "string") {
      data.country = body.country.trim();
    } else {
      return NextResponse.json({ error: "Country must be a string" }, { status: 400 });
    }
  }

  if (body.handle !== undefined) {
    if (typeof body.handle !== "string") {
      return NextResponse.json({ error: "Handle must be a string" }, { status: 400 });
    }
    const normalized = body.handle
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    data.handle = normalized || null;
  }

  if (body.ownerName !== undefined) {
    if (typeof body.ownerName !== "string" || body.ownerName.trim().length < 2) {
      return NextResponse.json({ error: "Full name must be at least 2 characters" }, { status: 400 });
    }
    data.ownerName = body.ownerName.trim();
  }

  if (body.email !== undefined) {
    if (body.email === null || body.email === "") {
      if (merchant.email !== null) data.email = null;
    } else if (typeof body.email === "string" && body.email.includes("@")) {
      const nextEmail = body.email.trim();
      if (nextEmail !== merchant.email) data.email = nextEmail;
    } else {
      return NextResponse.json({ error: "Email must be valid" }, { status: 400 });
    }
  }

  if (body.timezone !== undefined) {
    if (typeof body.timezone !== "string" || body.timezone.trim().length === 0) {
      return NextResponse.json({ error: "Timezone is required" }, { status: 400 });
    }
    data.timezone = body.timezone.trim();
  }

  try {
    if (Object.keys(data).length === 0) {
      return NextResponse.json(serializeMerchant(merchant));
    }

    const updated = await prisma.merchant.update({
      where: { id: merchant.id },
      data,
    });

    return NextResponse.json(serializeMerchant(updated));
  } catch (updateError) {
    const code = getPrismaErrorCode(updateError);
    const target = getPrismaErrorTarget(updateError);

    if (code === "P2002") {
      const field = target[0] ?? "field";
      return NextResponse.json({ error: `That ${field} is already used by another merchant` }, { status: 409 });
    }

    if (code === "P2025") {
      return NextResponse.json({ error: "Merchant record was not found" }, { status: 404 });
    }

    console.error("Unable to update merchant settings", updateError);
    return NextResponse.json(
      { error: "Unable to update merchant settings. Check the server logs for the Prisma error." },
      { status: 500 },
    );
  }
}
