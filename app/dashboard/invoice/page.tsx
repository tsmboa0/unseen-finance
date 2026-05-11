"use client";

import { useCallback, useMemo, useState } from "react";
import {
  DPageHeader,
  DStatCard,
  DTable,
  DTabs,
  DBadge,
  DButton,
  DDrawer,
  DInput,
  DSelect,
  DTextarea,
} from "@/components/dashboard/primitives";
import type { Invoice } from "@/lib/dashboard-types";
import { useDashboardOverview } from "@/hooks/use-dashboard-overview";
import { formatCurrency, formatDate } from "@/components/dashboard/formatters";
import { FileText, Plus, Send, Trash2, Check, Clock, AlertTriangle, Download } from "lucide-react";
import { usePrivy } from "@privy-io/react-auth";
import { normalizeLineItems, type InvoiceLineItemInput } from "@/lib/invoice/line-items";

const statusBadge: Record<Invoice["status"], { variant: "muted" | "warning" | "success" | "error"; label: string }> = {
  draft: { variant: "muted", label: "Draft" },
  sent: { variant: "warning", label: "Sent" },
  paid: { variant: "success", label: "Paid" },
  overdue: { variant: "error", label: "Overdue" },
};

type LineRow = { key: string; name: string; description: string; quantity: string; unitPrice: string };

function emptyLine(): LineRow {
  return { key: crypto.randomUUID(), name: "", description: "", quantity: "1", unitPrice: "0" };
}

function isLikelyEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());
}

const DAY_MS = 24 * 60 * 60 * 1000;

