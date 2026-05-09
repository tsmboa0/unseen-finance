"use client";

import { useState } from "react";
import {
  DPageHeader,
  DStatCard,
  DTable,
  DTabs,
  DBadge,
  DButton,
  DModal,
  DDrawer,
  DInput,
  DSelect,
  DTagSelect,
  DCopyField,
  DEmptyState,
} from "@/components/dashboard/primitives";
import {
  type ComplianceReport,
  type ViewingKey,
} from "@/lib/dashboard-types";
import { useDashboardOverview } from "@/hooks/use-dashboard-overview";
import { formatDate, formatRelativeTime } from "@/components/dashboard/formatters";
import { ShieldCheck, FileDown, Key, Plus, Download, Eye } from "lucide-react";
import { usePrivy } from "@privy-io/react-auth";

const PRODUCT_OPTIONS = [
  { value: "gateway", label: "Gateway" },
  { value: "payroll", label: "Payroll" },
  { value: "storefronts", label: "Storefronts" },
  { value: "x402", label: "x402" },
  { value: "invoice", label: "Invoice" },
  { value: "tiplinks", label: "Tiplinks" },
];

const PRODUCT_LABEL: Record<string, string> = Object.fromEntries(
  PRODUCT_OPTIONS.map((p) => [p.value, p.label]),
);

function randomHex(length: number) {
  return Array.from({ length }, () =>
    Math.floor(Math.random() * 16).toString(16),
  ).join("");
}

