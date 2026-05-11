import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import type { Product } from "@/lib/dashboard-types";
import { UnseenPdfBrandHeader } from "@/lib/pdf/unseen-pdf-header";

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
    fontSize: 9,
    fontFamily: "Helvetica",
    color: colors.text,
    position: "relative",
  },
  watermarkWrap: {
    position: "absolute",
    left: 60,
    top: 280,
    opacity: 0.12,
  },
  watermark: {
    fontSize: 52,
    color: colors.danger,
    fontWeight: 700,
    letterSpacing: 4,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  brand: {
    fontSize: 8,
    color: colors.muted,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  title: {
    fontSize: 18,
    fontWeight: 700,
    color: colors.accent,
    marginTop: 4,
  },
  metaLabel: { fontSize: 7, color: colors.muted, textTransform: "uppercase", marginBottom: 2 },
  metaValue: { fontSize: 9, fontWeight: 600 },
  notice: {
    marginTop: 16,
    padding: 10,
    backgroundColor: "#fef2f2",
    borderWidth: 1,
    borderColor: "#fecaca",
    borderRadius: 4,
  },
  noticeTitle: { fontSize: 8, fontWeight: 700, color: colors.danger, marginBottom: 4 },
  noticeBody: { fontSize: 8, lineHeight: 1.4, color: colors.text },
  summary: {
    marginTop: 18,
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  summaryCard: {
    flex: 1,
    padding: 10,
    backgroundColor: colors.subtle,
    borderRadius: 4,
  },
  summaryValue: { fontSize: 14, fontWeight: 700, color: colors.accent, marginTop: 4 },
  table: { marginTop: 16 },
  thRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: 6,
    marginBottom: 2,
  },
  th: { fontSize: 7, color: colors.muted, textTransform: "uppercase", fontWeight: 600 },
  tr: {
    flexDirection: "row",
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  tdMuted: { fontSize: 8, color: colors.muted },
  colWhen: { width: "18%" },
  colDir: { width: "10%" },
  colCat: { width: "14%" },
  colAmt: { width: "18%", textAlign: "right" as const },
  colParty: { width: "22%" },
  colMemo: { width: "18%" },
  footer: {
    marginTop: 24,
    fontSize: 7,
    color: colors.muted,
    lineHeight: 1.35,
  },
});

export type PdfComplianceEventRow = {
  atIso: string;
  direction: string;
  category: string;
  amount: number;
  currency: string;
  counterparty: string;
  memo: string;
};

export type ComplianceReportPdfProps = {
  logoPath?: string | null;
  merchantName: string;
  title: string;
  dateFromIso: string;
  dateToIso: string;
  txType: string;
  productLabels: string;
  recipientEmail: string;
  generatedAtIso: string;
  reportId: string;
  eventCount: number;
  inflowTotal: number;
  outflowTotal: number;
  events: PdfComplianceEventRow[];
};

export function ComplianceReportPdfDocument(props: ComplianceReportPdfProps) {
  const {
    logoPath,
    merchantName,
    title,
    dateFromIso,
    dateToIso,
    txType,
    productLabels,
    recipientEmail,
    generatedAtIso,
    reportId,
    eventCount,
    inflowTotal,
    outflowTotal,
    events,
  } = props;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <UnseenPdfBrandHeader logoPath={logoPath} />
        <View style={styles.watermarkWrap} fixed>
          <Text style={styles.watermark}>CONFIDENTIAL</Text>
        </View>

        <View style={styles.headerRow}>
          <View>
            <Text style={styles.brand}>Compliance disclosure</Text>
            <Text style={styles.title}>{title}</Text>
          </View>
          <View>
            <Text style={styles.metaLabel}>Prepared for</Text>
            <Text style={styles.metaValue}>{recipientEmail || "—"}</Text>
            <Text fixed style={[styles.metaLabel, { marginTop: 8 }]}>
              Generated
            </Text>
            <Text style={styles.metaValue}>{generatedAtIso}</Text>
          </View>
        </View>

        <View style={styles.notice}>
          <Text style={styles.noticeTitle}>Privileged &amp; confidential</Text>
          <Text style={styles.noticeBody}>
            This document summarizes dashboard activity metadata for the stated period. It does not contain raw
            shielded balances or Umbra ciphertext. Distribution is limited to authorized compliance review. Do not
            forward without written consent of {merchantName}.
          </Text>
        </View>

        <View style={styles.summary}>
          <View style={styles.summaryCard}>
            <Text style={styles.metaLabel}>Merchant</Text>
            <Text style={styles.summaryValue}>
              {merchantName}
            </Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.metaLabel}>Window (UTC)</Text>
            <Text style={styles.metaValue}>{dateFromIso}</Text>
            <Text style={styles.metaValue}>{dateToIso}</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.metaLabel}>Scope</Text>
            <Text style={styles.metaValue}>{txType}</Text>
            <Text style={styles.tdMuted}>{productLabels}</Text>
          </View>
        </View>

        <View style={[styles.summary, { marginTop: 10 }]}>
          <View style={styles.summaryCard}>
            <Text style={styles.metaLabel}>Ledger rows</Text>
            <Text style={styles.summaryValue}>{String(eventCount)}</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.metaLabel}>Inflow (USDC eq.)</Text>
            <Text style={styles.summaryValue}>{inflowTotal.toFixed(2)}</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.metaLabel}>Outflow (USDC eq.)</Text>
            <Text style={styles.summaryValue}>{outflowTotal.toFixed(2)}</Text>
          </View>
        </View>

        <View style={styles.table}>
          <View style={styles.thRow}>
            <Text style={[styles.th, styles.colWhen]}>When (UTC)</Text>
            <Text style={[styles.th, styles.colDir]}>Dir</Text>
            <Text style={[styles.th, styles.colCat]}>Category</Text>
            <Text style={[styles.th, styles.colAmt]}>Amount</Text>
            <Text style={[styles.th, styles.colParty]}>Counterparty</Text>
            <Text style={[styles.th, styles.colMemo]}>Memo</Text>
          </View>
          {events.map((e, i) => (
            <View key={i} style={styles.tr} wrap={false}>
              <Text style={[styles.tdMuted, styles.colWhen]}>{e.atIso}</Text>
              <Text style={[styles.tdMuted, styles.colDir]}>{e.direction}</Text>
              <Text style={[styles.tdMuted, styles.colCat]}>{e.category}</Text>
              <Text style={[styles.tdMuted, styles.colAmt]}>
                {e.amount.toFixed(2)} {e.currency}
              </Text>
              <Text style={[styles.tdMuted, styles.colParty]}>
                {e.counterparty}
              </Text>
              <Text style={[styles.tdMuted, styles.colMemo]}>
                {e.memo}
              </Text>
            </View>
          ))}
        </View>

        <Text style={styles.footer} fixed>
          Report ref {reportId}. Amounts reflect dashboard event stream only; settlement in shielded instruments may
          not match public-token units. This PDF is an extract for regulated disclosure workflows aligned with Umbra
          user-granted compliance grants on Solana.
        </Text>
      </Page>
    </Document>
  );
}

export function productLabelsFromSlugs(products: Product[], labels: Record<Product, string>): string {
  if (products.length === 0) return "All products";
  return products.map((p) => labels[p] ?? p).join(", ");
}
