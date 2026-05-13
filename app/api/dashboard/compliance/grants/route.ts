import { NextRequest, NextResponse } from "next/server";
import { PublicKey } from "@solana/web3.js";
import prisma from "@/lib/db";
import { requirePrivyAuthForDashboard } from "@/lib/privy";
import { dashboardApiRequireMerchant } from "@/lib/dashboard-api-auth";

function isHex64(s: string): boolean {
  return /^[0-9a-f]{64}$/i.test(s.trim().replace(/^0x/i, ""));
}

function normalizeX25519Hex(s: string): string {
  return s.trim().replace(/^0x/i, "").toLowerCase();
}

function assertValidWallet(addr: string): string {
  const trimmed = addr.trim();
  try {
    new PublicKey(trimmed);
  } catch {
    throw new Error("Invalid Solana address.");
  }
  return trimmed;
}

export async function GET(request: NextRequest) {
  const auth = await requirePrivyAuthForDashboard(request as unknown as Request);
  const gate = dashboardApiRequireMerchant(auth);
  if (gate instanceof NextResponse) return gate;
  const { merchant } = gate;

  const grants = await prisma.complianceGrant.findMany({
    where: { merchantId: merchant.id },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return NextResponse.json({ grants });
}

export async function POST(request: NextRequest) {
  const auth = await requirePrivyAuthForDashboard(request as unknown as Request);
  const gate = dashboardApiRequireMerchant(auth);
  if (gate instanceof NextResponse) return gate;
  const { merchant } = gate;

  let body: {
    label?: string;
    receiverWallet?: string;
    receiverX25519Hex?: string;
    nonceDecimal?: string;
    createTxSignature?: string;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const label = typeof body.label === "string" ? body.label.trim().slice(0, 200) : "";
  const receiverX25519Hex = normalizeX25519Hex(
    typeof body.receiverX25519Hex === "string" ? body.receiverX25519Hex : "",
  );
  const nonceDecimal =
    typeof body.nonceDecimal === "string" ? body.nonceDecimal.trim().replace(/\s+/g, "") : "";
  const createTxSignature = typeof body.createTxSignature === "string" ? body.createTxSignature.trim() : "";

  if (!label) {
    return NextResponse.json({ error: "Label is required" }, { status: 400 });
  }
  if (!createTxSignature) {
    return NextResponse.json({ error: "createTxSignature is required" }, { status: 400 });
  }
  if (!isHex64(receiverX25519Hex)) {
    return NextResponse.json({ error: "receiverX25519Hex must be 64 hex characters" }, { status: 400 });
  }
  if (!/^\d+$/.test(nonceDecimal)) {
    return NextResponse.json({ error: "nonceDecimal must be a decimal integer string" }, { status: 400 });
  }

  let receiverWallet: string;
  try {
    receiverWallet = assertValidWallet(typeof body.receiverWallet === "string" ? body.receiverWallet : "");
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Bad address" }, { status: 400 });
  }

  const grant = await prisma.complianceGrant.create({
    data: {
      merchantId: merchant.id,
      label,
      receiverWallet,
      receiverX25519Hex,
      nonceDecimal,
      createTxSignature,
      status: "active",
    },
  });

  return NextResponse.json({ grant });
}

export async function PATCH(request: NextRequest) {
  const auth = await requirePrivyAuthForDashboard(request as unknown as Request);
  const gate = dashboardApiRequireMerchant(auth);
  if (gate instanceof NextResponse) return gate;
  const { merchant } = gate;

  let body: {
    id?: string;
    action?: string;
    revokeTxSignature?: string;
    lastChainCheckExists?: boolean;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const id = typeof body.id === "string" ? body.id : "";
  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  const existing = await prisma.complianceGrant.findFirst({
    where: { id, merchantId: merchant.id },
  });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (body.action === "revoke") {
    const revokeTxSignature =
      typeof body.revokeTxSignature === "string" ? body.revokeTxSignature.trim() : "";
    if (!revokeTxSignature) {
      return NextResponse.json({ error: "revokeTxSignature is required" }, { status: 400 });
    }
    const grant = await prisma.complianceGrant.update({
      where: { id },
      data: {
        status: "revoked",
        revokeTxSignature,
        revokedAt: new Date(),
      },
    });
    return NextResponse.json({ grant });
  }

  if (body.action === "chain_check") {
    if (typeof body.lastChainCheckExists !== "boolean") {
      return NextResponse.json({ error: "lastChainCheckExists boolean required" }, { status: 400 });
    }
    const grant = await prisma.complianceGrant.update({
      where: { id },
      data: {
        lastChainCheckExists: body.lastChainCheckExists,
        lastChainCheckAt: new Date(),
      },
    });
    return NextResponse.json({ grant });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
