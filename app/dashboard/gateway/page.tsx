"use client";

import { useState, useMemo } from "react";
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
  DEmptyState,
} from "@/components/dashboard/primitives";
import { Sparkline, AreaChart } from "@/components/dashboard/charts";
import {
  transactions,
  kpis,
  type Transaction,
} from "@/components/dashboard/mock-data";
import {
  formatCurrency,
  formatDelta,
  formatRelativeTime,
  truncateMiddle,
  formatNumber,
} from "@/components/dashboard/formatters";
import { Shield, Copy, ExternalLink, Settings, Plus, RefreshCcw } from "lucide-react";

const STATUS_MAP: Record<string, { variant: "success" | "warning" | "error" | "violet"; label: string }> = {
  shielded: { variant: "success", label: "Shielded" },
  pending: { variant: "warning", label: "Pending" },
  failed: { variant: "error", label: "Failed" },
  released: { variant: "violet", label: "Released" },
};

const gatewayTx = transactions.filter((t) => t.product === "gateway");

const tabs = [
  { id: "all", label: "All" },
  { id: "shielded", label: "Shielded" },
  { id: "pending", label: "Pending" },
];

export default function GatewayPage() {
  const [tab, setTab] = useState("all");
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  const [formAmount, setFormAmount] = useState("");
  const [formCurrency, setFormCurrency] = useState("USDC");
  const [formDescription, setFormDescription] = useState("");
  const [formPrivacy, setFormPrivacy] = useState("shielded");

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
  }, [tab, search]);

  const sparklineData = useMemo(
    () => gatewayTx.slice(0, 7).map((t) => t.amount).reverse(),
    [],
  );

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
          const s = STATUS_MAP[r.status];
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

  function resetForm() {
    setFormAmount("");
    setFormCurrency("USDC");
    setFormDescription("");
    setFormPrivacy("shielded");
  }

  function handleCreate() {
    setCreating(true);
    setTimeout(() => {
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
          value={formatCurrency(1_086_300, "USDC", { compact: true })}
          delta={formatDelta(kpis.totalVolumeDelta)}
          sparkline={<Sparkline data={sparklineData} />}
        />
        <DStatCard
          label="Sessions"
          value={formatNumber(842)}
          delta={formatDelta(12.4)}
        />
        <DStatCard
          label="Avg Session Value"
          value={formatCurrency(1_290, "USDC")}
          delta={formatDelta(5.8)}
        />
      </div>

      <div className="dash-section">
        <h2 className="dash-section__heading">Recent Payments</h2>
        <DFilterBar search={search} onSearch={setSearch} searchPlaceholder="Search payments…">
          <DTabs items={tabs} active={tab} onChange={setTab} />
        </DFilterBar>
        <DTable
          columns={columns}
          data={filtered}
          emptyTitle="No payments found"
          emptyDescription="Try adjusting your filters or search query."
        />
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
