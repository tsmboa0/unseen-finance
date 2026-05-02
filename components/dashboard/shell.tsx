"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
import {
  type LucideIcon,
  Bell,
  FileText,
  Gift,
  Key,
  LayoutDashboard,
  LogIn,
  LogOut,
  Menu,
  Search,
  Settings,
  Shield,
  ShieldCheck,
  Store,
  Users,
  X,
} from "lucide-react";
import { type ReactNode, useState, useEffect, useRef } from "react";
import { UnseenLogo } from "@/components/unseen/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { notifications } from "@/components/dashboard/mock-data";
import { formatRelativeTime } from "@/components/dashboard/formatters";

type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  badge?: number;
};

const mainNav: NavItem[] = [
  { label: "Analytics", href: "/dashboard", icon: LayoutDashboard },
  { label: "Gateway", href: "/dashboard/gateway", icon: Shield },
  { label: "Payroll", href: "/dashboard/payroll", icon: Users },
  { label: "Storefronts", href: "/dashboard/storefronts", icon: Store },
  { label: "Tiplinks & Gifts", href: "/dashboard/tiplinks", icon: Gift },
  { label: "Invoice", href: "/dashboard/invoice", icon: FileText },
  { label: "Compliance", href: "/dashboard/compliance", icon: ShieldCheck },
];

const bottomNav: NavItem[] = [
  { label: "API Keys", href: "/dashboard/api-keys", icon: Key },
  { label: "Settings", href: "/dashboard/settings", icon: Settings },
];

