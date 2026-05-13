"use client";

import Link from "next/link";
import { usePrivy } from "@privy-io/react-auth";
import {
  BarChart3,
  ExternalLink,
  Loader2,
  RefreshCw,
  Shield,
  UserPlus,
} from "lucide-react";
import { type FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { InteractiveAreaChart } from "@/components/dashboard/charts";
import { ThemeToggle } from "@/components/theme-toggle";
import { UnseenLogo } from "@/components/unseen/logo";
import { betaTelegramInviteUrl } from "@/lib/beta-public";

type PendingRow = { id: string; email: string; privyUserId: string | null; createdAt: string };
type AllowRow = {
  id: string;
  email: string;
  note: string | null;
  source: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

type PaymentsAnalytics = {
  rangeDays: number;
  rangeEndDayUtc?: string;
  volumeSeries: Array<{ day: string; inflow: number; outflow: number; shielded: number }>;
  paymentStatusBreakdown: Array<{ status: string; count: number; volumeRawSum: string }>;
  generatedAt: string;
};

export function AdminConsole() {
  const { login, logout, authenticated, ready, user, getAccessToken } = usePrivy();
  const [gate, setGate] = useState<"unknown" | "allowed" | "denied">("unknown");
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<PendingRow[]>([]);
  const [allowlist, setAllowlist] = useState<AllowRow[]>([]);
  const [analytics, setAnalytics] = useState<PaymentsAnalytics | null>(null);
  const [newEmail, setNewEmail] = useState("");
  const [newNote, setNewNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  const authFetch = useCallback(
    async (path: string, init?: RequestInit) => {
      const token = await getAccessToken();
      if (!token) throw new Error("Missing session");
      const headers = new Headers(init?.headers);
      headers.set("Authorization", `Bearer ${token}`);
      return fetch(path, { ...init, headers });
    },
    [getAccessToken],
  );

  const volumeChartProps = useMemo(() => {
    const vs = analytics?.volumeSeries ?? [];
    if (!vs.length) return null;
    const labels = vs.map((row, i) => {
      if (i % 5 !== 0 && i !== vs.length - 1) return "";
      const d = new Date(`${row.day}T12:00:00.000Z`);
      return `${d.getUTCMonth() + 1}/${d.getUTCDate()}`;
    });
    const pointMeta = vs.map((row) => ({ day: row.day }));
    const series = [
      { label: "Inflow", color: "#7b2fff", data: vs.map((p) => p.inflow) },
      { label: "Outflow", color: "#a855f7", data: vs.map((p) => p.outflow) },
      { label: "Shielded", color: "var(--color-success)", data: vs.map((p) => p.shielded) },
    ];
    return { labels, pointMeta, series };
  }, [analytics?.volumeSeries]);

  const loadAll = useCallback(async () => {
    setError(null);
    setBusy(true);
    try {
      const [pr, al, an] = await Promise.all([
        authFetch("/api/admin/beta/pending"),
        authFetch("/api/admin/beta/allowlist?includeInactive=1"),
        authFetch("/api/admin/analytics/payments?days=30"),
      ]);

      if (pr.status === 403 || al.status === 403 || an.status === 403) {
        setGate("denied");
        return;
      }

      if (!pr.ok || !al.ok) {
        setError("Unable to load beta program data.");
        setGate("allowed");
        return;
      }

      setGate("allowed");

      const pj = (await pr.json()) as { pending: PendingRow[] };
      const aj = (await al.json()) as { allowlist: AllowRow[] };
      setPending(pj.pending);
      setAllowlist(aj.allowlist);

      if (an.ok) {
        setAnalytics((await an.json()) as PaymentsAnalytics);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setBusy(false);
    }
  }, [authFetch]);

  useEffect(() => {
    if (!ready || !authenticated) return;
    void loadAll();
  }, [ready, authenticated, loadAll]);

  const handleLogin = () => {
    void login();
  };

  const approve = async (email: string) => {
    setBusy(true);
    setError(null);
    try {
      const res = await authFetch("/api/admin/beta/approve-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        const b = (await res.json().catch(() => null)) as { error?: string } | null;
        setError(b?.error ?? "Approve failed");
        return;
      }
      await loadAll();
    } finally {
      setBusy(false);
    }
  };

  const addManual = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await authFetch("/api/admin/beta/allowlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: newEmail, note: newNote || undefined }),
      });
      if (!res.ok) {
        const b = (await res.json().catch(() => null)) as { error?: string } | null;
        setError(b?.error ?? "Could not add email");
        return;
      }
      setNewEmail("");
      setNewNote("");
      await loadAll();
    } finally {
      setBusy(false);
    }
  };

  const setActive = async (id: string, active: boolean) => {
    setBusy(true);
    setError(null);
    try {
      const res = await authFetch(`/api/admin/beta/allowlist/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active }),
      });
      if (!res.ok) {
        setError("Could not update entry");
        return;
      }
      await loadAll();
    } finally {
      setBusy(false);
    }
  };

  if (!ready) {
    return (
      <div className="admin-shell admin-shell--center">
        <Loader2 className="admin-spinner" size={28} />
      </div>
    );
  }

  if (!authenticated) {
    return (
      <div className="admin-shell admin-shell--center admin-shell--panel">
        <UnseenLogo />
        <p className="admin-lead">Sign in with your admin Privy account to continue.</p>
        <button className="admin-btn admin-btn--primary" onClick={handleLogin} type="button">
          Sign in
        </button>
        <style jsx global>{ADMIN_STYLES}</style>
      </div>
    );
  }

  if (gate === "unknown") {
    return (
      <div className="admin-shell admin-shell--center">
        <Loader2 className="admin-spinner" size={28} />
        <style jsx global>{ADMIN_STYLES}</style>
      </div>
    );
  }

  if (gate === "denied") {
    return (
      <div className="admin-shell admin-shell--center admin-shell--panel">
        <Shield aria-hidden size={40} />
        <h1 className="admin-title">Access denied</h1>
        <p className="admin-lead">
          This console is restricted to configured admin emails ({user?.email?.address ?? "unknown"}).
        </p>
        <button className="admin-btn admin-btn--ghost" onClick={() => void logout()} type="button">
          Sign out
        </button>
        <Link className="admin-link-back" href="/">
          ← Back to site
        </Link>
        <style jsx global>{ADMIN_STYLES}</style>
      </div>
    );
  }

  return (
    <div className="admin-shell">
      <header className="admin-header">
        <div className="admin-header__brand">
          <UnseenLogo compact />
          <span className="admin-header__tag">Admin</span>
        </div>
        <div className="admin-header__actions">
          <ThemeToggle />
          <button
            className="admin-btn admin-btn--ghost admin-btn--sm"
            disabled={busy}
            onClick={() => void loadAll()}
            type="button"
          >
            <RefreshCw size={16} />
            Refresh
          </button>
          <button className="admin-btn admin-btn--ghost admin-btn--sm" onClick={() => void logout()} type="button">
            Sign out
          </button>
        </div>
      </header>

      {error ? <p className="admin-banner">{error}</p> : null}

      <section className="admin-grid">
        <div className="admin-card admin-card--accent">
          <h2 className="admin-card__title">
            <BarChart3 size={18} />
            Visitors (Vercel)
          </h2>
          <p className="admin-card__copy">
            Unique visitors and page views are tracked with{" "}
            <strong>@vercel/analytics</strong> — open your project on Vercel → Analytics for traffic,
            top pages, and Web Vitals without loading our database.
          </p>
          <a
            className="admin-btn admin-btn--secondary admin-btn--sm"
            href="https://vercel.com/docs/analytics"
            rel="noopener noreferrer"
            target="_blank"
          >
            Vercel Analytics docs
            <ExternalLink size={14} />
          </a>
        </div>

        <div className="admin-card">
          <h2 className="admin-card__title">
            <BarChart3 size={18} />
            Transaction volume (30d)
          </h2>
          {!volumeChartProps ? (
            <p className="admin-muted">Loading chart…</p>
          ) : (
            <>
              <div className="admin-line-chart-wrap admin-volume-chart-wrap">
                <InteractiveAreaChart
                  height={260}
                  labels={volumeChartProps.labels}
                  pointMeta={volumeChartProps.pointMeta}
                  series={volumeChartProps.series}
                />
              </div>
              <p className="admin-muted admin-muted--tight">
                Platform-wide daily volume (same semantics as the merchant dashboard): inflow, outflow, and shielded
                amounts in display units. Hover the chart to read values at each UTC day. Range ends{" "}
                <strong>{analytics?.rangeEndDayUtc}</strong>.
                {analytics ? ` Generated ${new Date(analytics.generatedAt).toLocaleString()}.` : null}
              </p>
            </>
          )}
        </div>
      </section>

      <section className="admin-split">
        <div className="admin-card">
          <h2 className="admin-card__title">Pending requests</h2>
          {pending.length === 0 ? (
            <p className="admin-muted">Queue is clear.</p>
          ) : (
            <ul className="admin-list">
              {pending.map((row) => (
                <li className="admin-list__row" key={row.id}>
                  <div>
                    <p className="admin-email">{row.email}</p>
                    <p className="admin-muted admin-muted--tight">
                      {new Date(row.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <button
                    className="admin-btn admin-btn--primary admin-btn--sm"
                    disabled={busy}
                    onClick={() => void approve(row.email)}
                    type="button"
                  >
                    Approve
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="admin-card">
          <h2 className="admin-card__title">
            <UserPlus size={18} />
            Add to allowlist
          </h2>
          <form className="admin-form" onSubmit={addManual}>
            <label className="admin-label">
              Email
              <input
                className="admin-input"
                onChange={(ev) => setNewEmail(ev.target.value)}
                placeholder="merchant@company.com"
                required
                type="email"
                value={newEmail}
              />
            </label>
            <label className="admin-label">
              Note (optional)
              <input
                className="admin-input"
                onChange={(ev) => setNewNote(ev.target.value)}
                placeholder="Partner, investor, etc."
                type="text"
                value={newNote}
              />
            </label>
            <button className="admin-btn admin-btn--primary" disabled={busy} type="submit">
              Add email
            </button>
          </form>
          <p className="admin-muted admin-muted--tight">
            Beta testers also use Telegram:{" "}
            <a className="admin-inline-link" href={betaTelegramInviteUrl()} rel="noopener noreferrer" target="_blank">
              invite link
            </a>
          </p>
        </div>
      </section>

      <section className="admin-card admin-card--wide">
        <h2 className="admin-card__title">Allowlist ({allowlist.length})</h2>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Email</th>
                <th>Source</th>
                <th>Status</th>
                <th>Updated</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {allowlist.map((row) => (
                <tr key={row.id}>
                  <td className="admin-email">{row.email}</td>
                  <td>{row.source}</td>
                  <td>{row.active ? "Active" : "Revoked"}</td>
                  <td className="admin-muted">{new Date(row.updatedAt).toLocaleDateString()}</td>
                  <td>
                    {row.active ? (
                      <button
                        className="admin-btn admin-btn--ghost admin-btn--sm"
                        disabled={busy}
                        onClick={() => void setActive(row.id, false)}
                        type="button"
                      >
                        Revoke
                      </button>
                    ) : (
                      <button
                        className="admin-btn admin-btn--secondary admin-btn--sm"
                        disabled={busy}
                        onClick={() => void setActive(row.id, true)}
                        type="button"
                      >
                        Restore
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <style jsx global>{ADMIN_STYLES}</style>
    </div>
  );
}

const ADMIN_STYLES = `
  .admin-shell {
    min-height: 100vh;
    padding: 28px 24px 48px;
    background: var(--color-bg);
    color: var(--color-text-primary);
    font-family: var(--font-body);
  }
  .admin-shell--center {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 16px;
    text-align: center;
  }
  .admin-shell--panel {
    max-width: 420px;
    margin: 0 auto;
  }
  .admin-spinner {
    animation: admin-spin 0.85s linear infinite;
    color: var(--color-violet-primary);
  }
  @keyframes admin-spin {
    to { transform: rotate(360deg); }
  }
  .admin-header {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    margin-bottom: 28px;
  }
  .admin-header__brand {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .admin-header__tag {
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    padding: 6px 12px;
    border-radius: var(--radius-pill);
    border: 1px solid var(--color-violet-border);
    background: var(--color-violet-shimmer);
    color: var(--color-violet-deep);
  }
  [data-theme="dark"] .admin-header__tag {
    color: var(--color-text-primary);
  }
  .admin-header__actions {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .admin-banner {
    padding: 12px 16px;
    border-radius: 12px;
    background: rgba(220, 38, 38, 0.08);
    color: var(--color-terminal-red);
    font-size: 14px;
    margin-bottom: 20px;
  }
  .admin-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 18px;
    margin-bottom: 22px;
  }
  .admin-split {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
    gap: 18px;
    margin-bottom: 22px;
  }
  .admin-card {
    border-radius: var(--radius-card);
    border: 1px solid var(--color-violet-border);
    background: var(--color-bg-card);
    box-shadow: var(--shadow-card);
    padding: 22px 22px 24px;
  }
  .admin-card--accent {
    border-color: var(--color-violet-border-hover);
  }
  .admin-card--wide {
    padding-bottom: 18px;
  }
  .admin-card__title {
    display: flex;
    align-items: center;
    gap: 10px;
    margin: 0 0 12px;
    font-family: var(--font-display);
    font-size: 1.1rem;
    font-weight: 700;
  }
  .admin-card__copy {
    margin: 0 0 14px;
    font-size: 14px;
    line-height: 1.6;
    color: var(--color-text-secondary);
  }
  .admin-muted {
    margin: 0;
    font-size: 13px;
    color: var(--color-text-muted);
  }
  .admin-muted--tight {
    margin-top: 12px;
  }
  .admin-title {
    font-family: var(--font-display);
    font-size: 1.5rem;
    margin: 8px 0 0;
  }
  .admin-lead {
    margin: 0;
    font-size: 15px;
    line-height: 1.6;
    color: var(--color-text-secondary);
  }
  .admin-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    border-radius: var(--radius-button);
    font-weight: 600;
    font-size: 14px;
    cursor: pointer;
    border: none;
    transition: opacity 0.15s ease, transform 0.15s ease;
  }
  .admin-btn:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }
  .admin-btn--sm {
    min-height: 36px;
    padding: 0 14px;
    font-size: 13px;
  }
  .admin-btn--primary {
    min-height: 44px;
    padding: 0 18px;
    background: var(--gradient-violet);
    color: #fff;
    box-shadow: 0 10px 28px rgba(123, 47, 255, 0.32);
  }
  .admin-btn--secondary {
    min-height: 40px;
    padding: 0 16px;
    border: 1px solid var(--color-violet-border);
    background: transparent;
    color: var(--color-text-primary);
  }
  .admin-btn--ghost {
    min-height: 40px;
    padding: 0 16px;
    border: 1px solid var(--color-line-soft);
    background: var(--color-white-surface);
    color: var(--color-text-secondary);
  }
  .admin-link-back {
    margin-top: 8px;
    font-size: 14px;
    color: var(--color-text-muted);
    text-decoration: underline;
    text-underline-offset: 3px;
  }
  .admin-line-chart-wrap {
    width: 100%;
    margin-top: 8px;
    color: var(--color-text-muted);
  }
  .admin-volume-chart-wrap .d-chart__svg {
    min-height: 220px;
  }
  .admin-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .admin-list__row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 12px 14px;
    border-radius: 14px;
    border: 1px solid var(--color-line-soft);
    background: var(--color-white-surface);
  }
  .admin-email {
    font-weight: 600;
    font-size: 14px;
    word-break: break-all;
  }
  .admin-form {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .admin-label {
    display: flex;
    flex-direction: column;
    gap: 6px;
    font-size: 12px;
    font-weight: 600;
    color: var(--color-text-secondary);
  }
  .admin-input {
    border-radius: 12px;
    border: 1px solid var(--color-violet-border);
    padding: 10px 12px;
    font-size: 14px;
    font-family: var(--font-body);
    background: var(--color-white-surface);
    color: var(--color-text-primary);
  }
  .admin-inline-link {
    color: var(--color-violet-primary);
    font-weight: 600;
  }
  .admin-table-wrap {
    overflow-x: auto;
    margin-top: 8px;
  }
  .admin-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 13px;
  }
  .admin-table th,
  .admin-table td {
    padding: 10px 12px;
    text-align: left;
    border-bottom: 1px solid var(--color-line-soft);
  }
  .admin-table th {
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--color-text-muted);
  }
`;
