"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
} from "@/components/dashboard/primitives";
import { type ComplianceReport, type ScopedViewingKey, type ScopedViewingKeyScope, type ViewingKey } from "@/lib/dashboard-types";
import { DASHBOARD_STABLE_MINTS } from "@/lib/payroll/constants";
import { useDashboardOverview } from "@/hooks/use-dashboard-overview";
import { useUmbraPrivateActions } from "@/hooks/use-umbra-private-actions";
import { useMerchantApi } from "@/hooks/use-merchant-api";
import { formatDate } from "@/components/dashboard/formatters";
import {
  ShieldCheck,
  FileDown,
  Key,
  Plus,
  Download,
  Eye,
  RefreshCw,
  Ban,
  Hash,
} from "lucide-react";
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

const SCOPE_OPTIONS: { value: ScopedViewingKeyScope; label: string }[] = [
  { value: "mint", label: "Mint-wide" },
  { value: "yearly", label: "Year (UTC)" },
  { value: "monthly", label: "Month (UTC)" },
  { value: "daily", label: "Day (UTC)" },
  { value: "hourly", label: "Hour (UTC)" },
  { value: "minute", label: "Minute (UTC)" },
  { value: "second", label: "Second (UTC)" },
];

function shortMintAddr(m: string): string {
  const s = m.trim();
  if (s.length <= 12) return s;
  return `${s.slice(0, 4)}…${s.slice(-4)}`;
}

function scopeUtcSummary(k: ScopedViewingKey): string {
  switch (k.scope) {
    case "mint":
      return "—";
    case "yearly":
      return `${k.year ?? "—"}`;
    case "monthly":
      return `${k.year ?? "—"}-${String(k.month ?? "").padStart(2, "0")}`;
    case "daily":
      return `${k.year ?? "—"}-${String(k.month ?? "").padStart(2, "0")}-${String(k.day ?? "").padStart(2, "0")}`;
    case "hourly":
      return `${k.year ?? "—"}-${String(k.month ?? "").padStart(2, "0")}-${String(k.day ?? "").padStart(2, "0")} ${String(k.hour ?? "").padStart(2, "0")}:00`;
    case "minute":
      return `${k.year ?? "—"}-${String(k.month ?? "").padStart(2, "0")}-${String(k.day ?? "").padStart(2, "0")} ${String(k.hour ?? "").padStart(2, "0")}:${String(k.minute ?? "").padStart(2, "0")}`;
    case "second":
      return `${k.year ?? "—"}-${String(k.month ?? "").padStart(2, "0")}-${String(k.day ?? "").padStart(2, "0")} ${String(k.hour ?? "").padStart(2, "0")}:${String(k.minute ?? "").padStart(2, "0")}:${String(k.second ?? "").padStart(2, "0")}`;
    default:
      return "—";
  }
}

