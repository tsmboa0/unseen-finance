"use client";

import { useCallback, useMemo, useState } from "react";
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
import type { PayrollRun } from "@/lib/dashboard-types";
import { useDashboardOverview } from "@/hooks/use-dashboard-overview";
import { useUmbraPrivateActions } from "@/hooks/use-umbra-private-actions";
import { useMerchantApi } from "@/hooks/use-merchant-api";
import { usePrivy, useSigners, type WalletWithMetadata } from "@privy-io/react-auth";
import { formatCurrency, formatDate } from "@/components/dashboard/formatters";
import { Users, Upload, Play, Check, Coins, ListOrdered, ShieldOff, Loader2 } from "lucide-react";
import {
  parsePayrollCsv,
  isValidSolanaAddress,
  type PayrollRecipientInput,
} from "@/lib/payroll-recipients";

const CATEGORY_OPTIONS = [
  { value: "Employees", label: "Employees" },
  { value: "Contractors", label: "Contractors" },
  { value: "Advisors", label: "Advisors" },
  { value: "Partners", label: "Partners" },
];

const CURRENCY_OPTIONS = [
  { value: "USDC", label: "USDC" },
  { value: "USDT", label: "USDT" },
];

const WIZARD_STEPS = ["Details", "Recipients", "Review & run"];

/** Pause between each Umbra deposit (sequential txs). */
const PAYROLL_INTER_TX_MS = 600;
/** After this many successful submissions, wait longer (RPC / rate limits). */
const PAYROLL_BATCH_SIZE = 5;
const PAYROLL_BATCH_COOLDOWN_MS = 2500;

const STATUS_COLOR: Record<PayrollRun["status"], "warning" | "violet" | "success" | "error" | "muted"> = {
  draft: "muted",
  awaiting_delegation: "violet",
  processing: "warning",
  completed: "success",
  partial: "warning",
  failed: "error",
};

const STATUS_LABEL: Record<PayrollRun["status"], string> = {
  draft: "Draft",
  awaiting_delegation: "Awaiting approval",
  processing: "Processing",
  completed: "Completed",
  partial: "Partial",
  failed: "Failed",
};

const PAYROLL_DELEGATION_ENABLED = process.env.NEXT_PUBLIC_PAYROLL_DELEGATION === "1";

type DelegatedRunPhase = "idle" | "preparing" | "delegation" | "signing" | "executing" | "success" | "error";

const PAYROLL_LOG = "[Unseen Payroll]";

function payrollTrace(...args: unknown[]) {
  console.log(PAYROLL_LOG, ...args);
}

function payrollTraceError(...args: unknown[]) {
  console.error(PAYROLL_LOG, ...args);
}

/** High-visibility payroll line (not hidden inside collapsed groups the same way in all browsers). */
function payrollTraceHighlight(level: "info" | "warn", message: string, detail?: Record<string, unknown>) {
  const fn = level === "warn" ? console.warn : console.info;
  fn(`${PAYROLL_LOG} ${message}`, detail ?? "");
}

function extractErrorMessage(e: unknown): string {
  if (e instanceof Error) return e.message;
  if (e && typeof e === "object" && "message" in e) return String((e as { message: unknown }).message);
  return String(e);
}

function isPrivyDuplicateSignerError(e: unknown): boolean {
  const msg = extractErrorMessage(e);
  if (/duplicate signer/i.test(msg)) return true;
  try {
    if (/duplicate signer/i.test(JSON.stringify(e))) return true;
  } catch {
    /* ignore */
  }
  return false;
}

type LocalRecipient = { id: string; address: string; amount: string };

function newRecipientRow(): LocalRecipient {
  return { id: crypto.randomUUID(), address: "", amount: "" };
}

