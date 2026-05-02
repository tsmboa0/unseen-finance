"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import {
  DPageHeader,
  DStatCard,
  DTable,
  DTabs,
  DBadge,
  DButton,
  DModal,
  DConfirm,
  DInput,
  DSelect,
  DTagSelect,
  DCopyField,
} from "@/components/dashboard/primitives";
import { formatDate, formatRelativeTime } from "@/components/dashboard/formatters";
import { Key, Plus, Trash2, RotateCcw } from "lucide-react";
import { useMerchantApi } from "@/hooks/use-merchant-api";

const SCOPE_OPTIONS = [
  { value: "gateway.write", label: "gateway.write" },
  { value: "payroll.write", label: "payroll.write" },
  { value: "invoice.write", label: "invoice.write" },
  { value: "reports.read", label: "reports.read" },
  { value: "transactions.read", label: "transactions.read" },
  { value: "tiplinks.write", label: "tiplinks.write" },
  { value: "storefronts.write", label: "storefronts.write" },
  { value: "webhooks", label: "webhooks" },
];

const MAX_VISIBLE_SCOPES = 3;

type ApiKeyRow = {
  id: string;
  name: string;
  prefix: string;
  environment: string;
  scopes: string[];
  status: string;
  lastUsedAt: string | null;
  createdAt: string;
};

