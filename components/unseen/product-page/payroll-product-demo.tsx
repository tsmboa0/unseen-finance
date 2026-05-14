"use client";

import {
  DPageHeader,
  DStatCard,
  DTable,
  DBadge,
  DButton,
  DDrawer,
  DSelect,
  DInput,
  DStepper,
  DModal,
} from "@/components/dashboard/primitives";
import { formatCurrency, formatDate } from "@/components/dashboard/formatters";
import type { PayrollRun } from "@/lib/dashboard-types";
import { Check, Users, ListOrdered, Play, Loader2, Coins, LayoutDashboard } from "lucide-react";
import { rangeActive, useLoopTime } from "@/components/unseen/demo-utils";

/** < 1 = faster timeline (0.5 ≈ 2× speed). */
const DEMO_PACE = 0.5;
const ms = (n: number) => Math.round(n * DEMO_PACE);

const WIZARD_STEPS = ["Details", "Recipients", "Review & run"];

const CYCLE_MS = ms(34000);

const CATEGORY_OPTIONS = [
  { value: "Employees", label: "Employees" },
  { value: "Contractors", label: "Contractors" },
];

const CURRENCY_OPTIONS = [
  { value: "USDC", label: "USDC" },
  { value: "USDT", label: "USDT" },
];

const ROW_A = {
  address: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  amount: "1250",
};

const ROW_B = {
  address: "So11111111111111111111111111111111111111112",
  amount: "875.5",
};

type ModalPhase = "preparing" | "delegation" | "signing" | "executing" | "success" | "idle";

const STATUS_COLOR: Record<PayrollRun["status"], "warning" | "violet" | "success" | "error" | "muted"> = {
  draft: "muted",
  awaiting_delegation: "violet",
  processing: "warning",
  completed: "success",
  partial: "warning",
  failed: "error",
};

