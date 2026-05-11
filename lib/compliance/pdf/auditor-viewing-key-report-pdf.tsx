import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import { UnseenPdfBrandHeader } from "@/lib/pdf/unseen-pdf-header";
import type { AuditorUtxoPdfRow } from "@/lib/auditor/indexer-utxo-report";

const colors = {
  text: "#111827",
  muted: "#6b7280",
  border: "#e5e7eb",
  accent: "#5b21b6",
  subtle: "#f3f4f6",
  danger: "#b91c1c",
};

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 8,
    fontFamily: "Helvetica",
    color: colors.text,
    position: "relative",
  },
  watermarkWrap: {
    position: "absolute",
    left: 50,
    top: 260,
    opacity: 0.11,
  },
  watermark: {
    fontSize: 48,
    color: colors.danger,
    fontWeight: 700,
    letterSpacing: 4,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  brand: {
    fontSize: 8,
    color: colors.muted,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  title: {
    fontSize: 16,
    fontWeight: 700,
    color: colors.accent,
    marginTop: 4,
  },
  metaLabel: { fontSize: 7, color: colors.muted, textTransform: "uppercase", marginBottom: 2 },
  metaValue: { fontSize: 8, fontWeight: 600 },
  notice: {
    marginTop: 12,
    padding: 10,
    backgroundColor: "#fef2f2",
    borderWidth: 1,
    borderColor: "#fecaca",
    borderRadius: 4,
  },
  noticeTitle: { fontSize: 8, fontWeight: 700, color: colors.danger, marginBottom: 4 },
  noticeBody: { fontSize: 7, lineHeight: 1.4, color: colors.text },
  summary: {
    marginTop: 14,
    flexDirection: "row",
    gap: 10,
  },
  summaryCard: {
    flex: 1,
    padding: 8,
    backgroundColor: colors.subtle,
    borderRadius: 4,
  },
  summaryValue: { fontSize: 12, fontWeight: 700, color: colors.accent, marginTop: 4 },
  table: { marginTop: 14 },
  thRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: 5,
    marginBottom: 2,
  },
  th: { fontSize: 6, color: colors.muted, textTransform: "uppercase", fontWeight: 600 },
  tr: {
    flexDirection: "row",
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  td: { fontSize: 7, color: colors.muted },
  colAbs: { width: "10%" },
  colTree: { width: "8%" },
  colLeaf: { width: "8%" },
  colSlot: { width: "10%" },
  colUtc: { width: "22%" },
  colSender: { width: "14%" },
  colEvt: { width: "10%" },
  colVol: { width: "18%" },
  footer: {
    marginTop: 20,
    fontSize: 7,
    color: colors.muted,
    lineHeight: 1.35,
  },
});

export type AuditorViewingKeyReportPdfProps = {
  logoPath?: string | null;
  network: string;
  mintAddress: string;
  viewingKeyFingerprint: string;
  dateFromIso?: string;
  dateToIso?: string;
  treeIndex?: number;
  generatedAtIso: string;
  scannedCount: number;
  matchedCount: number;
  truncated: boolean;
  rows: AuditorUtxoPdfRow[];
};