export function DashboardShell({ children }: { children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { ready, authenticated } = usePrivy();
  const router = useRouter();

  // Redirect unauthenticated users to the landing page
  useEffect(() => {
    if (ready && !authenticated) {
      router.replace("/");
    }
  }, [ready, authenticated, router]);

  // Show nothing while checking auth or redirecting
  if (!ready || !authenticated) {
    return (
      <div style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--color-bg-base)",
      }}>
        <div style={{
          width: 32, height: 32,
          border: "3px solid rgba(123,47,255,0.2)",
          borderTopColor: "#7b2fff",
          borderRadius: "50%",
          animation: "spin 0.8s linear infinite",
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div className="dash">
      <aside className={`dash-sidebar ${sidebarOpen ? "is-open" : ""}`}>
        <div className="dash-sidebar__head">
          <div className="dash-sidebar__logo">
            <UnseenLogo compact />
          </div>
          <button
            aria-label="Close sidebar"
            className="dash-sidebar__close"
            onClick={() => setSidebarOpen(false)}
            type="button"
          >
            <X size={18} />
          </button>
        </div>

        <nav className="dash-sidebar__nav">
          <p className="dash-sidebar__section">Platform</p>
          {mainNav.map((item) => (
            <SidebarLink key={item.href} item={item} onNavigate={() => setSidebarOpen(false)} />
          ))}
        </nav>

        <div className="dash-sidebar__bottom">
          {bottomNav.map((item) => (
            <SidebarLink key={item.href} item={item} onNavigate={() => setSidebarOpen(false)} />
          ))}
          <AccountBlock />
        </div>
      </aside>

      {sidebarOpen && (
        <div className="dash-sidebar-overlay" onClick={() => setSidebarOpen(false)} />
      )}

      <div className="dash-main">
        <Topbar onMenuClick={() => setSidebarOpen(true)} />
        <div className="dash-content">{children}</div>
      </div>
    </div>
  );
}

// ─── Account block (sidebar bottom) ─────────────────────────────────────────

function AccountBlock() {
  const { user, logout } = usePrivy();

  const email = user?.email?.address ?? user?.google?.email ?? null;
  const wallet = user?.wallet?.address ?? null;
  const name = email
    ? email.split("@")[0]
    : wallet
    ? wallet.slice(0, 6) + "…" + wallet.slice(-4)
    : "Merchant";
  const initials = name.slice(0, 2).toUpperCase();

  return (
    <div className="dash-sidebar__account">
      <span className="dash-sidebar__avatar">{initials}</span>
      <div className="dash-sidebar__account-info">
        <span className="dash-sidebar__account-name">{name}</span>
        <button
          onClick={logout}
          style={{
            background: "none",
            border: "none",
            color: "var(--color-text-muted)",
            fontSize: "12px",
            cursor: "pointer",
            padding: 0,
            display: "flex",
            alignItems: "center",
            gap: "4px",
          }}
        >
          <LogOut size={12} />
          Sign out
        </button>
      </div>
    </div>
  );
}

// ─── Sidebar link ────────────────────────────────────────────────────────────

function SidebarLink({ item, onNavigate }: { item: NavItem; onNavigate: () => void }) {
  const pathname = usePathname();
  const isActive =
    item.href === "/dashboard"
      ? pathname === "/dashboard"
      : pathname.startsWith(item.href);
  const Icon = item.icon;

  return (
    <Link
      className={`dash-sidebar__link ${isActive ? "is-active" : ""}`}
      href={item.href}
      onClick={onNavigate}
    >
      <Icon aria-hidden size={18} />
      <span>{item.label}</span>
      {item.badge ? <span className="dash-sidebar__badge">{item.badge}</span> : null}
    </Link>
  );
}

// ─── Topbar ──────────────────────────────────────────────────────────────────

function Topbar({ onMenuClick }: { onMenuClick: () => void }) {
  const [notiOpen, setNotiOpen] = useState(false);
  const notiRef = useRef<HTMLDivElement>(null);
  const { login, authenticated, user } = usePrivy();
  const unread = notifications.filter((n) => n.unread).length;

  const wallet = user?.wallet?.address ?? null;
  const initials = authenticated
    ? (user?.email?.address ?? wallet ?? "M").slice(0, 2).toUpperCase()
    : "?";

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (notiRef.current && !notiRef.current.contains(e.target as Node)) {
        setNotiOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <header className="dash-topbar">
      <button
        aria-label="Open sidebar"
        className="dash-topbar__menu"
        onClick={onMenuClick}
        type="button"
      >
        <Menu size={20} />
      </button>

      <div className="dash-topbar__search">
        <Search aria-hidden size={16} />
        <input placeholder="Search transactions, pages…" type="text" />
      </div>

      <div className="dash-topbar__actions">
        <ThemeToggle />

        {/* Notifications */}
        <div className="dash-topbar__noti-wrap" ref={notiRef}>
          <button
            aria-label="Notifications"
            className="dash-topbar__icon-btn"
            onClick={() => setNotiOpen(!notiOpen)}
            type="button"
          >
            <Bell size={18} />
            {unread > 0 && <span className="dash-topbar__noti-dot" />}
          </button>
          {notiOpen && (
            <div className="dash-topbar__noti-panel">
              <p className="dash-topbar__noti-title">Notifications</p>
              {notifications.map((n) => (
                <div className={`dash-topbar__noti-item ${n.unread ? "is-unread" : ""}`} key={n.id}>
                  <p className="dash-topbar__noti-item-title">{n.title}</p>
                  <p className="dash-topbar__noti-item-body">{n.body}</p>
                  <span className="dash-topbar__noti-item-time">{formatRelativeTime(n.timestamp)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Auth button */}
        {authenticated ? (
          <Link className="dash-topbar__avatar-link" href="/dashboard/settings">
            <span className="dash-topbar__avatar">{initials}</span>
          </Link>
        ) : (
          <button
            onClick={login}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "6px 14px",
              borderRadius: "8px",
              border: "1px solid rgba(123,47,255,0.4)",
              background: "rgba(123,47,255,0.1)",
              color: "#a78bfa",
              fontSize: "13px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            <LogIn size={14} />
            Sign in
          </button>
        )}
      </div>
    </header>
  );
}