export default function ApiKeysPage() {
  const { apiFetch, loading: authLoading } = useMerchantApi();
  const [keys, setKeys] = useState<ApiKeyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"live" | "test">("test");
  const [createOpen, setCreateOpen] = useState(false);
  const [revokeTarget, setRevokeTarget] = useState<ApiKeyRow | null>(null);
  const [revoking, setRevoking] = useState(false);

  // Create form state
  const [newName, setNewName] = useState("");
  const [newEnv, setNewEnv] = useState("test");
  const [newScopes, setNewScopes] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);
  const [createdKey, setCreatedKey] = useState<string | null>(null);

  // ─── Fetch keys ────────────────────────────────────────────────────────────
  const fetchKeys = useCallback(async () => {
    if (authLoading) return;
    try {
      setLoading(true);
      const res = await apiFetch("/api/v1/api-keys");
      if (res.ok) {
        const data = await res.json() as { data: ApiKeyRow[] };
        setKeys(data.data);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [apiFetch, authLoading]);

  useEffect(() => { fetchKeys(); }, [fetchKeys]);

  // ─── Derived state ─────────────────────────────────────────────────────────
  const filtered = useMemo(() => keys.filter((k) => k.environment === tab), [keys, tab]);
  const activeCount = useMemo(() => keys.filter((k) => k.status === "active").length, [keys]);
  const revokedCount = useMemo(() => keys.filter((k) => k.status === "revoked").length, [keys]);

  const tabItems = useMemo(() => [
    { id: "live", label: "Live", count: keys.filter((k) => k.environment === "live").length },
    { id: "test", label: "Test", count: keys.filter((k) => k.environment === "test").length },
  ], [keys]);

  // ─── Columns ───────────────────────────────────────────────────────────────
  const columns = useMemo(() => [
    {
      key: "name",
      header: "Name",
      render: (row: ApiKeyRow) => <span style={{ fontWeight: 500 }}>{row.name}</span>,
    },
    {
      key: "prefix",
      header: "Key Prefix",
      render: (row: ApiKeyRow) => (
        <code style={{ fontFamily: "var(--font-mono)", fontSize: "0.82em", opacity: 0.85 }}>
          {row.prefix}
        </code>
      ),
    },
    {
      key: "scopes",
      header: "Scopes",
      render: (row: ApiKeyRow) => {
        const visible = row.scopes.slice(0, MAX_VISIBLE_SCOPES);
        const remaining = row.scopes.length - MAX_VISIBLE_SCOPES;
        return (
          <span style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
            {visible.map((s) => <DBadge key={s} variant="muted">{s}</DBadge>)}
            {remaining > 0 && <DBadge variant="default">+{remaining} more</DBadge>}
          </span>
        );
      },
      hideOnMobile: true,
    },
    {
      key: "createdAt",
      header: "Created",
      render: (row: ApiKeyRow) => formatDate(new Date(row.createdAt).getTime()),
      hideOnMobile: true,
    },
    {
      key: "lastUsedAt",
      header: "Last Used",
      render: (row: ApiKeyRow) =>
        row.lastUsedAt ? formatRelativeTime(new Date(row.lastUsedAt).getTime()) : "Never",
    },
    {
      key: "status",
      header: "Status",
      render: (row: ApiKeyRow) =>
        row.status === "active" ? (
          <DBadge variant="success" dot>Active</DBadge>
        ) : (
          <DBadge variant="error" dot>Revoked</DBadge>
        ),
    },
    {
      key: "actions",
      header: "",
      align: "right" as const,
      render: (row: ApiKeyRow) =>
        row.status === "active" ? (
          <DButton
            variant="ghost"
            size="sm"
            icon={Trash2}
            onClick={(e: React.MouseEvent) => {
              e.stopPropagation();
              setRevokeTarget(row);
            }}
          >
            Revoke
          </DButton>
        ) : null,
    },
  ], []);

  // ─── Handlers ──────────────────────────────────────────────────────────────
  function resetCreateForm() {
    setNewName("");
    setNewEnv("test");
    setNewScopes([]);
    setCreating(false);
    setCreatedKey(null);
  }

  async function handleCreate() {
    setCreating(true);
    try {
      const res = await apiFetch("/api/v1/api-keys", {
        method: "POST",
        body: JSON.stringify({ name: newName, environment: newEnv, scopes: newScopes }),
      });
      const data = await res.json() as { apiKey?: string; id?: string; name?: string; prefix?: string; environment?: string; scopes?: string[]; status?: string; createdAt?: string };
      if (res.ok && data.apiKey) {
        setCreatedKey(data.apiKey);
        setKeys((prev) => [{
          id: data.id!,
          name: data.name!,
          prefix: data.prefix!,
          environment: data.environment!,
          scopes: data.scopes!,
          status: data.status!,
          lastUsedAt: null,
          createdAt: data.createdAt!,
        }, ...prev]);
      }
    } catch {
      // ignore
    } finally {
      setCreating(false);
    }
  }

  async function handleRevoke() {
    if (!revokeTarget) return;
    setRevoking(true);
    try {
      await apiFetch(`/api/v1/api-keys/${revokeTarget.id}`, { method: "DELETE" });
      setKeys((prev) =>
        prev.map((k) => k.id === revokeTarget.id ? { ...k, status: "revoked" } : k)
      );
    } finally {
      setRevoking(false);
      setRevokeTarget(null);
    }
  }

  return (
    <>
      <DPageHeader
        title="API Keys"
        description="Create, manage, and revoke API keys for Unseen Pay."
        actions={
          <DButton variant="primary" icon={Plus} onClick={() => { resetCreateForm(); setCreateOpen(true); }}>
            Create Key
          </DButton>
        }
      />

      <DTabs items={tabItems} active={tab} onChange={(id) => setTab(id as "live" | "test")} />

      <div className="d-grid d-grid--3" style={{ margin: "24px 0" }}>
        <DStatCard label="Active Keys" value={loading ? "—" : String(activeCount)} icon={Key} />
        <DStatCard label="Total Keys" value={loading ? "—" : String(keys.length)} icon={RotateCcw} />
        <DStatCard label="Revoked" value={loading ? "—" : String(revokedCount)} icon={Trash2} />
      </div>

      <DTable
        columns={columns}
        data={filtered}
        emptyTitle="No API keys"
        emptyDescription={`No ${tab} keys yet. Create one to get started.`}
      />

      {/* Create Key Modal */}
      <DModal open={createOpen} onClose={() => { setCreateOpen(false); resetCreateForm(); }} title="Create API Key">
        {createdKey ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <DCopyField value={createdKey} label="API Key" masked />
            <p style={{
              color: "var(--color-warning, #e5a00d)",
              fontSize: "0.85rem",
              fontWeight: 500,
              margin: 0,
              padding: "10px 12px",
              background: "var(--color-warning-subtle, rgba(229, 160, 13, 0.08))",
              borderRadius: 8,
              border: "1px solid var(--color-warning-border, rgba(229, 160, 13, 0.2))",
            }}>
              Copy this key now. You won&apos;t be able to see it again.
            </p>
            <DButton variant="primary" onClick={() => { setCreateOpen(false); resetCreateForm(); }}>Done</DButton>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <DInput label="Name" value={newName} onChange={setNewName} placeholder="e.g. Production server" autoFocus />
            <DSelect
              label="Environment"
              value={newEnv}
              onChange={setNewEnv}
              options={[{ value: "test", label: "Test" }, { value: "live", label: "Live" }]}
            />
            <DTagSelect label="Scopes" options={SCOPE_OPTIONS} selected={newScopes} onChange={setNewScopes} />
            <DButton
              variant="primary"
              onClick={handleCreate}
              loading={creating}
              disabled={!newName.trim() || newScopes.length === 0}
            >
              Create Key
            </DButton>
          </div>
        )}
      </DModal>

      {/* Revoke Confirmation */}
      <DConfirm
        open={!!revokeTarget}
        onClose={() => setRevokeTarget(null)}
        onConfirm={handleRevoke}
        title="Revoke API Key"
        description={`"${revokeTarget?.name}" will immediately stop working. This action cannot be undone.`}
        confirmLabel="Revoke Key"
        confirmVariant="danger"
        loading={revoking}
      />
    </>
  );
}
