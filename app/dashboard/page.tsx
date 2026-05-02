"use client";

import { useState, useMemo } from "react";
import {
  DPageHeader,
  DStatCard,
  DTable,
  DFilterBar,
  DTabs,
  DBadge,
} from "@/components/dashboard/primitives";
import { AreaChart, DonutChart, BarChart, Sparkline } from "@/components/dashboard/charts";
import { BalanceCard } from "@/components/dashboard/balance-card";
import { MerchantIdentity } from "@/components/dashboard/merchant-identity";
import {
  kpis,
  volume30d,
  productBreakdown,
  dailyVolume,
  transactions,
  type Transaction,
  type Product,
} from "@/components/dashboard/mock-data";
import {
  formatCurrency,
  formatDelta,
  formatNumber,
  formatPercent,
  formatRelativeTime,
  truncateMiddle,
} from "@/components/dashboard/formatters";
import { Activity, DollarSign, ShieldCheck, Users, Zap } from "lucide-react";

const PRODUCT_COLORS: Record<string, string> = {
  gateway: "#7b2fff",
  payroll: "#a855f7",
  storefronts: "#c084fc",
  x402: "#6366f1",
  invoice: "#818cf8",
  tiplinks: "#d8b4fe",
};

const PRODUCT_LABELS: Record<Product, string> = {
  gateway: "Gateway",
  payroll: "Payroll",
  storefronts: "Storefronts",
  x402: "x402",
  invoice: "Invoice",
  tiplinks: "Tiplinks",
};

const STATUS_MAP: Record<string, { variant: "success" | "warning" | "error" | "violet"; label: string }> = {
  shielded: { variant: "success", label: "Shielded" },
  pending: { variant: "warning", label: "Pending" },
  failed: { variant: "error", label: "Failed" },
  released: { variant: "violet", label: "Released" },
};

const txTabs = [
  { id: "all", label: "All" },
  { id: "in", label: "Inflow" },
  { id: "out", label: "Outflow" },
];

export default function DashboardHome() {
  const [txFilter, setTxFilter] = useState("all");
  const [txSearch, setTxSearch] = useState("");

  const d = formatDelta;

  const areaLabels = useMemo(() => {
    return volume30d
      .filter((_, i) => i % 5 === 0 || i === volume30d.length - 1)
      .map((p) => {
        const d = new Date(p.t);
        return `${d.getMonth() + 1}/${d.getDate()}`;
      });
  }, []);

  const areaSeries = useMemo(
    () => [
      { label: "Inflow", color: "#7b2fff", data: volume30d.map((p) => p.inflow) },
      { label: "Outflow", color: "#a855f7", data: volume30d.map((p) => p.outflow) },
      { label: "Shielded", color: "var(--color-success)", data: volume30d.map((p) => p.shielded) },
    ],
    [],
  );

  const donutSlices = useMemo(
    () =>
      productBreakdown.map((p) => ({
        label: p.label,
        value: p.volume,
        color: PRODUCT_COLORS[p.product] ?? "#7b2fff",
      })),
    [],
  );

  const last7Inflow = useMemo(
    () => volume30d.slice(-7).map((p) => p.inflow),
    [],
  );

  const filteredTx = useMemo(() => {
    let list = transactions;
    if (txFilter !== "all") list = list.filter((t) => t.direction === txFilter);
    if (txSearch) {
      const q = txSearch.toLowerCase();
      list = list.filter(
        (t) =>
          t.memo.toLowerCase().includes(q) ||
          t.counterparty.toLowerCase().includes(q) ||
          t.product.includes(q),
      );
    }
    return list;
  }, [txFilter, txSearch]);

  const txColumns = useMemo(
    () => [
      {
        key: "product",
        header: "Product",
        render: (r: Transaction) => (
          <DBadge variant="muted">{PRODUCT_LABELS[r.product]}</DBadge>
        ),
        width: "110px",
      },
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

  return (
    <>
      <MerchantIdentity />

      <DPageHeader
        title="Analytics"
        description="30-day overview of your Unseen Finance activity."
      />

      <div className="dash-balance-row">
        <BalanceCard />
        <div className="dash-kpi-stack">
          <div className="dash-kpi-grid">
            <DStatCard
              icon={DollarSign}
              label="Total Volume (30d)"
              value={formatCurrency(kpis.totalVolume30d, "USDC", { compact: true })}
              delta={d(kpis.totalVolumeDelta)}
              sparkline={<Sparkline data={last7Inflow} />}
            />
            <DStatCard
              icon={ShieldCheck}
              label="Shielded Rate"
              value={formatPercent(kpis.shieldedShare)}
              delta={d(kpis.shieldedShareDelta)}
            />
            <DStatCard
              icon={Users}
              label="Active Customers"
              value={formatNumber(kpis.activeCustomers)}
              delta={d(kpis.activeCustomersDelta)}
            />
            <DStatCard
              icon={Zap}
              label="Avg Settlement"
              value={`${kpis.avgSettlementMs}ms`}
              delta={d(kpis.avgSettlementDelta)}
            />
          </div>
        </div>
      </div>

      <div className="dash-charts-row">
        <div className="dash-chart-card glass-card">
          <h3 className="dash-chart-card__title">Volume (30 days)</h3>
          <AreaChart series={areaSeries} labels={areaLabels} height={260} />
        </div>

        <div className="dash-chart-card dash-chart-card--narrow glass-card">
          <h3 className="dash-chart-card__title">By Product</h3>
          <div className="dash-donut-wrap">
            <DonutChart
              slices={donutSlices}
              centerValue={formatCurrency(kpis.totalVolume30d, "USDC", { compact: true })}
              centerLabel="Total"
            />
          </div>
          <div className="dash-donut-legend">
            {productBreakdown.map((p) => (
              <div className="dash-donut-legend__row" key={p.product}>
                <span className="dash-donut-legend__dot" style={{ background: PRODUCT_COLORS[p.product] }} />
                <span className="dash-donut-legend__label">{p.label}</span>
                <span className="dash-donut-legend__pct">{formatPercent(p.share)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="dash-chart-card glass-card">
        <h3 className="dash-chart-card__title">Daily Volume (this week)</h3>
        <BarChart data={dailyVolume} color="var(--color-violet-primary)" height={180} />
      </div>

      <div className="dash-section">
        <h2 className="dash-section__heading">Transaction History</h2>
        <DFilterBar search={txSearch} onSearch={setTxSearch} searchPlaceholder="Search transactions…">
          <DTabs items={txTabs} active={txFilter} onChange={setTxFilter} />
        </DFilterBar>
        <DTable columns={txColumns} data={filteredTx} emptyTitle="No transactions found" />
      </div>
    </>
  );
}
