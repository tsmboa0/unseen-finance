import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import React from "react";
import { PublicKey } from "@solana/web3.js";
import { collectAuditorUtxoRows } from "@/lib/auditor/indexer-utxo-report";
import { parseViewingKeyFieldHex, shortViewingKeyFingerprint } from "@/lib/auditor/viewing-key-hex";
import { AuditorViewingKeyReportPdfDocument } from "@/lib/compliance/pdf/auditor-viewing-key-report-pdf";
import { resolveUnseenPdfLogoPath } from "@/lib/pdf/unseen-logo-path";
import { getDefaultUmbraIndexerUrl } from "@/lib/solana-endpoints";

export const runtime = "nodejs";

function dayUtcStartMs(isoDate: string): number {
  const d = new Date(`${isoDate.trim()}T00:00:00.000Z`);
  if (Number.isNaN(d.getTime())) throw new Error("Invalid dateFrom.");
  return d.getTime();
}

function dayUtcEndMs(isoDate: string): number {
  const d = new Date(`${isoDate.trim()}T23:59:59.999Z`);
  if (Number.isNaN(d.getTime())) throw new Error("Invalid dateTo.");
  return d.getTime();
}

export async function POST(request: NextRequest) {
  let body: {
    network?: string;
    mintAddress?: string;
    viewingKeyHex?: string;
    dateFromUtc?: string | null;
    dateToUtc?: string | null;
    treeIndex?: number | null;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const networkRaw = typeof body.network === "string" ? body.network.trim().toLowerCase() : "";
  if (networkRaw !== "mainnet" && networkRaw !== "devnet") {
    return NextResponse.json({ error: "network must be mainnet or devnet" }, { status: 400 });
  }

  const mintRaw = typeof body.mintAddress === "string" ? body.mintAddress.trim() : "";
  if (!mintRaw) {
    return NextResponse.json({ error: "mintAddress is required" }, { status: 400 });
  }
  try {
    new PublicKey(mintRaw);
  } catch {
    return NextResponse.json({ error: "Invalid mint address" }, { status: 400 });
  }

  const vkRaw = typeof body.viewingKeyHex === "string" ? body.viewingKeyHex : "";
  try {
    parseViewingKeyFieldHex(vkRaw);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Invalid viewing key" }, { status: 400 });
  }

  let fromMs: number | undefined;
  let toMs: number | undefined;
  const df = body.dateFromUtc != null && String(body.dateFromUtc).trim() !== "" ? String(body.dateFromUtc).trim() : "";
  const dt = body.dateToUtc != null && String(body.dateToUtc).trim() !== "" ? String(body.dateToUtc).trim() : "";
  try {
    if (df) fromMs = dayUtcStartMs(df);
    if (dt) toMs = dayUtcEndMs(dt);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Invalid date" }, { status: 400 });
  }
  if (fromMs !== undefined && toMs !== undefined && fromMs > toMs) {
    return NextResponse.json({ error: "dateFromUtc must be on or before dateToUtc" }, { status: 400 });
  }

  let treeIndex: number | undefined;
  if (body.treeIndex !== null && body.treeIndex !== undefined) {
    const t = Number(body.treeIndex);
    if (!Number.isInteger(t) || t < 0) {
      return NextResponse.json({ error: "treeIndex must be a non-negative integer when set" }, { status: 400 });
    }
    treeIndex = t;
  }

  const indexerEndpoint = getDefaultUmbraIndexerUrl(networkRaw);

  let collected;
  try {
    collected = await collectAuditorUtxoRows({
      indexerEndpoint,
      mintAddress: mintRaw,
      treeIndex,
      fromUtcMs: fromMs,
      toUtcMs: toMs,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Indexer request failed";
    return NextResponse.json({ error: msg }, { status: 502 });
  }

  const logoPath = resolveUnseenPdfLogoPath();
  const generatedAtIso = new Date().toISOString();

  const element = React.createElement(AuditorViewingKeyReportPdfDocument, {
    logoPath,
    network: networkRaw,
    mintAddress: mintRaw,
    viewingKeyFingerprint: shortViewingKeyFingerprint(vkRaw),
    dateFromIso: df || undefined,
    dateToIso: dt || undefined,
    treeIndex,
    generatedAtIso,
    scannedCount: collected.scannedCount,
    matchedCount: collected.matchedCount,
    truncated: collected.truncated,
    rows: collected.rows,
  });

  const buf = await renderToBuffer(element as never);
  const filename = `unseen-auditor-utxo-${networkRaw}-${new Date().toISOString().slice(0, 10)}.pdf`;

  return new NextResponse(Buffer.from(buf), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