export default function PayrollProductDemo({
  large = false,
  active = true,
}: {
  large?: boolean;
  active?: boolean;
}) {
  const elapsed = useLoopTime(CYCLE_MS, { paused: !active, intervalMs: 50 });

  const fadeLoopEnd = elapsed > ms(32000) ? 1 - Math.min((elapsed - ms(32000)) / ms(2000), 1) : 1;

  const drawerOpen = elapsed >= ms(2200) && elapsed < ms(18200);
  const pressedRun = rangeActive(elapsed, ms(1700), ms(2150));

  const wizardStep = !drawerOpen ? 0 : elapsed < ms(4500) ? 0 : elapsed < ms(8200) ? 1 : 2;

  const rowCount = wizardStep !== 1 ? 2 : elapsed < ms(5000) ? 0 : elapsed < ms(6400) ? 1 : 2;

  const category = "Employees";
  const memo = "May 2026 payroll";
  const currency = "USDC";

  const recipients =
    rowCount === 0
      ? []
      : rowCount === 1
        ? [{ id: "r1", address: ROW_A.address, amount: ROW_A.amount }]
        : [
            { id: "r1", address: ROW_A.address, amount: ROW_A.amount },
            { id: "r2", address: ROW_B.address, amount: ROW_B.amount },
          ];

  const reviewTotal = recipients.reduce((s, r) => s + (Number(r.amount) || 0), 0);

  const modalOpen = elapsed >= ms(9000) && elapsed < ms(16800);
  let modalPhase: ModalPhase = "idle";
  if (modalOpen) {
    if (elapsed < ms(10200)) modalPhase = "preparing";
    else if (elapsed < ms(11800)) modalPhase = "delegation";
    else if (elapsed < ms(13400)) modalPhase = "signing";
    else if (elapsed < ms(15000)) modalPhase = "executing";
    else modalPhase = "success";
  }

  const modalTitle =
    modalPhase === "preparing"
      ? "Run payroll"
      : modalPhase === "delegation"
        ? "Run payroll"
        : modalPhase === "signing"
          ? "Authorize"
          : modalPhase === "executing"
            ? "Sending"
            : modalPhase === "success"
              ? "Sent"
              : "Run payroll";

  const nowTs = Date.now();
  const mockHistory: PayrollRun[] =
    elapsed >= ms(18200)
      ? [
          {
            id: "demo_run",
            memo,
            category: category as PayrollRun["category"],
            currency: currency as PayrollRun["currency"],
            status: "completed",
            recipientCount: 2,
            successCount: 2,
            total: reviewTotal,
            scheduledFor: nowTs,
            completedAt: nowTs,
          },
        ]
      : [];

  const historyColumns = [
    {
      key: "memo",
      header: "Memo",
      render: (row: PayrollRun) => <span className="font-medium">{row.memo}</span>,
    },
    {
      key: "recipients",
      header: "Paid / total",
      render: (row: PayrollRun) => (
        <span>
          {row.successCount ?? 0} / {row.recipientCount}
        </span>
      ),
      align: "right" as const,
      hideOnMobile: true,
    },
    {
      key: "total",
      header: "Sent",
      render: (row: PayrollRun) => formatCurrency(row.total, row.currency),
      align: "right" as const,
    },
    {
      key: "status",
      header: "Status",
      render: (row: PayrollRun) => (
        <DBadge variant={STATUS_COLOR[row.status]} dot>
          {row.status === "completed" ? "Completed" : row.status}
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

  return (
    <div
      className={`payroll-product-demo storefront-demo ${large ? "storefront-demo--large payroll-product-demo--large" : ""}`}
      style={{ opacity: fadeLoopEnd }}
    >
      <div className="storefront-demo__browser payroll-product-demo__browser">
        <div className="storefront-demo__chrome">
          <div className="storefront-demo__chrome-dots">
            <span />
            <span />
            <span />
          </div>
          <div className="storefront-demo__url storefront-demo__url--creator payroll-product-demo__url-bar">
            <LayoutDashboard aria-hidden="true" size={12} />
            <span className="storefront-demo__url-text">app.unseen.finance/dashboard/payroll</span>
          </div>
        </div>

        <div className="storefront-demo__surface storefront-demo__surface--payroll payroll-product-demo__surface">
          <div className="dashboard-embed-demo__stage">
            <div className="payroll-product-demo__dash">
              <DPageHeader
                title="Payroll"
                description="Pay from your public balance into each recipient's encrypted Umbra balance."
                actions={
                  <DButton
                    variant="primary"
                    className={pressedRun ? "payroll-product-demo__btn--press" : undefined}
                    icon={Play}
                    type="button"
                  >
                    Run payroll
                  </DButton>
                }
              />

              <div className="d-grid d-grid--3 payroll-product-demo__stats">
                <DStatCard
                  label="Total sent (all tokens)"
                  value={elapsed >= ms(18200) ? formatCurrency(reviewTotal, "USD") : "—"}
                  icon={Check}
                />
                <DStatCard
                  label="Payroll runs"
                  value={elapsed >= ms(18200) ? "1" : "0"}
                  icon={ListOrdered}
                />
                <DStatCard
                  label="Recipients (last run)"
                  value={elapsed >= ms(18200) ? "2" : "—"}
                  icon={Users}
                />
              </div>

              <section className="d-section payroll-product-demo__history">
                <h2 className="d-section__title">History</h2>
                <DTable columns={historyColumns} data={mockHistory} emptyTitle="No payroll runs yet" />
              </section>
            </div>

            <DDrawer open={drawerOpen} onClose={() => {}} title="Run payroll">
              <DStepper current={wizardStep} steps={WIZARD_STEPS} />

              <div className="payroll-product-demo__wizard-body">
                {wizardStep === 0 && (
                  <div className="d-stack d-stack--md">
                    <DSelect
                      label="Category"
                      options={CATEGORY_OPTIONS}
                      placeholder="Select category…"
                      value={category}
                      onChange={() => {}}
                    />
                    <DInput
                      label="Memo"
                      onChange={() => {}}
                      placeholder="e.g. May 2026 payroll"
                      value={memo}
                    />
                    <DSelect label="Token" options={CURRENCY_OPTIONS} value={currency} onChange={() => {}} />
                    <p className="payroll-product-demo__hint">
                      Each payout uses your <strong>public</strong> {currency} balance and credits the recipient&apos;s{" "}
                      <strong>encrypted</strong> balance.
                    </p>
                    <div className="d-flex d-flex--end">
                      <DButton variant="primary" type="button">
                        Next
                      </DButton>
                    </div>
                  </div>
                )}

                {wizardStep === 1 && (
                  <div className="d-stack d-stack--md">
                    <div className="d-flex d-flex--between d-flex--align-center">
                      <span className="d-field__label payroll-product-demo__recipients-label">Recipients</span>
                      <DButton size="sm" type="button" variant="secondary">
                        Add row
                      </DButton>
                    </div>
                    <p className="payroll-product-demo__csv-hint">
                      CSV format: <code>wallet,amount</code>
                    </p>

                    <div className="d-stack d-stack--sm">
                      {rowCount === 0 ? (
                        <p className="payroll-product-demo__empty-rows">Add rows manually or upload a CSV.</p>
                      ) : (
                        recipients.map((row, idx) => (
                          <div
                            className="d-flex d-flex--gap-sm payroll-product-demo__row"
                            key={row.id}
                            style={{ alignItems: "flex-end", flexWrap: "wrap" }}
                          >
                            <div style={{ flex: "1 1 180px" }}>
                              <DInput
                                label={idx === 0 ? "Wallet address" : "\u00a0"}
                                onChange={() => {}}
                                placeholder="Solana address"
                                value={row.address}
                              />
                            </div>
                            <div style={{ flex: "0 1 100px" }}>
                              <DInput
                                label={idx === 0 ? "Amount" : "\u00a0"}
                                onChange={() => {}}
                                placeholder="0.00"
                                type="text"
                                value={row.amount}
                              />
                            </div>
                            <DButton size="sm" type="button" variant="ghost">
                              Remove
                            </DButton>
                          </div>
                        ))
                      )}
                    </div>

                    <div className="d-flex d-flex--between">
                      <DButton type="button" variant="ghost">
                        Back
                      </DButton>
                      <DButton disabled={rowCount < 2} type="button" variant="primary">
                        Next
                      </DButton>
                    </div>
                  </div>
                )}

                {wizardStep === 2 && (
                  <div className="d-stack d-stack--md">
                    <div className="d-review-grid">
                      <div className="d-review-grid__item">
                        <span className="d-review-grid__label">Category</span>
                        <span className="d-review-grid__value">{category}</span>
                      </div>
                      <div className="d-review-grid__item">
                        <span className="d-review-grid__label">Memo</span>
                        <span className="d-review-grid__value">{memo}</span>
                      </div>
                      <div className="d-review-grid__item">
                        <span className="d-review-grid__label">Token</span>
                        <span className="d-review-grid__value">{currency}</span>
                      </div>
                      <div className="d-review-grid__item">
                        <span className="d-review-grid__label">Recipients</span>
                        <span className="d-review-grid__value">{recipients.length}</span>
                      </div>
                    </div>

                    <div className="d-review-total">
                      <span>Total</span>
                      <strong>{formatCurrency(reviewTotal, currency as "USDC" | "USDT")}</strong>
                    </div>

                    <div className="d-flex d-flex--between">
                      <DButton type="button" variant="ghost">
                        Back
                      </DButton>
                      <DButton icon={Coins} type="button" variant="primary">
                        Run payroll…
                      </DButton>
                    </div>
                  </div>
                )}
              </div>
            </DDrawer>

            <DModal onClose={() => {}} open={modalOpen} title={modalTitle}>
              <div className="d-stack d-stack--md payroll-product-demo__modal-inner">
                {modalPhase === "preparing" ? (
                  <div className="d-flex d-flex--gap-md" style={{ alignItems: "center" }}>
                    <Loader2
                      aria-hidden
                      size={22}
                      style={{
                        animation: "spin 0.8s linear infinite",
                        color: "var(--color-text-muted)",
                      }}
                    />
                    <p style={{ color: "var(--color-text-muted)", lineHeight: 1.45, margin: 0 }}>Creating run…</p>
                  </div>
                ) : null}

                {modalPhase === "delegation" ? (
                  <>
                    <p style={{ color: "var(--color-text-muted)", lineHeight: 1.45, margin: 0 }}>
                      Approve server signing in Privy.
                    </p>
                    <div className="d-flex d-flex--end d-flex--gap-sm">
                      <DButton type="button" variant="ghost">
                        Cancel
                      </DButton>
                      <DButton
                        className={rangeActive(elapsed, ms(11000), ms(11800)) ? "payroll-product-demo__btn--pulse" : undefined}
                        type="button"
                        variant="primary"
                      >
                        Continue
                      </DButton>
                    </div>
                  </>
                ) : null}

                {modalPhase === "signing" ? (
                  <div className="d-flex d-flex--gap-md" style={{ alignItems: "center" }}>
                    <Loader2
                      aria-hidden
                      size={22}
                      style={{
                        animation: "spin 0.8s linear infinite",
                        color: "var(--color-text-muted)",
                      }}
                    />
                    <p style={{ color: "var(--color-text-muted)", lineHeight: 1.45, margin: 0 }}>Authorizing…</p>
                  </div>
                ) : null}

                {modalPhase === "executing" ? (
                  <div className="d-flex d-flex--gap-md" style={{ alignItems: "center" }}>
                    <Loader2
                      aria-hidden
                      size={22}
                      style={{
                        animation: "spin 0.8s linear infinite",
                        color: "var(--color-text-muted)",
                      }}
                    />
                    <p style={{ color: "var(--color-text-muted)", lineHeight: 1.45, margin: 0 }}>Sending payouts…</p>
                  </div>
                ) : null}

                {modalPhase === "success" ? (
                  <>
                    <div className="d-flex d-flex--gap-sm" style={{ alignItems: "flex-start" }}>
                      <Check
                        aria-hidden
                        size={22}
                        strokeWidth={2.25}
                        style={{ flexShrink: 0, color: "var(--color-success, #16a34a)", marginTop: 2 }}
                      />
                      <div style={{ minWidth: 0 }}>
                        <p style={{ fontWeight: 600, lineHeight: 1.35, margin: 0 }}>Sent.</p>
                        <p
                          style={{
                            fontSize: 13,
                            lineHeight: 1.4,
                            margin: "6px 0 0",
                            color: "var(--color-text-muted)",
                          }}
                        >
                          {formatCurrency(reviewTotal, currency as "USDC" | "USDT")} · 2 paid
                        </p>
                      </div>
                    </div>
                    <div className="d-flex d-flex--end">
                      <DButton type="button" variant="primary">
                        Close
                      </DButton>
                    </div>
                  </>
                ) : null}
              </div>
            </DModal>
          </div>
        </div>
      </div>
    </div>
  );
}
