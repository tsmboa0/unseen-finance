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
  DDrawer,
  DSelect,
  DInput,
  DStepper,
  DEmptyState,
} from "@/components/dashboard/primitives";
import { Sparkline } from "@/components/dashboard/charts";
import type { PayrollRun, Recipient } from "@/lib/dashboard-types";
import { useDashboardOverview } from "@/hooks/use-dashboard-overview";
import { usePrivy } from "@privy-io/react-auth";
import {
  formatCurrency,
  formatDate,
  formatRelativeTime,
} from "@/components/dashboard/formatters";
import { Users, Upload, Play, Check, Clock, AlertTriangle } from "lucide-react";

const STATUS_COLOR: Record<PayrollRun["status"], "warning" | "violet" | "success" | "error"> = {
  scheduled: "warning",
  running: "violet",
  settled: "success",
  failed: "error",
};

const STATUS_LABEL: Record<PayrollRun["status"], string> = {
  scheduled: "Scheduled",
  running: "Running",
  settled: "Settled",
  failed: "Failed",
};

const CATEGORY_OPTIONS = [
  { value: "Employees", label: "Employees" },
  { value: "Contractors", label: "Contractors" },
  { value: "Advisors", label: "Advisors" },
  { value: "Partners", label: "Partners" },
];

const WIZARD_STEPS = ["Category", "Recipients", "Review"];

const columns = [
  {
    key: "memo",
    header: "Memo",
    render: (row: PayrollRun) => <span className="font-medium">{row.memo}</span>,
  },
  {
    key: "category",
    header: "Category",
    render: (row: PayrollRun) => <DBadge variant="muted">{row.category}</DBadge>,
    hideOnMobile: true,
  },
  {
    key: "recipients",
    header: "Recipients",
    render: (row: PayrollRun) => row.recipientCount,
    align: "right" as const,
    hideOnMobile: true,
  },
  {
    key: "total",
    header: "Total",
    render: (row: PayrollRun) => formatCurrency(row.total, row.currency),
    align: "right" as const,
  },
  {
    key: "status",
    header: "Status",
    render: (row: PayrollRun) => (
      <DBadge variant={STATUS_COLOR[row.status]} dot>
        {STATUS_LABEL[row.status]}
      </DBadge>
    ),
  },
  {
    key: "date",
    header: "Date",
    render: (row: PayrollRun) => formatDate(row.scheduledFor),
    hideOnMobile: true,
  },
];