export default function CompliancePage() {
  const { data, loading } = useDashboardOverview();
  const { getAccessToken } = usePrivy();
  const complianceReports = data?.overview.complianceReports ?? [];
  const viewingKeys = data?.overview.viewingKeys ?? [];
  const [tab, setTab] = useState("reports");

  if (loading && !data) {
    return (
      <div className="d-card" style={{ minHeight: 220, display: "grid", placeItems: "center" }}>
        <div style={{ width: 28, height: 28, border: "3px solid rgba(123,47,255,0.2)", borderTopColor: "#7b2fff", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      </div>
    );
  }

  /* ── Report drawer state ── */
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [reportTitle, setReportTitle] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [txType, setTxType] = useState("all");
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [recipientEmail, setRecipientEmail] = useState("");
  const [generating, setGenerating] = useState(false);
  const [reportSuccess, setReportSuccess] = useState(false);

  /* ── Viewing key modal state ── */
  const [modalOpen, setModalOpen] = useState(false);
  const [keyLabel, setKeyLabel] = useState("");
  const [keyScope, setKeyScope] = useState("account");
  const [keyScopeProduct, setKeyScopeProduct] = useState("");
  const [keyExpiry, setKeyExpiry] = useState("30");
  const [generatingKey, setGeneratingKey] = useState(false);
  const [generatedKey, setGeneratedKey] = useState("");

  /* ── Report stats ── */
  const totalReports = complianceReports.length;
  const readyCount = complianceReports.filter((r) => r.status === "ready").length;
  const expiredCount = complianceReports.filter((r) => r.status === "expired").length;

  /* ── Key stats ── */
  const activeKeys = viewingKeys.length;
  const totalShares = viewingKeys.reduce((sum, k) => sum + k.shares, 0);

  /* ── Handlers ── */
  function resetDrawer() {
    setReportTitle("");
    setDateFrom("");
    setDateTo("");
    setTxType("all");
    setSelectedProducts([]);
    setRecipientEmail("");
    setGenerating(false);
    setReportSuccess(false);
  }

  function handleGenerateReport() {
    setGenerating(true);
    setTimeout(async () => {
      try {
        const token = await getAccessToken();
        if (token) {
          await fetch("/api/dashboard/events", {
            method: "POST",
            headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              category: "compliance",
              direction: "out",
              status: "completed",
              amount: 0,
              currency: "USDC",
              memo: reportTitle || "Compliance report generated",
              counterparty: recipientEmail || "Internal",
            }),
          });
          window.dispatchEvent(new Event("dashboard:refresh"));
        }
      } catch {
        // non-blocking event log
      }
      setGenerating(false);
      setReportSuccess(true);
    }, 2000);
  }

  function resetModal() {
    setKeyLabel("");
    setKeyScope("account");
    setKeyScopeProduct("");
    setKeyExpiry("30");
    setGeneratingKey(false);
    setGeneratedKey("");
  }

  function handleGenerateKey() {
    setGeneratingKey(true);
    setTimeout(async () => {
      setGeneratingKey(false);
      setGeneratedKey(`0x${randomHex(64)}`);
      try {
        const token = await getAccessToken();
        if (token) {
          await fetch("/api/dashboard/events", {
            method: "POST",
            headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              category: "compliance",
              direction: "out",
              status: "completed",
              amount: 0,
              currency: "USDC",
              memo: `Viewing key generated (${keyScope})`,
              counterparty: keyLabel || "Compliance key",
            }),
          });
          window.dispatchEvent(new Event("dashboard:refresh"));
        }
      } catch {
        // non-blocking event log
      }
    }, 1500);
  }

  /* ── Report columns ── */
  const reportColumns = [
    {
      key: "title",
      header: "Title",
      render: (r: ComplianceReport) => (
        <span style={{ fontWeight: 500 }}>{r.title}</span>
      ),
    },
    {
      key: "range",
      header: "Date Range",
      hideOnMobile: true,
      render: (r: ComplianceReport) =>
        `${formatDate(r.range.from)} – ${formatDate(r.range.to)}`,
    },
    {
      key: "products",
      header: "Products",
      hideOnMobile: true,
      render: (r: ComplianceReport) => (
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
          {r.products.map((p) => (
            <DBadge key={p}>{PRODUCT_LABEL[p] ?? p}</DBadge>
          ))}
        </div>
      ),
    },
    {
      key: "recipient",
      header: "Recipient",
      hideOnMobile: true,
      render: (r: ComplianceReport) => r.recipient,
    },
    {
      key: "generatedAt",
      header: "Generated",
      hideOnMobile: true,
      render: (r: ComplianceReport) => formatDate(r.generatedAt),
    },
    {
      key: "status",
      header: "Status",
      render: (r: ComplianceReport) => {
        const variant =
          r.status === "ready"
            ? "success"
            : r.status === "generating"
              ? "warning"
              : "muted";
        return (
          <DBadge variant={variant} dot>
            {r.status}
          </DBadge>
        );
      },
    },
    {
      key: "size",
      header: "Size",
      align: "right" as const,
      hideOnMobile: true,
      render: (r: ComplianceReport) => r.size,
    },
    {
      key: "download",
      header: "",
      align: "right" as const,
      width: "48px",
      render: (r: ComplianceReport) =>
        r.status === "ready" ? (
          <DButton variant="ghost" size="sm" icon={Download}>
            Download
          </DButton>
        ) : null,
    },
  ];

  /* ── Viewing key columns ── */
  const keyColumns = [
    {
      key: "label",
      header: "Label",
      render: (k: ViewingKey) => (
        <span style={{ fontWeight: 500 }}>{k.label}</span>
      ),
    },
    {
      key: "scope",
      header: "Scope",
      render: (k: ViewingKey) => {
        const variant =
          k.scope === "account"
            ? "violet"
            : k.scope === "product"
              ? "default"
              : "muted";
        return <DBadge variant={variant}>{k.scope}</DBadge>;
      },
    },
    {
      key: "scopeTarget",
      header: "Scope Target",
      hideOnMobile: true,
      render: (k: ViewingKey) => k.scopeTarget,
    },
    {
      key: "createdAt",
      header: "Created",
      hideOnMobile: true,
      render: (k: ViewingKey) => formatDate(k.createdAt),
    },
    {
      key: "expiresAt",
      header: "Expires",
      hideOnMobile: true,
      render: (k: ViewingKey) => formatDate(k.expiresAt),
    },
    {
      key: "shares",
      header: "Shares",
      align: "right" as const,
      render: (k: ViewingKey) => k.shares,
    },
    {
      key: "actions",
      header: "",
      align: "right" as const,
      width: "48px",
      render: () => (
        <DButton variant="ghost" size="sm" icon={Download}>
          Export
        </DButton>
      ),
    },
  ];

  return (
    <>
      <DPageHeader
        title="Compliance"
        description="Authorized disclosure, reports, and viewing keys."
      />

      <DTabs
        items={[
          { id: "reports", label: "Reports", count: totalReports },
          { id: "keys", label: "Viewing Keys", count: activeKeys },
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === "reports" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 24, marginTop: 24 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 16 }}>
            <DStatCard
              label="Total Reports"
              value={String(totalReports)}
              icon={FileDown}
            />
            <DStatCard
              label="Ready"
              value={String(readyCount)}
              icon={ShieldCheck}
            />
            <DStatCard
              label="Expired"
              value={String(expiredCount)}
              icon={FileDown}
            />
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <DButton
              icon={Plus}
              onClick={() => {
                resetDrawer();
                setDrawerOpen(true);
              }}
            >
              Generate Report
            </DButton>
          </div>

          <DTable
            columns={reportColumns}
            data={complianceReports}
            emptyTitle="No compliance reports"
            emptyDescription="Generate your first unshield report."
          />
        </div>
      )}

      {tab === "keys" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 24, marginTop: 24 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 16 }}>
            <DStatCard
              label="Active Keys"
              value={String(activeKeys)}
              icon={Key}
            />
            <DStatCard
              label="Total Shares"
              value={String(totalShares)}
              icon={Eye}
            />
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <DButton
              icon={Plus}
              onClick={() => {
                resetModal();
                setModalOpen(true);
              }}
            >
              Generate Viewing Key
            </DButton>
          </div>

          <DTable
            columns={keyColumns}
            data={viewingKeys}
            emptyTitle="No viewing keys"
            emptyDescription="Generate a viewing key to share read-only access."
          />
        </div>
      )}

      {/* ── Generate Report Drawer ── */}
      <DDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title="Generate Report"
      >
        {reportSuccess ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, padding: "32px 0" }}>
            <ShieldCheck size={40} style={{ color: "var(--color-success, #22c55e)" }} />
            <p style={{ fontWeight: 600, fontSize: 16 }}>Report ready for download</p>
            <DButton
              icon={Download}
              onClick={() => setDrawerOpen(false)}
            >
              Download Report
            </DButton>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <DInput
              label="Report Title"
              value={reportTitle}
              onChange={setReportTitle}
              placeholder="e.g. Q1 2026 auditor package"
            />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <DInput
                label="From"
                type="date"
                value={dateFrom}
                onChange={setDateFrom}
              />
              <DInput
                label="To"
                type="date"
                value={dateTo}
                onChange={setDateTo}
              />
            </div>
            <DSelect
              label="Transaction Type"
              value={txType}
              onChange={setTxType}
              options={[
                { value: "all", label: "All" },
                { value: "inflow", label: "Inflow only" },
                { value: "outflow", label: "Outflow only" },
              ]}
            />
            <DTagSelect
              label="Products"
              options={PRODUCT_OPTIONS}
              selected={selectedProducts}
              onChange={setSelectedProducts}
            />
            <DInput
              label="Recipient Email"
              value={recipientEmail}
              onChange={setRecipientEmail}
              placeholder="auditor@example.com"
            />
            <DButton
              loading={generating}
              onClick={handleGenerateReport}
            >
              Generate Report
            </DButton>
          </div>
        )}
      </DDrawer>

      {/* ── Generate Viewing Key Modal ── */}
      <DModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Generate Viewing Key"
      >
        {generatedKey ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <p>Your viewing key has been generated. Copy it now — it won&apos;t be shown again.</p>
            <DCopyField value={generatedKey} label="Viewing Key" masked />
            <DButton variant="secondary" onClick={() => setModalOpen(false)}>
              Done
            </DButton>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <DInput
              label="Label"
              value={keyLabel}
              onChange={setKeyLabel}
              placeholder="e.g. Finance controller"
            />
            <DSelect
              label="Scope"
              value={keyScope}
              onChange={setKeyScope}
              options={[
                { value: "account", label: "Account-wide" },
                { value: "product", label: "Product-specific" },
                { value: "address", label: "Address-specific" },
              ]}
            />
            {keyScope === "product" && (
              <DSelect
                label="Product"
                value={keyScopeProduct}
                onChange={setKeyScopeProduct}
                options={PRODUCT_OPTIONS}
                placeholder="Select product"
              />
            )}
            <DSelect
              label="Expiry"
              value={keyExpiry}
              onChange={setKeyExpiry}
              options={[
                { value: "30", label: "30 days" },
                { value: "90", label: "90 days" },
                { value: "180", label: "180 days" },
                { value: "365", label: "1 year" },
              ]}
            />
            <DButton
              loading={generatingKey}
              onClick={handleGenerateKey}
            >
              Generate Key
            </DButton>
          </div>
        )}
      </DModal>
    </>
  );
}
