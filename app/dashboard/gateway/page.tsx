"use client";

import { useState, useMemo, useEffect } from "react";
import {
  DPageHeader,
  DStatCard,
  DTable,
  DFilterBar,
  DTabs,
  DBadge,
  DButton,
  DModal,
  DSelect,
  DInput,
} from "@/components/dashboard/primitives";
import { Sparkline } from "@/components/dashboard/charts";
import type { Transaction } from "@/lib/dashboard-types";
import { useDashboardOverview } from "@/hooks/use-dashboard-overview";
import {
  formatCurrency,
  formatRelativeTime,
  formatNumber,
} from "@/components/dashboard/formatters";
import { Shield, Plus, ChevronLeft, ChevronRight } from "lucide-react";
import { usePrivy } from "@privy-io/react-auth";

const STATUS_MAP: Record<string, { variant: "success" | "warning" | "error" | "violet"; label: string }> = {
  confirmed: { variant: "success", label: "Confirmed" },
  shielded: { variant: "success", label: "Shielded" },
  pending: { variant: "warning", label: "Pending" },
  failed: { variant: "error", label: "Failed" },
  released: { variant: "violet", label: "Released" },
};

const ITEMS_PER_PAGE = 10;

const tabs = [
  { id: "all", label: "All" },
  { id: "confirmed", label: "Confirmed" },
  { id: "pending", label: "Pending" },
  { id: "failed", label: "Failed" },
];