export default function InvoicePage() {
  const { data, loading, refresh } = useDashboardOverview();
  const { getAccessToken } = usePrivy();
  const invoices = data?.overview.invoices ?? [];

  const [tab, setTab] = useState("all");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerStep, setDrawerStep] = useState<"edit" | "preview">("edit");
  const [drawerBusy, setDrawerBusy] = useState<"draft" | "send" | null>(null);
  const [drawerError, setDrawerError] = useState<string | null>(null);
  const [previewNumber, setPreviewNumber] = useState("—");
  const [invoiceNotice, setInvoiceNotice] = useState<{ kind: "success" | "warning"; text: string } | null>(null);

  const [lineRows, setLineRows] = useState<LineRow[]>([emptyLine()]);
  const [formClient, setFormClient] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formAmountNote, setFormAmountNote] = useState("");
  const [formCurrency, setFormCurrency] = useState("USDC");
  const [formDue, setFormDue] = useState("");
  const [formNotes, setFormNotes] = useState("");

  const draftSubtotal = useMemo(() => {
    const parsed: InvoiceLineItemInput[] = lineRows.map((r) => ({
      name: r.name,
      description: r.description,
      quantity: Number(r.quantity),
      unitPrice: Number(r.unitPrice),
    }));
    return normalizeLineItems(parsed).subtotal;
  }, [lineRows]);

  const mergedNotes = useMemo(
    () => [formNotes.trim(), formAmountNote.trim()].filter(Boolean).join("\n\n"),
    [formNotes, formAmountNote],
  );

  const previewDraft = useMemo(() => {
    const parsed: InvoiceLineItemInput[] = lineRows.map((r) => ({
      name: r.name,
      description: r.description,
      quantity: Number(r.quantity),
      unitPrice: Number(r.unitPrice),
    }));
    return normalizeLineItems(parsed);
  }, [lineRows]);

  const updateLine = useCallback((key: string, patch: Partial<LineRow>) => {
    setLineRows((rows) => rows.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }, []);

  const removeLine = useCallback((key: string) => {
    setLineRows((rows) => (rows.length <= 1 ? rows : rows.filter((r) => r.key !== key)));
  }, []);

  const addLine = useCallback(() => {
    setLineRows((rows) => [...rows, emptyLine()]);
  }, []);

  const openDrawer = useCallback(async () => {
    setDrawerError(null);
    setDrawerStep("edit");
    setInvoiceNotice(null);
    setPreviewNumber("—");
    try {
      const token = await getAccessToken();
      if (!token) {
        setDrawerError("Sign in to create an invoice.");
        setDrawerOpen(true);
        return;
      }
      const res = await fetch("/api/dashboard/invoices/next-number", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const j = (await res.json()) as { number?: string; error?: string };
      if (res.ok && j.number) setPreviewNumber(j.number);
    } catch {
      setPreviewNumber("—");
    }
    setLineRows([emptyLine()]);
    setFormClient("");
    setFormEmail("");
    setFormCurrency("USDC");
    setFormDue(new Date(Date.now() + 14 * DAY_MS).toISOString().slice(0, 10));
    setFormNotes("");
    setFormAmountNote("");
    setDrawerOpen(true);
  }, [getAccessToken]);

  const goToPreview = useCallback(() => {
    setDrawerError(null);
    if (!formClient.trim()) {
      setDrawerError("Client name is required.");
      return;
    }
    if (!formDue) {
      setDrawerError("Due date is required.");
      return;
    }
    const dueAt = new Date(`${formDue}T23:59:59.999Z`);
    if (Number.isNaN(dueAt.getTime())) {
      setDrawerError("Invalid due date.");
      return;
    }
    const parsed: InvoiceLineItemInput[] = lineRows.map((r) => ({
      name: r.name,
      description: r.description,
      quantity: Number(r.quantity),
      unitPrice: Number(r.unitPrice),
    }));
    const { items, subtotal } = normalizeLineItems(parsed);
    if (items.length === 0 || subtotal <= 0) {
      setDrawerError("Add at least one line item with a positive amount.");
      return;
    }
    setDrawerStep("preview");
  }, [formClient, formDue, lineRows]);

  const downloadPdf = useCallback(
    async (invoiceId: string, numberLabel: string) => {
      const token = await getAccessToken();
      if (!token) return;
      const res = await fetch(`/api/dashboard/invoices/${invoiceId}/pdf`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `invoice-${numberLabel.replace(/[^a-zA-Z0-9-]/g, "_")}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    },
    [getAccessToken],
  );

  const submitInvoice = useCallback(
    async (action: "draft" | "send") => {
      setDrawerError(null);
      if (action === "send" && !isLikelyEmail(formEmail)) {
        setDrawerError("Enter a valid client email before sending.");
        return;
      }
      const token = await getAccessToken();
      if (!token) {
        setDrawerError("Sign in to save.");
        return;
      }
      const lineItems: InvoiceLineItemInput[] = lineRows.map((r) => ({
        name: r.name,
        description: r.description,
        quantity: Number(r.quantity),
        unitPrice: Number(r.unitPrice),
      }));
      setDrawerBusy(action);
      try {
        const res = await fetch("/api/dashboard/invoices", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            action,
            clientName: formClient,
            clientEmail: formEmail,
            dueDate: formDue,
            currency: formCurrency,
            notes: mergedNotes || undefined,
            lineItems,
          }),
        });
        const body = (await res.json()) as {
          error?: string;
          emailSent?: boolean;
          emailError?: string;
          invoice?: { id: string; invoiceNumber: string; checkoutUrl?: string };
        };
        if (!res.ok) {
          setDrawerError(body.error ?? `Failed (${res.status})`);
          return;
        }
        void refresh?.();
        setDrawerOpen(false);
        setDrawerStep("edit");
        if (action === "draft" && body.invoice?.id) {
          void downloadPdf(body.invoice.id, body.invoice.invoiceNumber);
        }
        if (action === "send") {
          if (body.emailSent) {
            setInvoiceNotice({ kind: "success", text: `Invoice emailed to ${formEmail.trim()}.` });
          } else if (body.emailError) {
            setInvoiceNotice({
              kind: "warning",
              text: `Invoice created, but email failed: ${body.emailError}`,
            });
          }
        }
      } catch {
        setDrawerError("Request failed");
      } finally {
        setDrawerBusy(null);
      }
    },
    [
      getAccessToken,
      lineRows,
      formClient,
      formEmail,
      formDue,
      formCurrency,
      mergedNotes,
      downloadPdf,
      refresh,
    ],
  );

  const totalInvoiced = invoices.reduce((s, i) => s + i.amount, 0);
  const totalPaid = invoices.filter((i) => i.status === "paid").reduce((s, i) => s + i.amount, 0);
  const outstanding = invoices
    .filter((i) => i.status === "sent" || i.status === "overdue")
    .reduce((s, i) => s + i.amount, 0);
  const overdueCount = invoices.filter((i) => i.status === "overdue").length;

  const filtered = tab === "all" ? invoices : invoices.filter((i) => i.status === tab);

  const tabs = [
    { id: "all", label: "All", count: invoices.length },
    { id: "draft", label: "Draft", count: invoices.filter((i) => i.status === "draft").length },
    { id: "sent", label: "Sent", count: invoices.filter((i) => i.status === "sent").length },
    { id: "paid", label: "Paid", count: invoices.filter((i) => i.status === "paid").length },
    { id: "overdue", label: "Overdue", count: invoices.filter((i) => i.status === "overdue").length },
  ];

  const columns = useMemo(
    () => [
      {
        key: "number",
        header: "Number",
        render: (row: Invoice) => <span style={{ fontWeight: 600, fontFamily: "var(--font-mono, monospace)" }}>{row.number}</span>,
      },
      {
        key: "client",
        header: "Client",
        render: (row: Invoice) => row.client,
      },
      {
        key: "amount",
        header: "Amount",
        align: "right" as const,
        render: (row: Invoice) => formatCurrency(row.amount, row.currency),
      },
      {
        key: "status",
        header: "Status",
        render: (row: Invoice) => {
          const b = statusBadge[row.status];
          return <DBadge variant={b.variant} dot>{b.label}</DBadge>;
        },
      },
      {
        key: "issuedAt",
        header: "Issued",
        hideOnMobile: true,
        render: (row: Invoice) => formatDate(row.issuedAt),
      },
      {
        key: "dueAt",
        header: "Due",
        hideOnMobile: true,
        render: (row: Invoice) => formatDate(row.dueAt),
      },
      {
        key: "actions",
        header: "",
        align: "right" as const,
        render: (row: Invoice) => (
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", flexWrap: "wrap" }}>
            <DButton
              variant="ghost"
              icon={Download}
              onClick={() => void downloadPdf(row.id, row.number)}
              aria-label="Download PDF"
            >
              PDF
            </DButton>
            {row.checkoutUrl ? (
              <DButton
                variant="secondary"
                onClick={() => window.open(row.checkoutUrl!, "_blank", "noopener,noreferrer")}
              >
                Pay link
              </DButton>
            ) : null}
          </div>
        ),
      },
    ],
    [downloadPdf],
  );

  if (loading && !data) {
    return (
      <div className="d-card" style={{ minHeight: 220, display: "grid", placeItems: "center" }}>
        <div style={{ width: 28, height: 28, border: "3px solid rgba(123,47,255,0.2)", borderTopColor: "#7b2fff", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      </div>
    );
  }

  return (
    <>
      <DPageHeader
        title="Invoice"
        description="Preview, then email a branded HTML invoice to your client with a secure pay link. PDF download stays available from the list."
        actions={<DButton variant="primary" icon={Plus} onClick={() => void openDrawer()}>New Invoice</DButton>}
      />

      {invoiceNotice ? (
        <div
          className="d-card"
          style={{
            marginBottom: 20,
            borderRadius: 12,
            padding: "14px 16px",
            fontSize: 14,
            lineHeight: 1.5,
            border:
              invoiceNotice.kind === "success"
                ? "1px solid rgba(34, 197, 94, 0.35)"
                : "1px solid rgba(245, 158, 11, 0.45)",
            background:
              invoiceNotice.kind === "success" ? "rgba(34, 197, 94, 0.08)" : "rgba(245, 158, 11, 0.1)",
          }}
        >
          {invoiceNotice.text}
        </div>
      ) : null}

      <div className="d-grid d-grid--4">
        <DStatCard label="Total Invoiced" value={formatCurrency(totalInvoiced)} icon={FileText} />
        <DStatCard label="Paid" value={formatCurrency(totalPaid)} icon={Check} />
        <DStatCard label="Outstanding" value={formatCurrency(outstanding)} icon={Clock} />
        <DStatCard label="Overdue" value={String(overdueCount)} icon={AlertTriangle} />
      </div>

      <DTabs items={tabs} active={tab} onChange={setTab} />

      <DTable
        columns={columns}
        data={loading ? [] : filtered}
        emptyTitle="No invoices"
        emptyDescription="Create your first invoice to get started."
      />

      <DDrawer
        open={drawerOpen}
        onClose={() => {
          setDrawerOpen(false);
          setDrawerStep("edit");
          setDrawerError(null);
        }}
        title={drawerStep === "edit" ? "New invoice" : "Preview & send"}
      >
        <p style={{ margin: "0 0 16px", fontSize: 13, color: "var(--color-text-muted)" }}>
          Invoice number:{" "}
          <span style={{ fontFamily: "var(--font-mono)", color: "var(--color-text-primary)" }}>{previewNumber}</span>
        </p>

        {drawerStep === "edit" ? (
          <>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <DInput label="Client name" value={formClient} onChange={setFormClient} placeholder="Acme Corp" />
              <DInput
                label="Client email"
                value={formEmail}
                onChange={setFormEmail}
                placeholder="billing@acme.xyz"
                hint="Required before send — we email the invoice HTML to this address."
              />
              <DSelect
                label="Currency"
                value={formCurrency}
                onChange={setFormCurrency}
                options={[
                  { value: "USDC", label: "USDC" },
                  { value: "USDT", label: "USDT" },
                ]}
              />
              <DInput label="Due date" value={formDue} onChange={setFormDue} type="date" />
              <DTextarea
                label="Notes (email & PDF)"
                value={formNotes}
                onChange={setFormNotes}
                placeholder="Payment terms, thank you, etc."
              />
              <DTextarea
                label="Amount / memo (optional)"
                value={formAmountNote}
                onChange={setFormAmountNote}
                placeholder="Extra context (e.g. PO number)."
              />

              <div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                  <span className="d-field__label" style={{ margin: 0 }}>
                    Line items
                  </span>
                  <DButton variant="ghost" icon={Plus} onClick={addLine}>
                    Add line
                  </DButton>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {lineRows.map((row) => (
                    <div
                      key={row.key}
                      style={{
                        border: "1px solid var(--color-border, rgba(255,255,255,0.08))",
                        borderRadius: 12,
                        padding: 12,
                        display: "grid",
                        gap: 10,
                        gridTemplateColumns: "1fr 72px 100px auto",
                        alignItems: "end",
                      }}
                    >
                      <DInput
                        label="Item"
                        value={row.name}
                        onChange={(v) => updateLine(row.key, { name: v })}
                        placeholder="Service or product"
                      />
                      <DInput
                        label="Qty"
                        value={row.quantity}
                        onChange={(v) => updateLine(row.key, { quantity: v })}
                        type="number"
                      />
                      <DInput
                        label={`Unit (${formCurrency})`}
                        value={row.unitPrice}
                        onChange={(v) => updateLine(row.key, { unitPrice: v })}
                        type="number"
                      />
                      <DButton variant="ghost" icon={Trash2} onClick={() => removeLine(row.key)} aria-label="Remove line">
                        ×
                      </DButton>
                      <div style={{ gridColumn: "1 / -1" }}>
                        <DInput
                          label="Description"
                          value={row.description}
                          onChange={(v) => updateLine(row.key, { description: v })}
                          placeholder="Optional details"
                        />
                      </div>
                    </div>
                  ))}
                </div>
                <p style={{ marginTop: 12, fontSize: 14, fontWeight: 600 }}>
                  Subtotal: {formatCurrency(draftSubtotal, formCurrency === "USDT" ? "USDT" : "USDC")}
                </p>
              </div>
            </div>

            {drawerError ? <p className="d-field__error" style={{ marginTop: 16 }}>{drawerError}</p> : null}

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 24, flexWrap: "wrap" }}>
              <DButton variant="ghost" onClick={() => void submitInvoice("draft")} disabled={drawerBusy !== null}>
                {drawerBusy === "draft" ? "Saving…" : "Save draft"}
              </DButton>
              <DButton variant="primary" onClick={goToPreview} disabled={drawerBusy !== null}>
                Continue to preview
              </DButton>
            </div>
          </>
        ) : (
          <>
            <p style={{ margin: "0 0 12px", fontSize: 13, color: "var(--color-text-muted)" }}>
              This is what we will email to your client (HTML). They will get a &quot;Pay now&quot; button for the hosted
              checkout link.
            </p>

            <div
              style={{
                border: "1px solid var(--color-border, rgba(255,255,255,0.1))",
                borderRadius: 12,
                padding: 16,
                marginBottom: 16,
                background: "var(--color-surface-elevated, rgba(255,255,255,0.03))",
              }}
            >
              <div style={{ fontSize: 11, fontWeight: 600, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                Bill to
              </div>
              <div style={{ fontSize: 16, fontWeight: 600, marginTop: 6 }}>{formClient || "—"}</div>
              <div style={{ fontSize: 14, color: "var(--color-text-muted)", marginTop: 4 }}>{formEmail || "—"}</div>
              <div style={{ marginTop: 14, fontSize: 13, color: "var(--color-text-muted)" }}>
                Due{" "}
                <span style={{ color: "var(--color-text-primary)", fontWeight: 600 }}>
                  {formDue ? formatDate(new Date(`${formDue}T12:00:00.000Z`).getTime()) : "—"}
                </span>
                {" · "}
                {formatCurrency(previewDraft.subtotal, formCurrency === "USDT" ? "USDT" : "USDC")} total
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {previewDraft.items.map((line, i) => (
                <div
                  key={i}
                  style={{
                    paddingBottom: 10,
                    borderBottom: "1px solid var(--color-border, rgba(255,255,255,0.08))",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "baseline" }}>
                    <span style={{ fontWeight: 600 }}>{line.name}</span>
                    <span style={{ fontFamily: "var(--font-mono, monospace)", fontSize: 14 }}>
                      {formatCurrency(line.lineTotal, formCurrency === "USDT" ? "USDT" : "USDC")}
                    </span>
                  </div>
                  {line.description ? (
                    <div style={{ fontSize: 13, color: "var(--color-text-muted)", marginTop: 4 }}>{line.description}</div>
                  ) : null}
                  <div style={{ fontSize: 12, color: "var(--color-text-muted)", marginTop: 6 }}>
                    {line.quantity} × {formatCurrency(line.unitPrice, formCurrency === "USDT" ? "USDT" : "USDC")}
                  </div>
                </div>
              ))}
            </div>

            {mergedNotes ? (
              <div style={{ marginTop: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: "var(--color-text-muted)", textTransform: "uppercase" }}>
                  Notes
                </div>
                <div style={{ fontSize: 13, lineHeight: 1.5, marginTop: 6, whiteSpace: "pre-wrap" }}>{mergedNotes}</div>
              </div>
            ) : null}

            {drawerError ? <p className="d-field__error" style={{ marginTop: 16 }}>{drawerError}</p> : null}

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 24, flexWrap: "wrap" }}>
              <DButton variant="ghost" onClick={() => setDrawerStep("edit")} disabled={drawerBusy !== null}>
                Back
              </DButton>
              <DButton
                variant="primary"
                icon={Send}
                onClick={() => void submitInvoice("send")}
                disabled={drawerBusy !== null}
              >
                {drawerBusy === "send" ? "Sending…" : "Send invoice to email"}
              </DButton>
            </div>
          </>
        )}
      </DDrawer>
    </>
  );
}