export function AuditorViewingKeyReportPdfDocument(props: AuditorViewingKeyReportPdfProps) {
  const {
    logoPath,
    network,
    mintAddress,
    viewingKeyFingerprint,
    dateFromIso,
    dateToIso,
    treeIndex,
    generatedAtIso,
    scannedCount,
    matchedCount,
    truncated,
    rows,
  } = props;

  const windowLabel =
    dateFromIso && dateToIso ? `${dateFromIso} → ${dateToIso} (UTC)` : dateFromIso ? `From ${dateFromIso} UTC` : dateToIso ? `Until ${dateToIso} UTC` : "Full indexer pass (see scan limits)";

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <UnseenPdfBrandHeader logoPath={logoPath} />
        <View style={styles.watermarkWrap} fixed>
          <Text style={styles.watermark}>CONFIDENTIAL</Text>
        </View>

        <View style={styles.headerRow}>
          <View>
            <Text style={styles.brand}>Unseen · Auditor disclosure</Text>
            <Text style={styles.title}>Shielded pool UTXO metadata</Text>
          </View>
          <View>
            <Text style={styles.metaLabel}>Generated (UTC)</Text>
            <Text style={styles.metaValue}>{generatedAtIso}</Text>
          </View>
        </View>

        <View style={styles.notice}>
          <Text style={styles.noticeTitle}>Privileged &amp; confidential</Text>
          <Text style={styles.noticeBody}>
            This report lists public indexer metadata for Umbra mixer UTXOs: Merkle coordinates, Solana slot, commitment
            timestamp components, sender and mint addresses from H1, event type, and pool SPL volume field. It does NOT
            decrypt per-UTXO AES recovery payloads (those require the recipient X25519 key). The Poseidon viewing key
            fingerprint documents which disclosure credential the merchant provided; filter alignment (mint / UTC window /
            tree) is applied as you specified.
          </Text>
        </View>

        <View style={styles.summary}>
          <View style={styles.summaryCard}>
            <Text style={styles.metaLabel}>Network</Text>
            <Text style={styles.summaryValue}>{network}</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.metaLabel}>Mint</Text>
            <Text style={[styles.metaValue, { fontSize: 8 }]}>{mintAddress}</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.metaLabel}>Viewing key (redacted)</Text>
            <Text style={styles.metaValue}>{viewingKeyFingerprint}</Text>
          </View>
        </View>

        <View style={[styles.summary, { marginTop: 8 }]}>
          <View style={styles.summaryCard}>
            <Text style={styles.metaLabel}>UTC window</Text>
            <Text style={styles.metaValue}>{windowLabel}</Text>
            {treeIndex !== undefined ? <Text style={[styles.td, { marginTop: 4 }]}>Tree {String(treeIndex)}</Text> : null}
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.metaLabel}>Indexer rows scanned</Text>
            <Text style={styles.summaryValue}>{String(scannedCount)}</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.metaLabel}>Matches in this PDF</Text>
            <Text style={styles.summaryValue}>{String(matchedCount)}</Text>
            {truncated ? (
              <Text style={[styles.td, { marginTop: 4, color: colors.danger }]}>Truncated (scan or row cap)</Text>
            ) : null}
          </View>
        </View>

        <View style={styles.table}>
          <View style={styles.thRow}>
            <Text style={[styles.th, styles.colAbs]}>Abs</Text>
            <Text style={[styles.th, styles.colTree]}>Tree</Text>
            <Text style={[styles.th, styles.colLeaf]}>Leaf</Text>
            <Text style={[styles.th, styles.colSlot]}>Slot</Text>
            <Text style={[styles.th, styles.colUtc]}>UTC (H1)</Text>
            <Text style={[styles.th, styles.colSender]}>Sender</Text>
            <Text style={[styles.th, styles.colEvt]}>Event</Text>
            <Text style={[styles.th, styles.colVol]}>Pool vol SPL</Text>
          </View>
          {rows.map((r, i) => (
            <View key={i} style={styles.tr} wrap={false}>
              <Text style={[styles.td, styles.colAbs]}>{r.absoluteIndex}</Text>
              <Text style={[styles.td, styles.colTree]}>{r.treeIndex}</Text>
              <Text style={[styles.td, styles.colLeaf]}>{r.insertionIndex}</Text>
              <Text style={[styles.td, styles.colSlot]}>{r.slot}</Text>
              <Text style={[styles.td, styles.colUtc]}>{r.utcCompact}</Text>
              <Text style={[styles.td, styles.colSender]}>{r.senderShort}</Text>
              <Text style={[styles.td, styles.colEvt]}>{r.eventType}</Text>
              <Text style={[styles.td, styles.colVol]}>{r.poolVolSpl}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.footer} fixed>
          Unseen Finance · Auditor package. Source: Umbra read indexer. Distribution only as authorized by the disclosing
          merchant. On-chain proofs and full cipher audits require additional tooling and keys beyond this export.
        </Text>
      </Page>
    </Document>
  );
}
