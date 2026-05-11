import { getAddressDecoder } from "@solana/addresses";
import { ReadServiceClient, type UtxoDataResponse } from "@umbra-privacy/indexer-read-service-client";

const PAGE_SIZE = BigInt(1000);
const MAX_PAGES = 30;
const MAX_MATCHED = 400;

function base64ToAddress(b64: string): string {
  const buf = Buffer.from(b64, "base64");
  if (buf.length !== 32) throw new Error("Invalid indexer address payload.");
  return getAddressDecoder().decode(buf);
}

function shortAddr(a: string): string {
  const s = a.trim();
  if (s.length <= 12) return s;
  return `${s.slice(0, 4)}…${s.slice(-4)}`;
}

function utcMsFromH1(item: UtxoDataResponse): number {
  return Date.UTC(
    Number(item.h1_year),
    Number(item.h1_month) - 1,
    Number(item.h1_day),
    Number(item.h1_hour),
    Number(item.h1_minute),
    Number(item.h1_second),
  );
}

export type AuditorUtxoPdfRow = {
  absoluteIndex: string;
  treeIndex: string;
  insertionIndex: string;
  slot: string;
  utcCompact: string;
  senderShort: string;
  eventType: string;
  poolVolSpl: string;
};

export type CollectAuditorUtxoReportResult = {
  rows: AuditorUtxoPdfRow[];
  scannedCount: number;
  matchedCount: number;
  truncated: boolean;
};

export async function collectAuditorUtxoRows(args: {
  indexerEndpoint: string;
  mintAddress: string;
  treeIndex?: number;
  /** Inclusive UTC ms */
  fromUtcMs?: number;
  /** Inclusive UTC ms */
  toUtcMs?: number;
}): Promise<CollectAuditorUtxoReportResult> {
  const client = new ReadServiceClient({ endpoint: args.indexerEndpoint });
  const wantMint = args.mintAddress.trim();
  const treeFilter = args.treeIndex;

  const rows: AuditorUtxoPdfRow[] = [];
  let scanned = 0;
  let truncated = false;
  let cursor = BigInt(0);
  let lastHasMore = false;
  let stoppedByMatchCap = false;

  for (let page = 0; page < MAX_PAGES; page++) {
    const res = await client.getUtxoData({
      start: cursor,
      limit: PAGE_SIZE,
    });

    lastHasMore = Boolean(res.has_more && res.next_cursor !== null);

    for (const item of res.items) {
      scanned++;
      try {
        const mint = base64ToAddress(item.h1_mint_address);
        if (mint !== wantMint) continue;
        if (treeFilter !== undefined && Number(item.tree_index) !== treeFilter) continue;

        const t = utcMsFromH1(item);
        if (args.fromUtcMs !== undefined && t < args.fromUtcMs) continue;
        if (args.toUtcMs !== undefined && t > args.toUtcMs) continue;

        const utcCompact = `${String(item.h1_year).padStart(4, "0")}-${String(item.h1_month).padStart(2, "0")}-${String(item.h1_day).padStart(2, "0")} ${String(item.h1_hour).padStart(2, "0")}:${String(item.h1_minute).padStart(2, "0")}:${String(item.h1_second).padStart(2, "0")}`;

        rows.push({
          absoluteIndex: String(item.absolute_index),
          treeIndex: String(item.tree_index),
          insertionIndex: String(item.insertion_index),
          slot: String(item.slot),
          utcCompact,
          senderShort: shortAddr(base64ToAddress(item.h1_sender_address)),
          eventType: String(item.event_type ?? "—"),
          poolVolSpl: String(item.h1_pool_volume_spl),
        });
        if (rows.length >= MAX_MATCHED) {
          truncated = true;
          stoppedByMatchCap = true;
          break;
        }
      } catch {
        /* skip malformed row */
      }
    }

    if (stoppedByMatchCap) break;
    if (!lastHasMore) break;
    cursor = res.next_cursor!;
    if (res.items.length === 0) break;
  }

  if (!truncated && lastHasMore) {
    truncated = true;
  }

  return {
    rows,
    scannedCount: scanned,
    matchedCount: rows.length,
    truncated,
  };
}