export default function PayrollPage() {
  const { data, loading } = useDashboardOverview();
  const { getAccessToken } = usePrivy();
  const payrollRuns = data?.overview.payrollRuns ?? [];
  const payrollTemplates = data?.overview.payrollTemplates ?? [];
  const sampleRecipients = data?.overview.sampleRecipients ?? [];
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [category, setCategory] = useState("");
  const [memo, setMemo] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [sourceMode, setSourceMode] = useState<"template" | "csv">("template");
  const [dispatching, setDispatching] = useState(false);
  const [dispatched, setDispatched] = useState(false);

  if (loading && !data) {
    return (
      <div className="d-card" style={{ minHeight: 220, display: "grid", placeItems: "center" }}>
        <div style={{ width: 28, height: 28, border: "3px solid rgba(123,47,255,0.2)", borderTopColor: "#7b2fff", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      </div>
    );
  }

  const totalDisbursed = useMemo(
    () => payrollRuns.filter((r) => r.status === "settled").reduce((s, r) => s + r.total, 0),
    [],
  );

  const upcomingRun = useMemo(
    () => payrollRuns.find((r) => r.status === "scheduled"),
    [],
  );

  const totalRecipients = useMemo(
    () => payrollTemplates.reduce((s, t) => s + t.recipients, 0),
    [],
  );

  const chosenTemplate = payrollTemplates.find((t) => t.id === selectedTemplate);
  const reviewTotal = sampleRecipients.reduce((s, r) => s + r.amount, 0);

  function openDrawer() {
    setStep(0);
    setCategory("");
    setMemo("");
    setSelectedTemplate("");
    setSourceMode("template");
    setDispatching(false);
    setDispatched(false);
    setDrawerOpen(true);
  }

  function handleDispatch() {
    setDispatching(true);
    setTimeout(async () => {
      try {
        const token = await getAccessToken();
        if (token) {
          await fetch("/api/dashboard/events", {
            method: "POST",
            headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              category: "payroll",
              direction: "out",
              status: "completed",
              amount: reviewTotal,
              currency: "USDC",
              memo: memo || "Payroll dispatch",
              metadata: { recipients: sampleRecipients.length, category },
            }),
          });
          window.dispatchEvent(new Event("dashboard:refresh"));
        }
      } catch {
        // non-blocking analytics event
      }
      setDispatching(false);
      setDispatched(true);
      setTimeout(() => setDrawerOpen(false), 1500);
    }, 1500);
  }

  return (
    <>
      <DPageHeader
        title="Payroll"
        description="Manage shielded payroll runs."
        actions={
          <DButton variant="primary" icon={Play} onClick={openDrawer}>
            Run Payroll
          </DButton>
        }
      />

      <div className="d-grid d-grid--3">
        <DStatCard
          label="Total Disbursed"
          value={formatCurrency(totalDisbursed, "USDC", { compact: true })}
          icon={Check}
        />
        <DStatCard
          label="Upcoming"
          value={upcomingRun ? formatCurrency(upcomingRun.total, "USDC", { compact: true }) : "—"}
          icon={Clock}
        />
        <DStatCard
          label="Recipients"
          value={totalRecipients.toLocaleString()}
          icon={Users}
        />
      </div>

      <section className="d-section">
        <h2 className="d-section__title">Payroll Runs</h2>
        {loading ? (
          <div className="d-card" style={{ minHeight: 140, display: "grid", placeItems: "center" }}>
            <div style={{ width: 24, height: 24, border: "3px solid rgba(123,47,255,0.2)", borderTopColor: "#7b2fff", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
          </div>
        ) : (
          <DTable columns={columns} data={payrollRuns} emptyTitle="No payroll runs" />
        )}
      </section>

      <DDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title="Run Payroll">
        <DStepper steps={WIZARD_STEPS} current={step} />

        <div style={{ marginTop: 24 }}>
          {/* Step 0: Category */}
          {step === 0 && (
            <div className="d-stack d-stack--md">
              <DSelect
                label="Category"
                value={category}
                onChange={setCategory}
                options={CATEGORY_OPTIONS}
                placeholder="Select category…"
              />
              <DInput
                label="Memo"
                value={memo}
                onChange={setMemo}
                placeholder="e.g. May 2026 payroll"
              />
              <div className="d-flex d-flex--end">
                <DButton
                  variant="primary"
                  disabled={!category}
                  onClick={() => setStep(1)}
                >
                  Next
                </DButton>
              </div>
            </div>
          )}

          {/* Step 1: Recipients */}
          {step === 1 && (
            <div className="d-stack d-stack--md">
              <div className="d-stack d-stack--sm">
                <label className="d-field__label">Source</label>
                <div className="d-flex d-flex--gap-sm">
                  <DButton
                    variant={sourceMode === "template" ? "primary" : "ghost"}
                    size="sm"
                    icon={Users}
                    onClick={() => setSourceMode("template")}
                  >
                    Template
                  </DButton>
                  <DButton
                    variant={sourceMode === "csv" ? "primary" : "ghost"}
                    size="sm"
                    icon={Upload}
                    onClick={() => setSourceMode("csv")}
                  >
                    Upload CSV
                  </DButton>
                </div>
              </div>

              {sourceMode === "template" ? (
                <div className="d-stack d-stack--sm">
                  {payrollTemplates.map((tpl) => (
                    <button
                      key={tpl.id}
                      type="button"
                      onClick={() => setSelectedTemplate(tpl.id)}
                      className={`d-select-card ${selectedTemplate === tpl.id ? "is-selected" : ""}`}
                    >
                      <div>
                        <span className="d-select-card__name">{tpl.name}</span>
                        <span className="d-select-card__meta">
                          {tpl.recipients} recipients · Last used {formatRelativeTime(tpl.lastUsed)}
                        </span>
                      </div>
                      {selectedTemplate === tpl.id && (
                        <Check size={16} className="d-select-card__check" />
                      )}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="d-upload-area">
                  <Upload size={24} />
                  <p>Drop a CSV file here or click to browse</p>
                  <span className="d-upload-area__hint">
                    Columns: handle, wallet, amount, currency, role
                  </span>
                </div>
              )}

              <div className="d-flex d-flex--between">
                <DButton variant="ghost" onClick={() => setStep(0)}>
                  Back
                </DButton>
                <DButton
                  variant="primary"
                  disabled={sourceMode === "template" && !selectedTemplate}
                  onClick={() => setStep(2)}
                >
                  Next
                </DButton>
              </div>
            </div>
          )}

          {/* Step 2: Review */}
          {step === 2 && !dispatched && (
            <div className="d-stack d-stack--md">
              <div className="d-review-grid">
                <div className="d-review-grid__item">
                  <span className="d-review-grid__label">Category</span>
                  <span className="d-review-grid__value">{category}</span>
                </div>
                <div className="d-review-grid__item">
                  <span className="d-review-grid__label">Memo</span>
                  <span className="d-review-grid__value">{memo || "—"}</span>
                </div>
                <div className="d-review-grid__item">
                  <span className="d-review-grid__label">Template</span>
                  <span className="d-review-grid__value">
                    {chosenTemplate?.name ?? "CSV upload"}
                  </span>
                </div>
              </div>

              <div className="d-table-wrap">
                <table className="d-table">
                  <thead>
                    <tr>
                      <th>Handle</th>
                      <th style={{ textAlign: "right" }}>Amount</th>
                      <th>Role</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sampleRecipients.map((r) => (
                      <tr key={r.id}>
                        <td>{r.handle}</td>
                        <td style={{ textAlign: "right" }}>
                          {formatCurrency(r.amount, r.currency)}
                        </td>
                        <td>{r.role}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="d-review-total">
                <span>Total</span>
                <strong>{formatCurrency(reviewTotal, "USDC")}</strong>
              </div>

              <div className="d-flex d-flex--between">
                <DButton variant="ghost" onClick={() => setStep(1)}>
                  Back
                </DButton>
                <DButton
                  variant="primary"
                  icon={Play}
                  loading={dispatching}
                  onClick={handleDispatch}
                >
                  Shield &amp; Dispatch
                </DButton>
              </div>
            </div>
          )}

          {/* Success */}
          {step === 2 && dispatched && (
            <div className="d-success-message">
              <div className="d-success-message__icon">
                <Check size={32} />
              </div>
                    <h3>Payroll dispatched</h3>
              <p>
                    {sampleRecipients.length} shielded transfers queued for{" "}
                {formatCurrency(reviewTotal, "USDC")}.
              </p>
            </div>
          )}
        </div>
      </DDrawer>
    </>
  );
}
