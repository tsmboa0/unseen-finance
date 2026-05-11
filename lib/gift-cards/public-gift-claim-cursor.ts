import { createHash } from "crypto";

import prisma from "@/lib/db";
import { merchantNetworkToUmbra } from "@/lib/solana-endpoints";

/**
 * Opaque id for correlating Umbra claim baselines without storing recipient pubkeys on gift rows.
 * Merchants never see this; it is only used server-side for indexer scan floors.
 */
export function publicGiftRecipientKey(recipientAddress: string, network: string): string {
  const umbra = merchantNetworkToUmbra(network);
  const norm = recipientAddress.trim();
  return createHash("sha256").update(`${norm}|${umbra}`).digest("hex");
}

export function treeBaselinesJsonToMap(json: unknown): Map<number, bigint> {
  const m = new Map<number, bigint>();
  if (!json || typeof json !== "object" || Array.isArray(json)) return m;
  for (const [k, v] of Object.entries(json as Record<string, unknown>)) {
    const tree = Number(k);
    if (!Number.isFinite(tree) || tree < 0) continue;
    const s = typeof v === "string" ? v : typeof v === "number" && Number.isFinite(v) ? String(Math.trunc(v)) : "";
    if (!s) continue;
    try {
      m.set(tree, BigInt(s));
    } catch {
      /* skip invalid */
    }
  }
  return m;
}

export function treeBaselinesMapToJson(map: Map<number, bigint>): Record<string, string> {
  const o: Record<string, string> = {};
  for (const [t, ins] of map) o[String(t)] = ins.toString();
  return o;
}

export async function loadPublicGiftClaimBaselineMap(
  recipientKey: string,
  network: string,
): Promise<Map<number, bigint>> {
  const row = await prisma.publicGiftClaimCursor.findUnique({
    where: { recipientKey_network: { recipientKey, network } },
    select: { treeBaselines: true },
  });
  return treeBaselinesJsonToMap(row?.treeBaselines ?? null);
}

export async function upsertPublicGiftClaimBaseline(args: {
  recipientKey: string;
  network: string;
  treeIndex: number;
  insertionIndex: bigint;
}): Promise<void> {
  const { recipientKey, network, treeIndex, insertionIndex } = args;
  await prisma.$transaction(async (tx) => {
    const row = await tx.publicGiftClaimCursor.findUnique({
      where: { recipientKey_network: { recipientKey, network } },
      select: { treeBaselines: true },
    });
    const map = treeBaselinesJsonToMap(row?.treeBaselines ?? null);
    const t = treeIndex;
    const prev = map.get(t) ?? BigInt(-1);
    if (insertionIndex > prev) map.set(t, insertionIndex);
    await tx.publicGiftClaimCursor.upsert({
      where: { recipientKey_network: { recipientKey, network } },
      create: {
        recipientKey,
        network,
        treeBaselines: treeBaselinesMapToJson(map),
      },
      update: { treeBaselines: treeBaselinesMapToJson(map) },
    });
  });
}