const runColumns = [
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
  const { user, getAccessToken } = usePrivy();
  const { addSigners, removeSigners } = useSigners();
  const { merchant, refreshMerchant } = useMerchantApi();
  const { depositPublicToRecipientEta, canUseUmbraActions } = useUmbraPrivateActions();

  const payrollRuns = data?.overview.payrollRuns ?? [];

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [category, setCategory] = useState("");
  const [memo, setMemo] = useState("");
  const [currency, setCurrency] = useState("USDC");
  const [recipients, setRecipients] = useState<LocalRecipient[]>([]);
  const [csvError, setCsvError] = useState<string | null>(null);
  const [runError, setRunError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [removeSignerBusy, setRemoveSignerBusy] = useState(false);
  const [delegatedModalOpen, setDelegatedModalOpen] = useState(false);
  const [delegatedPhase, setDelegatedPhase] = useState<DelegatedRunPhase>("idle");
  const [delegatedRunId, setDelegatedRunId] = useState<string | null>(null);
  const [delegatedError, setDelegatedError] = useState<string | null>(null);
  const [delegatedSignerHint, setDelegatedSignerHint] = useState<string | null>(null);
  const [delegatedSuccessSummary, setDelegatedSuccessSummary] = useState<{
    successCount: number;
    totalAmount: number;
    failedCount: number;
    status: string;
  } | null>(null);

  const delegatedModalBusy =
    delegatedPhase === "preparing" || delegatedPhase === "signing" || delegatedPhase === "executing";

  const payrollWalletDelegated = useMemo(() => {
    const w = merchant?.walletAddress?.trim();
    if (!w || !user?.linkedAccounts) return false;
    return user.linkedAccounts.some(
      (a): a is WalletWithMetadata =>
        a.type === "wallet" &&
        a.delegated === true &&
        "chainType" in a &&
        a.chainType === "solana" &&
        "address" in a &&
        typeof a.address === "string" &&
        a.address === w,
    );
  }, [user, merchant?.walletAddress]);

  const totalDisbursed = useMemo(
    () =>
      payrollRuns
        .filter((r) => r.status === "completed" || r.status === "partial")
        .reduce((s, r) => s + r.total, 0),
    [payrollRuns],
  );

  const totalRuns = payrollRuns.length;
  const lastTotalRecipients = payrollRuns[0]?.recipientCount ?? 0;

  const openDrawer = useCallback(() => {
    setStep(0);
    setCategory("");
    setMemo("");
    setCurrency("USDC");
    setRecipients([]);
    setCsvError(null);
    setRunError(null);
    setRunning(false);
    setProgress(null);
    setDelegatedModalOpen(false);
    setDelegatedPhase("idle");
    setDelegatedRunId(null);
    setDelegatedError(null);
    setDelegatedSignerHint(null);
    setDelegatedSuccessSummary(null);
    setDrawerOpen(true);
  }, []);

  const mergeCsvRows = useCallback((rows: PayrollRecipientInput[]) => {
    setRecipients((prev) => {
      const base = [...prev];
      for (const r of rows) {
        base.push({ id: crypto.randomUUID(), address: r.address.trim(), amount: r.amount.trim() });
      }
      return base;
    });
  }, []);

  const onCsvSelected = useCallback(
    (file: File | null) => {
      setCsvError(null);
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        const text = typeof reader.result === "string" ? reader.result : "";
        const { rows, errors } = parsePayrollCsv(text);
        if (errors.length) setCsvError(errors.slice(0, 5).join(" · "));
        if (rows.length) mergeCsvRows(rows);
      };
      reader.readAsText(file);
    },
    [mergeCsvRows],
  );

  const addEmptyRow = useCallback(() => {
    setRecipients((r) => [...r, newRecipientRow()]);
  }, []);

  const removeRow = useCallback((id: string) => {
    setRecipients((r) => r.filter((x) => x.id !== id));
  }, []);

  const updateRow = useCallback((id: string, patch: Partial<Pick<LocalRecipient, "address" | "amount">>) => {
    setRecipients((r) => r.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  }, []);

  const reviewTotal = useMemo(() => {
    let sum = 0;
    for (const r of recipients) {
      const n = Number(r.amount);
      if (Number.isFinite(n) && n > 0) sum += n;
    }
    return sum;
  }, [recipients]);

  const validateRecipients = useCallback((): string | null => {
    if (recipients.length === 0) return "Add at least one recipient.";
    for (let i = 0; i < recipients.length; i++) {
      const r = recipients[i];
      if (!isValidSolanaAddress(r.address)) return `Row ${i + 1}: invalid Solana address.`;
      const n = Number(r.amount);
      if (!Number.isFinite(n) || n <= 0) return `Row ${i + 1}: enter a positive amount.`;
    }
    return null;
  }, [recipients]);

  const saveRunToApi = useCallback(
    async (
      items: { destinationAddress: string; amount: number; status: string; txHash?: string | null; error?: string | null }[],
    ): Promise<{ ok: boolean; error?: string }> => {
      const token = await getAccessToken();
      if (!token) return { ok: false, error: "Not signed in" };
      const res = await fetch("/api/dashboard/payroll/runs", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          memo: memo.trim() || "Payroll",
          currency,
          category: category || undefined,
          items: items.map((i) => ({
            destinationAddress: i.destinationAddress,
            amount: i.amount,
            status: i.status,
            txHash: i.txHash ?? undefined,
            error: i.error ?? undefined,
          })),
        }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        return { ok: false, error: j.error ?? `Save failed (${res.status})` };
      }
      window.dispatchEvent(new Event("dashboard:refresh"));
      return { ok: true };
    },
    [getAccessToken, memo, currency, category],
  );

  const logPayrollEvent = useCallback(
    async (
      token: string,
      counterparty: string,
      amount: number,
      txHash: string | null,
      lineMemo: string,
    ) => {
      await fetch("/api/dashboard/events", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          category: "payroll",
          direction: "out",
          status: "completed",
          amount,
          currency,
          counterparty,
          memo: lineMemo,
          txHash: txHash ?? undefined,
        }),
      });
    },
    [currency],
  );

  const addSignersAndRecordConsent = useCallback(
    async (token: string): Promise<{ duplicateSkipped: boolean }> => {
      const quorumId = process.env.NEXT_PUBLIC_PRIVY_PAYROLL_SIGNER_QUORUM_ID?.trim();
      if (!quorumId) {
        throw new Error(
          "NEXT_PUBLIC_PRIVY_PAYROLL_SIGNER_QUORUM_ID is not set. Register your app authorization key quorum in the Privy dashboard.",
        );
      }
      const wallet = merchant?.walletAddress?.trim();
      if (!wallet) throw new Error("Merchant wallet address missing.");

      let duplicateSkipped = false;

      payrollTrace("addSigners → calling Privy (session signer, no policy)", {
        walletAddress: wallet,
        signerQuorumIdPrefix: quorumId.slice(0, 8),
      });
      payrollTraceHighlight("info", "addSigners ATTEMPT", {
        walletAddress: wallet,
        signerQuorumIdPrefix: quorumId.slice(0, 8),
      });
      try {
        await addSigners({
          address: wallet,
          signers: [{ signerId: quorumId }],
        });
        payrollTrace("addSigners ← ok");
        payrollTraceHighlight("info", "addSigners OUTCOME: success (Privy completed addSigners)", {
          walletAddress: wallet,
          signerQuorumIdPrefix: quorumId.slice(0, 8),
        });
      } catch (e) {
        if (!isPrivyDuplicateSignerError(e)) throw e;
        duplicateSkipped = true;
        payrollTrace("addSigners ← skipped (session signer already on wallet)", {
          signerQuorumIdPrefix: quorumId.slice(0, 8),
        });
        payrollTraceHighlight("warn", "addSigners OUTCOME: duplicate_signer — skipping re-attach, no new Privy prompt", {
          walletAddress: wallet,
          signerQuorumIdPrefix: quorumId.slice(0, 8),
          privyErrorMessage: extractErrorMessage(e),
        });
      }

      payrollTraceHighlight("info", "signer-consent → POST /api/dashboard/payroll/signer-consent", {});

      const r = await fetch("/api/dashboard/payroll/signer-consent", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const body = (await r.json().catch(() => ({}))) as { error?: string };
      if (!r.ok) {
        throw new Error(body.error ?? `Signer consent failed (${r.status})`);
      }
      await refreshMerchant();
      return { duplicateSkipped };
    },
    [addSigners, merchant?.walletAddress, refreshMerchant],
  );

  const removePayrollSessionSigners = useCallback(async () => {
    const addr = merchant?.walletAddress?.trim();
    if (!addr) {
      setRunError("Merchant wallet address missing.");
      return;
    }
    setRemoveSignerBusy(true);
    setRunError(null);
    try {
      payrollTrace("removeSigners → Privy (all session signers for wallet)", {
        addressPrefix: `${addr.slice(0, 4)}…`,
      });
      await removeSigners({ address: addr });
      payrollTrace("removeSigners ← ok");
      await refreshMerchant();
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to remove session signers";
      payrollTraceError("removeSigners failed", e);
      setRunError(message);
    } finally {
      setRemoveSignerBusy(false);
    }
  }, [merchant?.walletAddress, removeSigners, refreshMerchant]);

  const resetDelegatedRunModal = useCallback(() => {
    setDelegatedModalOpen(false);
    setDelegatedPhase("idle");
    setDelegatedRunId(null);
    setDelegatedError(null);
    setDelegatedSignerHint(null);
    setDelegatedSuccessSummary(null);
  }, []);

  const startDelegatedPayrollRun = useCallback(async () => {
    const err = validateRecipients();
    if (err) {
      payrollTraceError("Delegated flow aborted (validation)", err);
      setRunError(err);
      return;
    }
    if (!canUseUmbraActions) {
      const msg = "Register with Umbra and connect your wallet before running payroll.";
      payrollTraceError("Delegated flow aborted", msg);
      setRunError(msg);
      return;
    }
    if (!merchant?.walletAddress) {
      const msg = "Merchant wallet address missing.";
      payrollTraceError("Delegated flow aborted", msg);
      setRunError(msg);
      return;
    }

    setRunError(null);
    setDelegatedSuccessSummary(null);
    setDelegatedSignerHint(null);
    setDelegatedError(null);
    setDelegatedRunId(null);
    setDelegatedModalOpen(true);
    setDelegatedPhase("preparing");

    console.groupCollapsed(`${PAYROLL_LOG} Delegated prepare`);
    try {
      const quorumConfigured = Boolean(process.env.NEXT_PUBLIC_PRIVY_PAYROLL_SIGNER_QUORUM_ID?.trim());
      if (!quorumConfigured) {
        throw new Error(
          "Payroll server signing is not configured: set NEXT_PUBLIC_PRIVY_PAYROLL_SIGNER_QUORUM_ID and PRIVY_APP_AUTHORIZATION_PRIVATE_KEY (see npm run privy:gen-payroll-auth-key).",
        );
      }

      const token = await getAccessToken();
      if (!token) throw new Error("Not signed in");

      const itemsPayload = recipients.map((r) => ({
        destinationAddress: r.address.trim(),
        amount: Number(r.amount.trim()),
      }));

      payrollTrace("POST /api/dashboard/payroll/runs/prepare", {
        memo: memo.trim() || "Payroll",
        currency,
        category: category || null,
        recipientCount: itemsPayload.length,
      });

      const prep = await fetch("/api/dashboard/payroll/runs/prepare", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          memo: memo.trim() || "Payroll",
          currency,
          category: category || undefined,
          items: itemsPayload,
        }),
      });
      const prepBody = (await prep.json().catch(() => ({}))) as {
        id?: string;
        status?: string;
        recipientCount?: number;
        error?: string;
      };
      if (!prep.ok) {
        payrollTraceError("prepare ← HTTP error", { status: prep.status, body: prepBody });
        throw new Error(prepBody.error ?? `Prepare failed (${prep.status})`);
      }
      const runId = prepBody.id;
      if (!runId) {
        payrollTraceError("prepare ← missing id in response", prepBody);
        throw new Error("Prepare succeeded but no run id returned");
      }
      payrollTrace("prepare ← ok", prepBody);
      setDelegatedRunId(runId);
      setDelegatedPhase("delegation");
    } catch (e) {
      const message = e instanceof Error ? e.message : "Could not create payroll run.";
      payrollTraceError("Delegated prepare failed", e);
      setRunError(message);
      setDelegatedError(message);
      setDelegatedPhase("error");
    } finally {
      console.groupEnd();
    }
  }, [
    validateRecipients,
    canUseUmbraActions,
    merchant?.walletAddress,
    getAccessToken,
    recipients,
    memo,
    currency,
    category,
  ]);

  const continueDelegatedPayrollRun = useCallback(async () => {
    if (delegatedPhase !== "delegation") return;
    const runId = delegatedRunId;
    if (!runId) return;

    setDelegatedPhase("signing");
    setDelegatedSignerHint(null);
    setDelegatedError(null);
    console.groupCollapsed(`${PAYROLL_LOG} Delegated authorize + execute`);
    try {
      const token = await getAccessToken();
      if (!token) throw new Error("Not signed in");
      const authHeaders = { Authorization: `Bearer ${token}` } as const;

      const { duplicateSkipped } = await addSignersAndRecordConsent(token);
      setDelegatedSignerHint(duplicateSkipped ? "Already authorized." : null);

      setDelegatedPhase("executing");
      payrollTrace("execute → POST", `/api/dashboard/payroll/runs/${runId}/execute`);
      const exec = await fetch(`/api/dashboard/payroll/runs/${runId}/execute`, {
        method: "POST",
        headers: authHeaders,
      });
      const execBody = (await exec.json().catch(() => ({}))) as {
        id?: string;
        status?: string;
        successCount?: number;
        totalAmount?: number;
        failedCount?: number;
        error?: string;
      };
      if (!exec.ok) {
        payrollTraceError("execute ← HTTP error", { status: exec.status, body: execBody });
        throw new Error(execBody.error ?? `Execute failed (${exec.status})`);
      }
      payrollTrace("execute ← ok", execBody);
      payrollTrace("Delegated payroll finished successfully");

      setDelegatedSuccessSummary({
        successCount: execBody.successCount ?? recipients.length,
        totalAmount: execBody.totalAmount ?? reviewTotal,
        failedCount: execBody.failedCount ?? 0,
        status: execBody.status ?? "completed",
      });
      setDelegatedPhase("success");
      window.dispatchEvent(new Event("dashboard:refresh"));
    } catch (e) {
      const message = e instanceof Error ? e.message : "Payroll run failed";
      payrollTraceError("Delegated authorize/execute failed", e);
      setRunError(message);
      setDelegatedError(message);
      setDelegatedPhase("error");
    } finally {
      console.groupEnd();
    }
  }, [
    delegatedPhase,
    delegatedRunId,
    getAccessToken,
    addSignersAndRecordConsent,
    recipients.length,
    reviewTotal,
  ]);

  const finishDelegatedRunSuccess = useCallback(() => {
    resetDelegatedRunModal();
    setRunError(null);
    setStep(0);
    setRecipients([]);
    setDrawerOpen(false);
  }, [resetDelegatedRunModal]);

  const onDelegatedModalClose = useCallback(() => {
    if (
      delegatedPhase === "preparing" ||
      delegatedPhase === "signing" ||
      delegatedPhase === "executing"
    ) {
      return;
    }
    if (delegatedPhase === "success") {
      finishDelegatedRunSuccess();
      return;
    }
    resetDelegatedRunModal();
  }, [delegatedPhase, finishDelegatedRunSuccess, resetDelegatedRunModal]);

  const delegatedModalTitle = useMemo(() => {
    switch (delegatedPhase) {
      case "preparing":
      case "delegation":
      case "error":
        return "Run payroll";
      case "signing":
        return "Authorize";
      case "executing":
        return "Sending";
      case "success":
        return "Sent";
      default:
        return "Run payroll";
    }
  }, [delegatedPhase]);

  const executePayroll = useCallback(async () => {
    const err = validateRecipients();
    if (err) {
      payrollTraceError("Browser-signing flow aborted (validation)", err);
      setRunError(err);
      return;
    }
    if (!canUseUmbraActions) {
      const msg = "Register with Umbra and connect your wallet before running payroll.";
      payrollTraceError("Browser-signing flow aborted", msg);
      setRunError(msg);
      return;
    }

    setRunError(null);
    setRunning(true);
    const token = await getAccessToken();
    const list = [...recipients];
    console.groupCollapsed(`${PAYROLL_LOG} Browser-signing payroll (per-recipient Umbra txs)`);
    payrollTrace("Starting", {
      recipientCount: list.length,
      currency,
      memo: memo.trim() || "Payroll",
    });
    const results: {
      destinationAddress: string;
      amount: number;
      status: string;
      txHash?: string | null;
      error?: string | null;
    }[] = [];
    setProgress({ done: 0, total: list.length });

    let completedInBatch = 0;
    try {
      for (let i = 0; i < list.length; i++) {
        const row = list[i];
        const amtStr = row.amount.trim();
        const n = Number(amtStr);
        payrollTrace(`Recipient ${i + 1}/${list.length} → depositPublicToRecipientEta`, {
          destination: row.address.trim(),
          amount: amtStr,
        });
        try {
          const { txSignature } = await depositPublicToRecipientEta(
            row.address.trim(),
            currency as "USDC" | "USDT",
            amtStr,
          );
          payrollTrace(`Recipient ${i + 1}/${list.length} ← ok`, { txSignature });
          results.push({
            destinationAddress: row.address.trim(),
            amount: n,
            status: "completed",
            txHash: txSignature,
          });
          if (token) {
            await logPayrollEvent(token, row.address.trim(), n, txSignature, `Payroll: ${memo || "Payroll"}`);
          }
          completedInBatch += 1;
        } catch (e) {
          const msg = e instanceof Error ? e.message : "Deposit failed";
          payrollTraceError(`Recipient ${i + 1}/${list.length} failed`, { error: msg });
          results.push({
            destinationAddress: row.address.trim(),
            amount: n,
            status: "failed",
            error: msg,
          });
        }

        setProgress({ done: i + 1, total: list.length });

        if (i < list.length - 1) {
          await new Promise((r) => setTimeout(r, PAYROLL_INTER_TX_MS));
          if (completedInBatch >= PAYROLL_BATCH_SIZE) {
            completedInBatch = 0;
            payrollTrace(`Batch cooldown ${PAYROLL_BATCH_COOLDOWN_MS}ms after ${PAYROLL_BATCH_SIZE} successes`);
            await new Promise((r) => setTimeout(r, PAYROLL_BATCH_COOLDOWN_MS));
          }
        }
      }

      const successCount = results.filter((r) => r.status === "completed").length;
      payrollTrace("All recipients processed", {
        completed: successCount,
        failed: results.length - successCount,
        results,
      });

      payrollTrace("Saving run → POST /api/dashboard/payroll/runs");
      const saved = await saveRunToApi(results);
      if (!saved.ok) {
        payrollTraceError("Save run failed", saved.error);
        setRunError(saved.error ?? "Failed to save payroll run");
        return;
      }
      payrollTrace("Save run ← ok");
      setStep(0);
      setRecipients([]);
      setDrawerOpen(false);
    } finally {
      console.groupEnd();
      setRunning(false);
      setProgress(null);
    }
  }, [
    validateRecipients,
    canUseUmbraActions,
    getAccessToken,
    recipients,
    depositPublicToRecipientEta,
    currency,
    memo,
    logPayrollEvent,
    saveRunToApi,
  ]);

  if (loading && !data) {
    return (
      <div className="d-card" style={{ minHeight: 220, display: "grid", placeItems: "center" }}>
        <div
          style={{
            width: 28,
            height: 28,
            border: "3px solid rgba(123,47,255,0.2)",
            borderTopColor: "#7b2fff",
            borderRadius: "50%",
            animation: "spin 0.8s linear infinite",
          }}
        />
      </div>
    );
  }

  return (
    <>
      <DPageHeader
        title="Payroll"
        description="Pay from your public token balance into each employee's encrypted (shielded) balance, using Umbra public → ETA deposit."
        actions={
          <div className="d-flex d-flex--gap-sm">
            {PAYROLL_DELEGATION_ENABLED ? (
              <span
                title={
                  payrollWalletDelegated
                    ? "Remove all session signers on your Solana embedded wallet (Privy may prompt)."
                    : "No delegated Solana wallet detected on this session; use if you still need to clear signers."
                }
              >
                <DButton
                  variant="danger"
                  icon={ShieldOff}
                  loading={removeSignerBusy}
                  disabled={
                    removeSignerBusy ||
                    !merchant?.walletAddress?.trim() ||
                    !Boolean(process.env.NEXT_PUBLIC_PRIVY_PAYROLL_SIGNER_QUORUM_ID?.trim())
                  }
                  onClick={() => void removePayrollSessionSigners()}
                >
                  Remove session signer
                </DButton>
              </span>
            ) : null}
            <DButton variant="primary" icon={Play} onClick={openDrawer}>
              Run payroll
            </DButton>
          </div>
        }
      />

      <div className="d-grid d-grid--3">
        <DStatCard
          label="Total sent (all tokens, display units)"
          value={formatCurrency(totalDisbursed, "USD", { compact: true })}
          icon={Check}
        />
        <DStatCard label="Payroll runs" value={String(totalRuns)} icon={ListOrdered} />
        <DStatCard
          label="Recipients (last run)"
          value={lastTotalRecipients ? lastTotalRecipients.toLocaleString() : "—"}
          icon={Users}
        />
      </div>

      <section className="d-section">
        <h2 className="d-section__title">History</h2>
        {loading ? (
          <div className="d-card" style={{ minHeight: 140, display: "grid", placeItems: "center" }}>
            <div
              style={{
                width: 24,
                height: 24,
                border: "3px solid rgba(123,47,255,0.2)",
                borderTopColor: "#7b2fff",
                borderRadius: "50%",
                animation: "spin 0.8s linear infinite",
              }}
            />
          </div>
        ) : (
          <DTable columns={runColumns} data={payrollRuns} emptyTitle="No payroll runs yet" />
        )}
      </section>

      <DDrawer
        open={drawerOpen}
        onClose={() => !running && !delegatedModalBusy && !delegatedModalOpen && setDrawerOpen(false)}
        title="Run payroll"
      >
        <DStepper steps={WIZARD_STEPS} current={step} />

        <div style={{ marginTop: 24 }}>
          {runError && (
            <div
              className="d-card"
              style={{
                marginBottom: 16,
                padding: 12,
                borderColor: "rgba(220,38,38,0.35)",
                background: "rgba(220,38,38,0.06)",
                fontSize: 14,
                color: "#b91c1c",
              }}
            >
              {runError}
            </div>
          )}

          {step === 0 && (
            <div className="d-stack d-stack--md">
              <DSelect label="Category" value={category} onChange={setCategory} options={CATEGORY_OPTIONS} placeholder="Select category…" />
              <DInput label="Memo" value={memo} onChange={setMemo} placeholder="e.g. May 2026 payroll" />
              <DSelect label="Token" value={currency} onChange={setCurrency} options={CURRENCY_OPTIONS} />
              <p style={{ fontSize: 13, color: "var(--color-text-muted)", margin: 0, lineHeight: 1.5 }}>
                Each payout uses your <strong>public</strong> {currency} balance and credits the recipient&apos;s{" "}
                <strong>encrypted</strong> balance. Employees should already use Umbra on the same network.
              </p>
              <div className="d-flex d-flex--end">
                <DButton variant="primary" disabled={!category} onClick={() => setStep(1)}>
                  Next
                </DButton>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="d-stack d-stack--md">
              <div className="d-flex d-flex--between d-flex--align-center">
                <span className="d-field__label" style={{ margin: 0 }}>
                  Recipients
                </span>
                <div className="d-flex d-flex--gap-sm">
                  <DButton variant="ghost" size="sm" icon={Upload} onClick={() => document.getElementById("payroll-csv")?.click()}>
                    Upload CSV
                  </DButton>
                  <input
                    id="payroll-csv"
                    type="file"
                    accept=".csv,text/csv"
                    style={{ display: "none" }}
                    onChange={(e) => onCsvSelected(e.target.files?.[0] ?? null)}
                  />
                  <DButton variant="secondary" size="sm" onClick={addEmptyRow}>
                    Add row
                  </DButton>
                </div>
              </div>
              {csvError && <p style={{ color: "#b91c1c", fontSize: 13, margin: 0 }}>{csvError}</p>}
              <p style={{ fontSize: 12, color: "var(--color-text-muted)", margin: 0 }}>
                CSV format: one row per line, <code>wallet,amount</code>. Optional header row (wallet, amount).
              </p>

              <div className="d-stack d-stack--sm">
                {recipients.length === 0 ? (
                  <p style={{ color: "var(--color-text-muted)", fontSize: 14 }}>Add rows manually or upload a CSV.</p>
                ) : (
                  recipients.map((row, idx) => (
                    <div key={row.id} className="d-flex d-flex--gap-sm" style={{ alignItems: "flex-end", flexWrap: "wrap" }}>
                      <div style={{ flex: "1 1 200px" }}>
                        <DInput
                          label={idx === 0 ? "Wallet address" : "\u00a0"}
                          value={row.address}
                          onChange={(v) => updateRow(row.id, { address: v })}
                          placeholder="Solana address"
                        />
                      </div>
                      <div style={{ flex: "0 1 120px" }}>
                        <DInput
                          label={idx === 0 ? "Amount" : "\u00a0"}
                          value={row.amount}
                          onChange={(v) => updateRow(row.id, { amount: v })}
                          placeholder="0.00"
                          type="text"
                        />
                      </div>
                      <DButton variant="ghost" size="sm" onClick={() => removeRow(row.id)} disabled={running}>
                        Remove
                      </DButton>
                    </div>
                  ))
                )}
              </div>

              <div className="d-flex d-flex--between">
                <DButton variant="ghost" onClick={() => setStep(0)} disabled={running}>
                  Back
                </DButton>
                <DButton
                  variant="primary"
                  disabled={recipients.length === 0 || !!validateRecipients()}
                  onClick={() => {
                    const v = validateRecipients();
                    setRunError(v);
                    if (!v) setStep(2);
                  }}
                >
                  Next
                </DButton>
              </div>
            </div>
          )}

          {step === 2 && (
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

              {progress && (
                <p style={{ fontSize: 14, margin: 0 }}>
                  Processing {progress.done} / {progress.total}…
                </p>
              )}

              <div className="d-flex d-flex--between">
                <DButton variant="ghost" onClick={() => setStep(1)} disabled={running}>
                  Back
                </DButton>
                {PAYROLL_DELEGATION_ENABLED ? (
                  <DButton
                    variant="primary"
                    icon={Coins}
                    loading={running || delegatedModalBusy}
                    disabled={delegatedModalOpen}
                    onClick={() => {
                      const v = validateRecipients();
                      setRunError(v);
                      if (!v) {
                        payrollTrace("Delegated run modal (prepare first)", {
                          recipients: recipients.length,
                          reviewTotal,
                          currency,
                          memo: memo.trim() || "Payroll",
                          category: category || null,
                        });
                        void startDelegatedPayrollRun();
                      }
                    }}
                  >
                    Run payroll…
                  </DButton>
                ) : (
                  <DButton variant="primary" icon={Coins} loading={running} onClick={() => void executePayroll()}>
                    Deposit to shielded balances
                  </DButton>
                )}
              </div>
            </div>
          )}
        </div>
      </DDrawer>

      <DModal open={delegatedModalOpen} onClose={onDelegatedModalClose} title={delegatedModalTitle}>
        <div className="d-stack d-stack--md" style={{ fontSize: 14 }}>
          {delegatedPhase === "preparing" ? (
            <div className="d-flex d-flex--gap-md" style={{ alignItems: "center" }}>
              <Loader2
                size={22}
                aria-hidden
                style={{
                  color: "var(--color-text-muted)",
                  animation: "spin 0.8s linear infinite",
                }}
              />
              <p style={{ margin: 0, color: "var(--color-text-muted)", lineHeight: 1.45 }}>Creating run…</p>
            </div>
          ) : null}

          {delegatedPhase === "delegation" ? (
            <>
              <p style={{ margin: 0, color: "var(--color-text-muted)", lineHeight: 1.45 }}>
                Approve server signing in Privy.
              </p>
              <div className="d-flex d-flex--end d-flex--gap-sm">
                <DButton variant="ghost" onClick={onDelegatedModalClose}>
                  Cancel
                </DButton>
                <DButton variant="primary" onClick={() => void continueDelegatedPayrollRun()}>
                  Continue
                </DButton>
              </div>
            </>
          ) : null}

          {delegatedPhase === "signing" ? (
            <div className="d-stack d-stack--sm">
              <div className="d-flex d-flex--gap-md" style={{ alignItems: "center" }}>
                <Loader2
                  size={22}
                  aria-hidden
                  style={{
                    color: "var(--color-text-muted)",
                    animation: "spin 0.8s linear infinite",
                  }}
                />
                <p style={{ margin: 0, color: "var(--color-text-muted)", lineHeight: 1.45 }}>Authorizing…</p>
              </div>
              <p style={{ margin: 0, fontSize: 13, color: "var(--color-text-muted)", opacity: 0.9, lineHeight: 1.4 }}>
                Approve in Privy if asked.
              </p>
            </div>
          ) : null}

          {delegatedPhase === "executing" ? (
            <div className="d-stack d-stack--sm">
              {delegatedSignerHint ? (
                <p style={{ margin: 0, fontSize: 13, color: "var(--color-text-muted)", lineHeight: 1.4 }}>
                  {delegatedSignerHint}
                </p>
              ) : null}
              <div className="d-flex d-flex--gap-md" style={{ alignItems: "center" }}>
                <Loader2
                  size={22}
                  aria-hidden
                  style={{
                    color: "var(--color-text-muted)",
                    animation: "spin 0.8s linear infinite",
                  }}
                />
                <p style={{ margin: 0, color: "var(--color-text-muted)", lineHeight: 1.45 }}>Sending payouts…</p>
              </div>
            </div>
          ) : null}

          {delegatedPhase === "success" ? (
            <>
              <div className="d-flex d-flex--gap-sm" style={{ alignItems: "flex-start" }}>
                <Check
                  size={22}
                  aria-hidden
                  strokeWidth={2.25}
                  style={{ color: "var(--color-success, #16a34a)", flexShrink: 0, marginTop: 2 }}
                />
                <div style={{ minWidth: 0 }}>
                  <p style={{ margin: 0, fontWeight: 600, lineHeight: 1.35 }}>Sent.</p>
                  {delegatedSuccessSummary ? (
                    <p style={{ margin: "6px 0 0", fontSize: 13, color: "var(--color-text-muted)", lineHeight: 1.4 }}>
                      {formatCurrency(delegatedSuccessSummary.totalAmount, currency as "USDC" | "USDT")} ·{" "}
                      {delegatedSuccessSummary.successCount} paid
                      {delegatedSuccessSummary.failedCount > 0
                        ? ` · ${delegatedSuccessSummary.failedCount} failed`
                        : ""}
                    </p>
                  ) : null}
                </div>
              </div>
              <div className="d-flex d-flex--end">
                <DButton variant="primary" onClick={finishDelegatedRunSuccess}>
                  Close
                </DButton>
              </div>
            </>
          ) : null}

          {delegatedPhase === "error" && delegatedError ? (
            <>
              <p style={{ margin: 0, color: "#b91c1c", lineHeight: 1.45 }}>{delegatedError}</p>
              <div className="d-flex d-flex--end">
                <DButton variant="primary" onClick={resetDelegatedRunModal}>
                  Close
                </DButton>
              </div>
            </>
          ) : null}
        </div>
      </DModal>
    </>
  );
}
