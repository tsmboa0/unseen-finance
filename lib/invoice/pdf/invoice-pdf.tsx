import { Document, Page, Text, View, StyleSheet, Link } from "@react-pdf/renderer";
import type { InvoiceLineItemStored } from "@/lib/invoice/line-items";
import { UnseenPdfBrandHeader } from "@/lib/pdf/unseen-pdf-header";

const colors = {
  text: "#111827",
  muted: "#6b7280",
  border: "#e5e7eb",
  accent: "#5b21b6",
  subtle: "#f3f4f6",
};

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: "Helvetica",
    color: colors.text,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 28,
  },
  brand: {
    fontSize: 9,
    color: colors.muted,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  title: {
    fontSize: 28,
    fontWeight: 700,
    color: colors.accent,
    marginTop: 4,
  },
  metaBlock: { alignItems: "flex-end" },
  metaLabel: { fontSize: 8, color: colors.muted, textTransform: "uppercase", marginBottom: 2 },
  metaValue: { fontSize: 11, fontWeight: 600 },
  billToLabel: {
    fontSize: 8,
    color: colors.muted,
    textTransform: "uppercase",
    marginBottom: 6,
  },
  clientName: { fontSize: 12, fontWeight: 600, marginBottom: 4 },
  clientLine: { fontSize: 10, color: colors.muted, marginBottom: 2 },
  table: { marginTop: 24 },
  thRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: 8,
    marginBottom: 4,
  },
  th: { fontSize: 8, color: colors.muted, textTransform: "uppercase", fontWeight: 600 },
  tr: { flexDirection: "row", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.subtle },
  tdDesc: { fontSize: 9, color: colors.muted, marginTop: 2 },
  colItem: { width: "42%" },
  colQty: { width: "10%", textAlign: "right" as const },
  colUnit: { width: "22%", textAlign: "right" as const },
  colLine: { width: "26%", textAlign: "right" as const },
  totals: { marginTop: 20, alignItems: "flex-end" },
  totalRow: { flexDirection: "row", justifyContent: "flex-end", marginTop: 6, width: "100%" },
  totalLabel: { fontSize: 10, color: colors.muted, width: 80, textAlign: "right" as const, marginRight: 12 },
  totalValue: { fontSize: 12, fontWeight: 700, width: 72, textAlign: "right" as const },
  notes: {
    marginTop: 28,
    padding: 12,
    backgroundColor: colors.subtle,
    borderRadius: 4,
  },
  notesLabel: { fontSize: 8, color: colors.muted, textTransform: "uppercase", marginBottom: 6 },
  notesText: { fontSize: 9, lineHeight: 1.45, color: colors.text },
  payBox: {
    marginTop: 24,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.accent,
    borderRadius: 6,
    backgroundColor: "#faf5ff",
  },
  payTitle: { fontSize: 10, fontWeight: 700, color: colors.accent, marginBottom: 8 },
  payLink: { fontSize: 10, color: colors.accent, textDecoration: "underline" },
  footer: {
    position: "absolute",
    bottom: 28,
    left: 40,
    right: 40,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 10,
    flexDirection: "row",
    justifyContent: "center",
  },
  footerText: { fontSize: 8, color: colors.muted },
});

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" });
  } catch {
    return iso;
  }
}

export type InvoicePdfProps = {
  logoPath?: string | null;
  merchantName: string;
  invoiceNumber: string;
  issuedAtIso: string;
  dueAtIso: string;
  clientName: string;
  clientEmail: string;
  currency: string;
  lineItems: InvoiceLineItemStored[];
  subtotal: number;
  notes: string;
  payUrl: string | null;
};

export function InvoicePdfDocument(props: InvoicePdfProps) {
  const { lineItems, subtotal, currency, notes, payUrl } = props;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <UnseenPdfBrandHeader logoPath={props.logoPath} />
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.brand}>{props.merchantName}</Text>
            <Text style={styles.title}>Invoice</Text>
          </View>
          <View style={styles.metaBlock}>
            <Text style={styles.metaLabel}>Invoice #</Text>
            <Text style={styles.metaValue}>{props.invoiceNumber}</Text>
            <Text style={[styles.metaLabel, { marginTop: 10 }]}>Issue date</Text>
            <Text style={styles.metaValue}>{formatDate(props.issuedAtIso)}</Text>
            <Text style={[styles.metaLabel, { marginTop: 10 }]}>Due date</Text>
            <Text style={styles.metaValue}>{formatDate(props.dueAtIso)}</Text>
          </View>
        </View>

        <View>
          <Text style={styles.billToLabel}>Bill to</Text>
          <Text style={styles.clientName}>{props.clientName}</Text>
          {props.clientEmail ? <Text style={styles.clientLine}>{props.clientEmail}</Text> : null}
        </View>

        <View style={styles.table}>
          <View style={styles.thRow}>
            <Text style={[styles.th, styles.colItem]}>Item</Text>
            <Text style={[styles.th, styles.colQty]}>Qty</Text>
            <Text style={[styles.th, styles.colUnit]}>Rate</Text>
            <Text style={[styles.th, styles.colLine]}>Amount</Text>
          </View>
          {lineItems.map((line, i) => (
            <View key={i} style={styles.tr} wrap={false}>
              <View style={styles.colItem}>
                <Text style={{ fontSize: 10, fontWeight: 600 }}>{line.name}</Text>
                {line.description ? <Text style={styles.tdDesc}>{line.description}</Text> : null}
              </View>
              <Text style={[styles.colQty, { fontSize: 10 }]}>{String(line.quantity)}</Text>
              <Text style={[styles.colUnit, { fontSize: 10 }]}>
                {line.unitPrice.toFixed(2)} {currency}
              </Text>
              <Text style={[styles.colLine, { fontSize: 10, fontWeight: 600 }]}>
                {line.lineTotal.toFixed(2)} {currency}
              </Text>
            </View>
          ))}
        </View>

        <View style={styles.totals}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Subtotal</Text>
            <Text style={styles.totalValue}>
              {subtotal.toFixed(2)} {currency}
            </Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total due</Text>
            <Text style={[styles.totalValue, { fontSize: 14 }]}>
              {subtotal.toFixed(2)} {currency}
            </Text>
          </View>
        </View>

        {notes.trim() ? (
          <View style={styles.notes}>
            <Text style={styles.notesLabel}>Notes</Text>
            <Text style={styles.notesText}>{notes.trim()}</Text>
          </View>
        ) : null}

        {payUrl ? (
          <View style={styles.payBox}>
            <Text style={styles.payTitle}>Pay online</Text>
            <Link src={payUrl} style={styles.payLink}>
              {payUrl}
            </Link>
          </View>
        ) : (
          <View style={[styles.payBox, { borderColor: colors.border, backgroundColor: colors.subtle }]}>
            <Text style={[styles.payTitle, { color: colors.muted }]}>Payment link</Text>
            <Text style={{ fontSize: 9, color: colors.muted }}>No checkout link yet — send this invoice from the dashboard to generate a payment URL.</Text>
          </View>
        )}

        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>Powered by Unseen Finance</Text>
        </View>
      </Page>
    </Document>
  );
}