export default function CompliancePage() {
  const { data, loading, refresh } = useDashboardOverview();
  const { getAccessToken } = usePrivy();
  const { merchant: merchantProfile } = useMerchantApi();
  const clusterQs = merchantProfile?.network === "mainnet" ? "" : "?cluster=devnet";
  const {
    canUseUmbraActions,
    createComplianceGrantTx,
    revokeComplianceGrantTx,
    queryComplianceGrantOnChain,
    deriveScopedViewingKeyHex,
    actionError,
    setActionError,
  } = useUmbraPrivateActions();

  const complianceReports = data?.overview.complianceReports ?? [];
  const viewingKeys = data?.overview.viewingKeys ?? [];
  const scopedViewingKeys = data?.overview.scopedViewingKeys ?? [];
  const [tab, setTab] = useState("reports");

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [reportTitle, setReportTitle] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [txType, setTxType] = useState("all");
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [recipientEmail, setRecipientEmail] = useState("");
  const [generating, setGenerating] = useState(false);
  const [reportFlowError, setReportFlowError] = useState<string | null>(null);
  const [newReportId, setNewReportId] = useState<string | null>(null);

  const [grantModalOpen, setGrantModalOpen] = useState(false);
  const [grantLabel, setGrantLabel] = useState("");
  const [grantReceiver, setGrantReceiver] = useState("");
  const [grantX25519, setGrantX25519] = useState("");
  const [grantBusy, setGrantBusy] = useState(false);
  const [grantModalError, setGrantModalError] = useState<string | null>(null);

  const [confirmRevoke, setConfirmRevoke] = useState<ViewingKey | null>(null);
  const [revokeBusy, setRevokeBusy] = useState(false);

  const [vkLabel, setVkLabel] = useState("");
  const [vkScope, setVkScope] = useState<ScopedViewingKeyScope>("monthly");
  const [vkMintPreset, setVkMintPreset] = useState<"USDC" | "USDT" | "custom">("USDC");
  const [vkCustomMint, setVkCustomMint] = useState("");
  const [vkYear, setVkYear] = useState("");
  const [vkMonth, setVkMonth] = useState("");
  const [vkDay, setVkDay] = useState("");
  const [vkHour, setVkHour] = useState("");
  const [vkMinute, setVkMinute] = useState("");
  const [vkSecond, setVkSecond] = useState("");
  const [vkBusy, setVkBusy] = useState(false);
  const [vkError, setVkError] = useState<string | null>(null);
  const [vkDrawerOpen, setVkDrawerOpen] = useState(false);

  const stableMints = useMemo(() => {
    const net = merchantProfile?.network === "mainnet" ? "mainnet" : "devnet";
    return DASHBOARD_STABLE_MINTS[net];
  }, [merchantProfile?.network]);

  const resolvedMint = useMemo(() => {
    if (vkMintPreset === "custom") return vkCustomMint.trim();
    return stableMints[vkMintPreset];
  }, [vkCustomMint, vkMintPreset, stableMints]);

  useEffect(() => {
    const d = new Date();
    setVkYear(String(d.getUTCFullYear()));
    setVkMonth(String(d.getUTCMonth() + 1));
    setVkDay(String(d.getUTCDate()));
    setVkHour(String(d.getUTCHours()));
    setVkMinute(String(d.getUTCMinutes()));
    setVkSecond(String(d.getUTCSeconds()));
  }, [vkScope]);

  const downloadCompliancePdf = useCallback(
    async (reportId: string, titleSlug: string) => {
      const token = await getAccessToken();
      if (!token) return;
      const res = await fetch(`/api/dashboard/compliance/reports/${reportId}/pdf`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `compliance-${titleSlug.replace(/[^a-zA-Z0-9-]/g, "_").slice(0, 40)}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    },
    [getAccessToken],
  );

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

  const totalReports = complianceReports.length;
  const readyCount = complianceReports.filter((r) => r.status === "ready").length;
  const expiredCount = complianceReports.filter((r) => r.status === "expired").length;

  const activeGrants = viewingKeys.filter((k) => k.grantStatus === "active").length;
  const revokedGrants = viewingKeys.filter((k) => k.grantStatus === "revoked").length;

  function resetDrawer() {
    setReportTitle("");
    setDateFrom("");
    setDateTo("");
    setTxType("all");
    setSelectedProducts([]);
    setRecipientEmail("");
    setGenerating(false);
    setReportFlowError(null);
    setNewReportId(null);
  }

  function resetViewingKeyDrawer() {
    setVkLabel("");
    setVkScope("monthly");
    setVkMintPreset("USDC");
    setVkCustomMint("");
    setVkError(null);
    setVkBusy(false);
    const d = new Date();
    setVkYear(String(d.getUTCFullYear()));
    setVkMonth(String(d.getUTCMonth() + 1));
    setVkDay(String(d.getUTCDate()));
    setVkHour(String(d.getUTCHours()));
    setVkMinute(String(d.getUTCMinutes()));
    setVkSecond(String(d.getUTCSeconds()));
  }

  async function submitReport() {
    setReportFlowError(null);
    setGenerating(true);
    try {
      const token = await getAccessToken();
      if (!token) {
        setReportFlowError("Sign in to generate a report.");
        return;
      }
      const res = await fetch("/api/dashboard/compliance/reports", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          title: reportTitle || "Compliance disclosure",
          dateFrom,
          dateTo,
          txType,
          products: selectedProducts,
          recipientEmail,
        }),
      });
      const json = (await res.json().catch(() => null)) as { error?: string; report?: { id: string } } | null;
      if (!res.ok) {
        setReportFlowError(json?.error ?? `HTTP ${res.status}`);
        return;
      }
      if (json?.report?.id) setNewReportId(json.report.id);
      try {
        await fetch("/api/dashboard/events", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            category: "compliance",
            direction: "out",
            status: "completed",
            amount: 0,
            currency: "USDC",
            memo: reportTitle || "Compliance disclosure generated",
            counterparty: recipientEmail || "Disclosure package",
          }),
        });
      } catch {
        /* non-blocking */
      }
      await refresh();
      window.dispatchEvent(new Event("dashboard:refresh"));
    } finally {
      setGenerating(false);
    }
  }

  function resetGrantModal() {
    setGrantLabel("");
    setGrantReceiver("");
    setGrantX25519("");
    setGrantBusy(false);
    setGrantModalError(null);
    setActionError(null);
  }

  async function submitGrant() {
    setGrantModalError(null);
    setActionError(null);
    if (!canUseUmbraActions) {
      setGrantModalError("Connect your Umbra-registered merchant wallet in Privy first.");
      return;
    }
    setGrantBusy(true);
    try {
      const { txSignature, nonceDecimal, receiverWallet, receiverX25519Hex } =
        await createComplianceGrantTx({
          receiverAddress: grantReceiver,
          receiverX25519Hex: grantX25519,
        });
      const token = await getAccessToken();
      if (!token) {
        setGrantModalError("Sign in to save grant metadata.");
        return;
      }
      const res = await fetch("/api/dashboard/compliance/grants", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          label: grantLabel || "Auditor grant",
          receiverWallet,
          receiverX25519Hex,
          nonceDecimal,
          createTxSignature: txSignature,
        }),
      });
      const json = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        setGrantModalError(json?.error ?? `HTTP ${res.status}`);
        return;
      }
      try {
        await fetch("/api/dashboard/events", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            category: "compliance",
            direction: "out",
            status: "completed",
            amount: 0,
            currency: "USDC",
            memo: `Umbra compliance grant created (${grantLabel || "grant"})`,
            counterparty: receiverWallet,
            txHash: txSignature,
          }),
        });
      } catch {
        /* non-blocking */
      }
      setGrantModalOpen(false);
      resetGrantModal();
      await refresh();
      window.dispatchEvent(new Event("dashboard:refresh"));
    } catch (e) {
      setGrantModalError(e instanceof Error ? e.message : "Grant transaction failed.");
    } finally {
      setGrantBusy(false);
    }
  }

  async function verifyGrant(k: ViewingKey) {
    if (!k.receiverX25519Hex || !k.nonceDecimal || !canUseUmbraActions) return;
    setActionError(null);
    try {
      const exists = await queryComplianceGrantOnChain({
        receiverX25519Hex: k.receiverX25519Hex,
        nonceDecimal: k.nonceDecimal,
      });
      const token = await getAccessToken();
      if (!token) return;
      await fetch("/api/dashboard/compliance/grants", {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          id: k.id,
          action: "chain_check",
          lastChainCheckExists: exists,
        }),
      });
      await refresh();
      window.dispatchEvent(new Event("dashboard:refresh"));
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Verification failed.");
    }
  }

  async function submitScopedViewingKey() {
    setVkError(null);
    if (!canUseUmbraActions) {
      setVkError("Connect your Umbra-registered merchant wallet first.");
      return;
    }
    const mint = resolvedMint;
    if (!mint) {
      setVkError(vkMintPreset === "custom" ? "Enter a custom mint address." : "Choose a mint.");
      return;
    }
    setVkBusy(true);
    try {
      const year = vkYear.trim() === "" ? undefined : Number(vkYear);
      const month = vkMonth.trim() === "" ? undefined : Number(vkMonth);
      const day = vkDay.trim() === "" ? undefined : Number(vkDay);
      const hour = vkHour.trim() === "" ? undefined : Number(vkHour);
      const minute = vkMinute.trim() === "" ? undefined : Number(vkMinute);
      const second = vkSecond.trim() === "" ? undefined : Number(vkSecond);

      const keyHex = await deriveScopedViewingKeyHex({
        mint,
        scope: vkScope,
        year,
        month,
        day,
        hour,
        minute,
        second,
      });

      const token = await getAccessToken();
      if (!token) {
        setVkError("Sign in to save.");
        return;
      }

      const cal = {
        year: null as number | null,
        month: null as number | null,
        day: null as number | null,
        hour: null as number | null,
        minute: null as number | null,
        second: null as number | null,
      };
      if (vkScope !== "mint") cal.year = year ?? null;
      if (["monthly", "daily", "hourly", "minute", "second"].includes(vkScope)) cal.month = month ?? null;
      if (["daily", "hourly", "minute", "second"].includes(vkScope)) cal.day = day ?? null;
      if (["hourly", "minute", "second"].includes(vkScope)) cal.hour = hour ?? null;
      if (["minute", "second"].includes(vkScope)) cal.minute = minute ?? null;
      if (vkScope === "second") cal.second = second ?? null;

      const res = await fetch("/api/dashboard/compliance/scoped-viewing-keys", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          label: vkLabel.trim() || `${vkScope} viewing key`,
          scope: vkScope,
          mintAddress: mint,
          keyHex,
          ...cal,
        }),
      });
      const json = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        setVkError(json?.error ?? `HTTP ${res.status}`);
        return;
      }
      try {
        await fetch("/api/dashboard/events", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            category: "compliance",
            direction: "out",
            status: "completed",
            amount: 0,
            currency: "USDC",
            memo: `Umbra viewing key derived (${vkScope}, ${shortMintAddr(mint)})`,
            counterparty: mint,
          }),
        });
      } catch {
        /* non-blocking */
      }
      setVkDrawerOpen(false);
      resetViewingKeyDrawer();
      await refresh();
      window.dispatchEvent(new Event("dashboard:refresh"));
    } catch (e) {
      setVkError(e instanceof Error ? e.message : "Viewing key derivation failed.");
    } finally {
      setVkBusy(false);
    }
  }

  async function revokeGrant(k: ViewingKey) {
    if (!k.receiverWallet || !k.receiverX25519Hex || !k.nonceDecimal || !canUseUmbraActions) return;
    setRevokeBusy(true);
    setActionError(null);
    try {
      const { txSignature } = await revokeComplianceGrantTx({
        receiverAddress: k.receiverWallet,
        receiverX25519Hex: k.receiverX25519Hex,
        nonceDecimal: k.nonceDecimal,
      });
      const token = await getAccessToken();
      if (!token) return;
      await fetch("/api/dashboard/compliance/grants", {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          id: k.id,
          action: "revoke",
          revokeTxSignature: txSignature,
        }),
      });
      try {
        await fetch("/api/dashboard/events", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            category: "compliance",
            direction: "out",
            status: "completed",
            amount: 0,
            currency: "USDC",
            memo: `Umbra compliance grant revoked (${k.label})`,
            counterparty: k.receiverWallet,
            txHash: txSignature,
          }),
        });
      } catch {
        /* non-blocking */
      }
      setConfirmRevoke(null);
      await refresh();
      window.dispatchEvent(new Event("dashboard:refresh"));
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Revoke failed.");
    } finally {
      setRevokeBusy(false);
    }
  }

  const reportColumns = [
    {
      key: "title",
      header: "Title",
      render: (r: ComplianceReport) => <span style={{ fontWeight: 500 }}>{r.title}</span>,
    },
    {
      key: "range",
      header: "Date Range",
      hideOnMobile: true,
      render: (r: ComplianceReport) => `${formatDate(r.range.from)} – ${formatDate(r.range.to)}`,
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
          r.status === "ready" ? "success" : r.status === "generating" ? "warning" : "muted";
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
          <DButton
            variant="ghost"
            size="sm"
            icon={Download}
            onClick={() => downloadCompliancePdf(r.id, r.title)}
          >
            Download
          </DButton>
        ) : null,
    },
  ];

  const keyColumns = [
    {
      key: "label",
      header: "Label",
      render: (k: ViewingKey) => <span style={{ fontWeight: 500 }}>{k.label}</span>,
    },
    {
      key: "receiver",
      header: "Receiver",
      hideOnMobile: true,
      render: (k: ViewingKey) => (
        <span style={{ fontFamily: "monospace", fontSize: 12 }}>{k.receiverWallet ?? k.scopeTarget}</span>
      ),
    },
    {
      key: "grantStatus",
      header: "DB status",
      render: (k: ViewingKey) => {
        const variant = k.grantStatus === "active" ? "success" : "muted";
        return (
          <DBadge variant={variant} dot>
            {k.grantStatus ?? "—"}
          </DBadge>
        );
      },
    },
    {
      key: "chain",
      header: "On-chain",
      hideOnMobile: true,
      render: (k: ViewingKey) => {
        if (k.onChainGrantExists == null) return <span style={{ color: "var(--d-muted)" }}>—</span>;
        return (
          <DBadge variant={k.onChainGrantExists ? "success" : "warning"} dot>
            {k.onChainGrantExists ? "exists" : "missing"}
          </DBadge>
        );
      },
    },
    {
      key: "createdAt",
      header: "Created",
      hideOnMobile: true,
      render: (k: ViewingKey) => formatDate(k.createdAt),
    },
    {
      key: "actions",
      header: "",
      align: "right" as const,
      width: "120px",
      render: (k: ViewingKey) => (
        <div style={{ display: "flex", gap: 4, justifyContent: "flex-end", flexWrap: "wrap" }}>
          {k.grantStatus === "active" && (
            <>
              <DButton
                variant="ghost"
                size="sm"
                icon={RefreshCw}
                onClick={() => verifyGrant(k)}
                disabled={!canUseUmbraActions}
              >
                Verify
              </DButton>
              <DButton
                variant="ghost"
                size="sm"
                icon={Ban}
                onClick={() => setConfirmRevoke(k)}
                disabled={!canUseUmbraActions}
              >
                Revoke
              </DButton>
            </>
          )}
          {k.createTxSignature ? (
            <DButton
              variant="ghost"
              size="sm"
              onClick={() =>
                window.open(`https://solscan.io/tx/${k.createTxSignature}${clusterQs}`, "_blank")
              }
            >
              Tx
            </DButton>
          ) : null}
        </div>
      ),
    },
  ];

  const scopedKeyColumns = [
    {
      key: "label",
      header: "Label",
      render: (k: ScopedViewingKey) => <span style={{ fontWeight: 500 }}>{k.label}</span>,
    },
    {
      key: "scope",
      header: "Scope",
      hideOnMobile: true,
      render: (k: ScopedViewingKey) => (
        <DBadge variant="muted" dot>
          {k.scope}
        </DBadge>
      ),
    },
    {
      key: "mint",
      header: "Mint",
      render: (k: ScopedViewingKey) => (
        <span style={{ fontFamily: "monospace", fontSize: 12 }}>{shortMintAddr(k.mintAddress)}</span>
      ),
    },
    {
      key: "utc",
      header: "UTC window",
      hideOnMobile: true,
      render: (k: ScopedViewingKey) => (
        <span style={{ fontSize: 12, color: "var(--d-muted)" }}>{scopeUtcSummary(k)}</span>
      ),
    },
    {
      key: "keyHex",
      header: "Viewing key",
      render: (k: ScopedViewingKey) => <DCopyField value={k.keyHex} masked />,
    },
    {
      key: "createdAt",
      header: "Saved",
      hideOnMobile: true,
      render: (k: ScopedViewingKey) => formatDate(k.createdAt),
    },
  ];

  return (
    <>
      <DPageHeader
        title="Compliance"
        description="Confidential disclosure PDFs, Umbra Poseidon viewing keys (mint- and UTC-time scoped), and on-chain auditor grants."
      />

      {!canUseUmbraActions && (
        <div
          className="d-card"
          style={{
            marginBottom: 16,
            padding: 14,
            borderLeft: "3px solid #b45309",
            background: "rgba(180, 83, 9, 0.06)",
          }}
        >
          <p style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>Wallet required for Umbra keys &amp; grants</p>
          <p style={{ margin: "8px 0 0", fontSize: 13, color: "var(--d-muted, #64748b)" }}>
            Connect your Privy Solana wallet (the one registered with Umbra) to derive viewing keys or create, verify, or
            revoke auditor grants. Disclosure PDFs work without it.
          </p>
        </div>
      )}

      {actionError ? (
        <div
          className="d-card"
          style={{
            marginBottom: 16,
            padding: 12,
            borderLeft: "3px solid #b91c1c",
            background: "rgba(185, 28, 28, 0.06)",
          }}
        >
          <p style={{ margin: 0, fontSize: 13 }}>{actionError}</p>
          <div style={{ marginTop: 8 }}>
            <DButton variant="ghost" size="sm" onClick={() => setActionError(null)}>
              Dismiss
            </DButton>
          </div>
        </div>
      ) : null}

      <DTabs
        items={[
          { id: "reports", label: "Disclosure reports", count: totalReports },
          { id: "viewing-keys", label: "Viewing keys", count: scopedViewingKeys.length },
          { id: "grants", label: "Auditor grants", count: viewingKeys.length },
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === "reports" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 24, marginTop: 24 }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
              gap: 16,
            }}
          >
            <DStatCard label="Total reports" value={String(totalReports)} icon={FileDown} />
            <DStatCard label="Ready" value={String(readyCount)} icon={ShieldCheck} />
            <DStatCard label="Expired" value={String(expiredCount)} icon={FileDown} />
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <DButton
              icon={Plus}
              onClick={() => {
                resetDrawer();
                setDrawerOpen(true);
              }}
            >
              New disclosure report
            </DButton>
          </div>

          <DTable
            columns={reportColumns}
            data={complianceReports}
            emptyTitle="No disclosure reports"
            emptyDescription="Create a CONFIDENTIAL PDF summary of dashboard activity for an auditor or regulator."
          />
        </div>
      )}

      {tab === "viewing-keys" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 24, marginTop: 24 }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
              gap: 16,
            }}
          >
            <DStatCard label="Saved keys" value={String(scopedViewingKeys.length)} icon={Hash} />
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <DButton
              icon={Plus}
              onClick={() => {
                resetViewingKeyDrawer();
                setVkDrawerOpen(true);
              }}
            >
              Generate key
            </DButton>
          </div>

          <DTable
            columns={scopedKeyColumns}
            data={scopedViewingKeys}
            emptyTitle="No viewing keys saved"
            emptyDescription="Use Generate key to open the panel, derive a mint- or UTC time–scoped Umbra viewing key, and save it for export."
          />
        </div>
      )}

      {tab === "grants" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 24, marginTop: 24 }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
              gap: 16,
            }}
          >
            <DStatCard label="Active grants" value={String(activeGrants)} icon={Key} />
            <DStatCard label="Revoked" value={String(revokedGrants)} icon={Eye} />
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <DButton
              icon={Plus}
              onClick={() => {
                resetGrantModal();
                setGrantModalOpen(true);
              }}
            >
              Create on-chain grant
            </DButton>
          </div>

          <DTable
            columns={keyColumns}
            data={viewingKeys}
            emptyTitle="No auditor grants"
            emptyDescription="Issue an Umbra compliance grant to authorize a receiver wallet + X25519 key for regulated disclosure workflows."
          />
        </div>
      )}

      <DDrawer
        open={vkDrawerOpen}
        onClose={() => {
          setVkDrawerOpen(false);
          setVkError(null);
        }}
        title="Generate viewing key"
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <p style={{ margin: 0, fontSize: 13, color: "var(--d-muted)", lineHeight: 1.45 }}>
            Derived locally from your Umbra master seed (mint → year → month → … → second). All calendar fields are UTC.
            The hex value is stored only after you save.
          </p>
          {vkError ? <p style={{ color: "#b91c1c", fontSize: 13, margin: 0 }}>{vkError}</p> : null}
          <DInput label="Label" value={vkLabel} onChange={setVkLabel} placeholder="e.g. Q2 2026 USDC monthly" />
          <DSelect
            label="Scope"
            value={vkScope}
            onChange={(v) => setVkScope(v as ScopedViewingKeyScope)}
            options={SCOPE_OPTIONS}
          />
          <DSelect
            label="Mint"
            value={vkMintPreset}
            onChange={(v) => setVkMintPreset(v as "USDC" | "USDT" | "custom")}
            options={[
              { value: "USDC", label: `USDC (${merchantProfile?.network === "mainnet" ? "mainnet" : "devnet"})` },
              { value: "USDT", label: `USDT (${merchantProfile?.network === "mainnet" ? "mainnet" : "devnet"})` },
              { value: "custom", label: "Custom mint" },
            ]}
          />
          {vkMintPreset === "custom" ? (
            <DInput
              label="Custom mint (base58)"
              value={vkCustomMint}
              onChange={setVkCustomMint}
              placeholder="Token mint address"
            />
          ) : null}
          {vkScope !== "mint" ? (
            <DInput label="Year (UTC)" value={vkYear} onChange={setVkYear} placeholder="e.g. 2026" />
          ) : null}
          {["monthly", "daily", "hourly", "minute", "second"].includes(vkScope) ? (
            <DInput label="Month (1–12, UTC)" value={vkMonth} onChange={setVkMonth} />
          ) : null}
          {["daily", "hourly", "minute", "second"].includes(vkScope) ? (
            <DInput label="Day (1–31, UTC)" value={vkDay} onChange={setVkDay} />
          ) : null}
          {["hourly", "minute", "second"].includes(vkScope) ? (
            <DInput label="Hour (0–23, UTC)" value={vkHour} onChange={setVkHour} />
          ) : null}
          {["minute", "second"].includes(vkScope) ? (
            <DInput label="Minute (0–59, UTC)" value={vkMinute} onChange={setVkMinute} />
          ) : null}
          {vkScope === "second" ? (
            <DInput label="Second (0–59, UTC)" value={vkSecond} onChange={setVkSecond} />
          ) : null}
          <DButton loading={vkBusy} onClick={() => void submitScopedViewingKey()} disabled={!canUseUmbraActions}>
            Derive &amp; save
          </DButton>
        </div>
      </DDrawer>

      <DDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title="New disclosure report">
        {newReportId ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <ShieldCheck size={40} style={{ color: "var(--color-success, #22c55e)", alignSelf: "center" }} />
            <p style={{ fontWeight: 600, fontSize: 16, textAlign: "center" }}>Report saved</p>
            <p style={{ fontSize: 13, color: "var(--d-muted)", textAlign: "center" }}>
              Download the confidential PDF for your records or share through your secure channel.
            </p>
            <DButton
              icon={Download}
              onClick={() => {
                const title = reportTitle || "compliance";
                void downloadCompliancePdf(newReportId, title);
              }}
            >
              Download PDF
            </DButton>
            <DButton variant="secondary" onClick={() => setDrawerOpen(false)}>
              Close
            </DButton>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {reportFlowError ? (
              <p style={{ color: "#b91c1c", fontSize: 13, margin: 0 }}>{reportFlowError}</p>
            ) : null}
            <DInput label="Title" value={reportTitle} onChange={setReportTitle} placeholder="e.g. Q1 2026 auditor package" />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <DInput label="From (UTC day)" type="date" value={dateFrom} onChange={setDateFrom} />
              <DInput label="To (UTC day)" type="date" value={dateTo} onChange={setDateTo} />
            </div>
            <DSelect
              label="Activity direction"
              value={txType}
              onChange={setTxType}
              options={[
                { value: "all", label: "All" },
                { value: "inflow", label: "Inflow only" },
                { value: "outflow", label: "Outflow only" },
              ]}
            />
            <DTagSelect label="Products (empty = all)" options={PRODUCT_OPTIONS} selected={selectedProducts} onChange={setSelectedProducts} />
            <DInput
              label="Recipient (attn.)"
              value={recipientEmail}
              onChange={setRecipientEmail}
              placeholder="auditor@example.com"
            />
            <DButton loading={generating} onClick={() => void submitReport()}>
              Save &amp; prepare PDF
            </DButton>
          </div>
        )}
      </DDrawer>

      <DModal open={grantModalOpen} onClose={() => setGrantModalOpen(false)} title="Create Umbra compliance grant">
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <p style={{ fontSize: 13, color: "var(--d-muted)", margin: 0, lineHeight: 1.45 }}>
            Creates an on-chain <strong>user-granted compliance grant</strong> (Umbra) for the receiver&apos;s Solana
            address and their X25519 public key. A random nonce is chosen client-side and stored with the transaction
            signature.
          </p>
          {grantModalError ? <p style={{ color: "#b91c1c", fontSize: 13, margin: 0 }}>{grantModalError}</p> : null}
          <DInput label="Label" value={grantLabel} onChange={setGrantLabel} placeholder="e.g. External auditor firm" />
          <DInput
            label="Receiver Solana address"
            value={grantReceiver}
            onChange={setGrantReceiver}
            placeholder="Base58 public key"
          />
          <DInput
            label="Receiver X25519 public key (hex)"
            value={grantX25519}
            onChange={setGrantX25519}
            placeholder="64 hex characters"
          />
          <DButton loading={grantBusy} onClick={() => void submitGrant()}>
            Sign &amp; create grant
          </DButton>
        </div>
      </DModal>

      <DModal open={Boolean(confirmRevoke)} onClose={() => setConfirmRevoke(null)} title="Revoke grant">
        <p style={{ fontSize: 14, marginTop: 0 }}>
          This submits an Umbra <strong>delete</strong> compliance grant transaction. The receiver will no longer be
          authorized for grant-based flows tied to these parameters.
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", marginTop: 20 }}>
          <DButton variant="secondary" onClick={() => setConfirmRevoke(null)} disabled={revokeBusy}>
            Cancel
          </DButton>
          <DButton
            onClick={() => confirmRevoke && void revokeGrant(confirmRevoke)}
            loading={revokeBusy}
          >
            Revoke on-chain
          </DButton>
        </div>
      </DModal>
    </>
  );
}
