"use client";

import { useState } from "react";
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
  DEmptyState,
} from "@/components/dashboard/primitives";
import type { Invoice } from "@/lib/dashboard-types";
import { useDashboardOverview } from "@/hooks/use-dashboard-overview";
import { formatCurrency, formatDate } from "@/components/dashboard/formatters";
import { FileText, Plus, Send, Check, Clock, AlertTriangle } from "lucide-react";
import { usePrivy } from "@privy-io/react-auth";

const statusBadge: Record<Invoice["status"], { variant: "muted" | "warning" | "success" | "error"; label: string }> = {
  draft: { variant: "muted", label: "Draft" },
  sent: { variant: "warning", label: "Sent" },
  paid: { variant: "success", label: "Paid" },
  overdue: { variant: "error", label: "Overdue" },
};

function nextInvoiceNumber(): string {
  return `INV-${new Date().getUTCFullYear()}-001`;
}

export default function InvoicePage() {
  const { data, loading } = useDashboardOverview();
  const { getAccessToken } = usePrivy();
  const invoices = data?.overview.invoices ?? [];

function nextInvoiceNumberFromInvoices(): string {
  const maxNum = invoices.reduce((max, inv) => {
    const n = parseInt(inv.number.split("-").pop() ?? "0", 10);
    return n > max ? n : max;
  }, 0);
  return `INV-2026-${String(maxNum + 1).padStart(3, "0")}`;
}
  const [tab, setTab] = useState("all");

  if (loading && !data) {
    return (
      <div className="d-card" style={{ minHeight: 220, display: "grid", placeItems: "center" }}>
        <div style={{ width: 28, height: 28, border: "3px solid rgba(123,47,255,0.2)", borderTopColor: "#7b2fff", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      </div>
    );
  }
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [sending, setSending] = useState(false);

  const [formNumber, setFormNumber] = useState(nextInvoiceNumber);
  const [formClient, setFormClient] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formAmount, setFormAmount] = useState("");
  const [formCurrency, setFormCurrency] = useState("USDC");
  const [formDue, setFormDue] = useState("");

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

  const columns = [
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
      render: (row: Invoice) => formatCurrency(row.amount),
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
  ];

  function resetForm() {
    setFormNumber(nextInvoiceNumberFromInvoices());
    setFormClient("");
    setFormEmail("");
    setFormAmount("");
    setFormCurrency("USDC");
    setFormDue("");
  }

  function openDrawer() {
    resetForm();
    setDrawerOpen(true);
  }

  function handleDraft() {
    void (async () => {
      try {
        const token = await getAccessToken();
        if (token) {
          await fetch("/api/dashboard/events", {
            method: "POST",
            headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              category: "invoice",
              direction: "in",
              status: "pending",
              amount: Number(formAmount || 0),
              currency: formCurrency,
              memo: `Invoice draft ${formNumber}`,
              counterparty: formClient || "Client",
            }),
          });
          window.dispatchEvent(new Event("dashboard:refresh"));
        }
      } catch {
        // non-blocking event log
      }
    })();
    setDrawerOpen(false);
  }

  function handleSend() {
    setSending(true);
    setTimeout(async () => {
      try {
        const token = await getAccessToken();
        if (token) {
          await fetch("/api/dashboard/events", {
            method: "POST",
            headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              category: "invoice",
              direction: "in",
              status: "pending",
              amount: Number(formAmount || 0),
              currency: formCurrency,
              memo: `Invoice sent ${formNumber}`,
              counterparty: formClient || formEmail || "Client",
            }),
          });
          window.dispatchEvent(new Event("dashboard:refresh"));
        }
      } catch {
        // non-blocking event log
      }
      setSending(false);
      setDrawerOpen(false);
    }, 1000);
  }

  return (
    <>
      <DPageHeader
        title="Invoice"
        description="Issue invoices and get paid privately."
        actions={<DButton variant="primary" icon={Plus} onClick={openDrawer}>New Invoice</DButton>}
      />

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

      <DDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title="New Invoice">
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <DInput label="Invoice Number" value={formNumber} onChange={setFormNumber} />
          <DInput label="Client Name" value={formClient} onChange={setFormClient} placeholder="Acme Corp" />
          <DInput label="Client Email" value={formEmail} onChange={setFormEmail} placeholder="billing@acme.xyz" />
          <DInput label="Amount" value={formAmount} onChange={setFormAmount} type="number" placeholder="0.00" />
          <DSelect
            label="Currency"
            value={formCurrency}
            onChange={setFormCurrency}
            options={[{ value: "USDC", label: "USDC" }]}
          />
          <DInput label="Due Date" value={formDue} onChange={setFormDue} type="date" />
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 24 }}>
          <DButton variant="ghost" onClick={handleDraft}>Create as Draft</DButton>
          <DButton variant="primary" icon={Send} onClick={handleSend} loading={sending}>Send Invoice</DButton>
        </div>
      </DDrawer>
    </>
  );
}