export default function GatewayPage() {
  const { data, loading } = useDashboardOverview();
  const { getAccessToken } = usePrivy();

  const [tab, setTab] = useState("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [formAmount, setFormAmount] = useState("");
  const [formCurrency, setFormCurrency] = useState("USDC");
  const [formDescription, setFormDescription] = useState("");
  const [formPrivacy, setFormPrivacy] = useState("shielded");

  // Only gateway product transactions — excludes claim, shield, unshield, payroll etc.
  const gatewayTx = useMemo(
    () => (data?.overview.transactions ?? []).filter((t) => t.product === "gateway"),
    [data],
  );

  const gatewayVolume = useMemo(
    () => gatewayTx.reduce((s, t) => s + t.amount, 0),
    [gatewayTx],
  );

  const sparklineData = useMemo(
    () => gatewayTx.slice(0, 7).map((t) => t.amount).reverse(),
    [gatewayTx],
  );

  const filtered = useMemo(() => {
    let list = gatewayTx;
    if (tab !== "all") list = list.filter((t) => t.status === tab);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (t) =>
          t.memo.toLowerCase().includes(q) ||
          t.counterparty.toLowerCase().includes(q) ||
          t.txHash.toLowerCase().includes(q),
      );
    }
    return list;
  }, [gatewayTx, tab, search]);

  // Reset to page 1 whenever the filter/search changes
  useEffect(() => { setPage(1); }, [tab, search]);

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE) || 1;

  const paginatedTx = useMemo(() => {
    const start = (page - 1) * ITEMS_PER_PAGE;
    return filtered.slice(start, start + ITEMS_PER_PAGE);
  }, [filtered, page]);

  const columns = useMemo(
    () => [
      {
        key: "memo",
        header: "Description",
        render: (r: Transaction) => (
          <div className="d-tx-desc">
            <span className="d-tx-desc__memo">{r.memo}</span>
            <span className="d-tx-desc__party">{r.counterparty}</span>
          </div>
        ),
      },
      {
        key: "amount",
        header: "Amount",
        align: "right" as const,
        render: (r: Transaction) => (
          <span className={`d-tx-amount ${r.direction === "in" ? "d-tx-amount--in" : "d-tx-amount--out"}`}>
            {r.direction === "in" ? "+" : "−"}
            {formatCurrency(r.amount, r.currency)}
          </span>
        ),
        width: "160px",
      },
      {
        key: "status",
        header: "Status",
        render: (r: Transaction) => {
          const s = STATUS_MAP[r.status] ?? { variant: "warning" as const, label: r.status };
          return <DBadge variant={s.variant} dot>{s.label}</DBadge>;
        },
        width: "120px",
        hideOnMobile: true,
      },
      {
        key: "hash",
        header: "Tx Hash",
        render: (r: Transaction) => (
          <code className="d-tx-hash">{r.txHash}</code>
        ),
        width: "120px",
        hideOnMobile: true,
      },
      {
        key: "time",
        header: "Time",
        align: "right" as const,
        render: (r: Transaction) => (
          <span className="d-tx-time">{formatRelativeTime(r.timestamp)}</span>
        ),
        width: "100px",
      },
    ],
    [],
  );

  if (loading && !data) {
    return (
      <div className="d-card" style={{ minHeight: 220, display: "grid", placeItems: "center" }}>
        <div style={{ width: 28, height: 28, border: "3px solid rgba(123,47,255,0.2)", borderTopColor: "#7b2fff", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      </div>
    );
  }

  function resetForm() {
    setFormAmount("");
    setFormCurrency("USDC");
    setFormDescription("");
    setFormPrivacy("shielded");
  }

  function handleCreate() {
    setCreating(true);
    setTimeout(async () => {
      try {
        const token = await getAccessToken();
        if (token) {
          await fetch("/api/dashboard/events", {
            method: "POST",
            headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              category: "payment",
              direction: "in",
              status: "pending",
              amount: Number(formAmount || 0),
              currency: formCurrency,
              memo: formDescription || "Checkout session created",
              counterparty: "Gateway checkout",
            }),
          });
          window.dispatchEvent(new Event("dashboard:refresh"));
        }
      } catch {
        // non-blocking event log
      }
      setCreating(false);
      setModalOpen(false);
      resetForm();
    }, 1000);
  }

  return (
    <>
      <DPageHeader
        title="Gateway"
        description="Payment sessions, checkout, and settlement."
        actions={
          <DButton icon={Plus} variant="primary" onClick={() => setModalOpen(true)}>
            Create Checkout Session
          </DButton>
        }
      />

      <div className="dash-kpi-grid">
        <DStatCard
          icon={Shield}
          label="Gateway Volume (30d)"
          value={formatCurrency(gatewayVolume, "USDC", { compact: true })}
          sparkline={<Sparkline data={sparklineData} />}
        />
        <DStatCard
          label="Sessions"
          value={formatNumber(gatewayTx.length)}
        />
        <DStatCard
          label="Avg Session Value"
          value={formatCurrency(gatewayTx.length ? gatewayVolume / gatewayTx.length : 0, "USDC")}
        />
        <DStatCard
          label="Confirmed"
          value={formatNumber(gatewayTx.filter((t) => t.status === "shielded" || t.status === "released").length)}
        />
      </div>

      <div className="dash-section">
        <h2 className="dash-section__heading">Recent Payments</h2>
        <DFilterBar search={search} onSearch={setSearch} searchPlaceholder="Search payments…">
          <DTabs items={tabs} active={tab} onChange={setTab} />
        </DFilterBar>
        {loading ? (
          <div className="d-card" style={{ minHeight: 140, display: "grid", placeItems: "center" }}>
            <div style={{ width: 24, height: 24, border: "3px solid rgba(123,47,255,0.2)", borderTopColor: "#7b2fff", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
          </div>
        ) : (
          <>
            <DTable
              columns={columns}
              data={paginatedTx}
              emptyTitle="No gateway payments found"
              emptyDescription="Try adjusting your filters or search query."
            />
            {totalPages > 1 && (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 16, padding: "0 8px" }}>
                <span style={{ fontSize: 13, color: "var(--color-text-muted)", fontWeight: 500 }}>
                  Showing {(page - 1) * ITEMS_PER_PAGE + 1}–{Math.min(page * ITEMS_PER_PAGE, filtered.length)} of {filtered.length}
                </span>
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    type="button"
                    className="d-btn d-btn--secondary d-btn--sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    style={{ display: "flex", alignItems: "center", gap: 6 }}
                  >
                    <ChevronLeft size={14} aria-hidden />
                    <span>Previous</span>
                  </button>
                  <button
                    type="button"
                    className="d-btn d-btn--secondary d-btn--sm"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    style={{ display: "flex", alignItems: "center", gap: 6 }}
                  >
                    <span>Next</span>
                    <ChevronRight size={14} aria-hidden />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <DModal open={modalOpen} onClose={() => { setModalOpen(false); resetForm(); }} title="Create Checkout Session">
        <div className="dash-form-stack">
          <DInput
            label="Amount"
            value={formAmount}
            onChange={setFormAmount}
            placeholder="0.00"
            type="number"
          />
          <DSelect
            label="Currency"
            value={formCurrency}
            onChange={setFormCurrency}
            options={[
              { value: "USDC", label: "USDC" },
              { value: "SOL", label: "SOL" },
            ]}
          />
          <DInput
            label="Description"
            value={formDescription}
            onChange={setFormDescription}
            placeholder="Order description…"
          />
          <DSelect
            label="Privacy"
            value={formPrivacy}
            onChange={setFormPrivacy}
            options={[
              { value: "shielded", label: "Shielded" },
              { value: "public", label: "Public" },
            ]}
          />
          <div className="dash-form-actions">
            <DButton variant="ghost" onClick={() => { setModalOpen(false); resetForm(); }}>
              Cancel
            </DButton>
            <DButton variant="primary" loading={creating} onClick={handleCreate}>
              Create
            </DButton>
          </div>
        </div>
      </DModal>
    </>
  );
}
