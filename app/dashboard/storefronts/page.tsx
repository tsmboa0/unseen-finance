"use client";

import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import {
  DPageHeader,
  DStatCard,
  DTabs,
  DBadge,
  DButton,
  DDrawer,
  DInput,
  DSelect,
  DToggle,
  DEmptyState,
} from "@/components/dashboard/primitives";
import { formatNumber } from "@/components/dashboard/formatters";
import { Store, Plus, ExternalLink, Globe, ShieldCheck, Settings, ImageIcon } from "lucide-react";
import { useMerchantApi } from "@/hooks/use-merchant-api";
import { useRouter } from "next/navigation";
import { getStorefrontBaseHost, getStorefrontHomeUrl, getStorefrontPublicLabel } from "@/lib/storefront-host";

function revokeBlobUrl(url: string | null | undefined) {
  if (url?.startsWith("blob:")) URL.revokeObjectURL(url);
}

const CATEGORY_OPTIONS = [
  { value: "Digital goods", label: "Digital goods" },
  { value: "Merch", label: "Merch & apparel" },
  { value: "SaaS", label: "SaaS / subscriptions" },
  { value: "NFT", label: "NFT & collectibles" },
  { value: "Services", label: "Services" },
  { value: "Other", label: "Other" },
];

const CURRENCY_OPTIONS = [
  { value: "USDC", label: "USDC" },
  { value: "SOL", label: "SOL" },
];

type StoreRow = {
  id: string;
  name: string;
  slug: string;
  category: string | null;
  description: string | null;
  logoUrl: string | null;
  currency: string;
  privacy: string;
  status: string;
  productCount: number;
  orderCount: number;
  createdAt: string;
};

const TABS = [
  { id: "all", label: "All" },
  { id: "live", label: "Live" },
  { id: "paused", label: "Paused" },
  { id: "draft", label: "Draft" },
];

const STATUS_BADGE: Record<string, { variant: "success" | "warning" | "muted"; label: string }> = {
  live: { variant: "success", label: "Live" },
  paused: { variant: "warning", label: "Paused" },
  draft: { variant: "muted", label: "Draft" },
};

export default function StorefrontsPage() {
  const { apiFetch, loading: authLoading } = useMerchantApi();
  const router = useRouter();
  const [stores, setStores] = useState<StoreRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  // Form state
  const [formName, setFormName] = useState("");
  const [formSlug, setFormSlug] = useState("");
  const [formCategory, setFormCategory] = useState("Digital goods");
  const [formDescription, setFormDescription] = useState("");
  const [formCurrency, setFormCurrency] = useState("USDC");
  const [formShielded, setFormShielded] = useState(true);
  const [formLogoUrl, setFormLogoUrl] = useState<string | null>(null);
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoUploadError, setLogoUploadError] = useState("");
  const logoInputRef = useRef<HTMLInputElement>(null);

  // ─── Fetch stores ──────────────────────────────────────────────────────────
  const fetchStores = useCallback(async () => {
    if (authLoading) return;
    try {
      setLoading(true);
      const res = await apiFetch("/api/v1/stores");
      if (res.ok) {
        const data = await res.json() as { data: StoreRow[] };
        setStores(data.data);
      }
    } finally {
      setLoading(false);
    }
  }, [apiFetch, authLoading]);

  useEffect(() => { fetchStores(); }, [fetchStores]);

  // Auto-generate slug from name
  useEffect(() => {
    if (formName && !formSlug) {
      setFormSlug(formName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""));
    }
  }, [formName, formSlug]);

  // ─── Derived ───────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    if (activeTab === "all") return stores;
    return stores.filter((s) => s.status === activeTab);
  }, [stores, activeTab]);

  const tabItems = useMemo(() =>
    TABS.map((t) => ({
      id: t.id,
      label: t.label,
      count: t.id === "all" ? stores.length : stores.filter((s) => s.status === t.id).length,
    })), [stores]
  );

  const liveCount = useMemo(() => stores.filter((s) => s.status === "live").length, [stores]);

  // ─── Logo upload ───────────────────────────────────────────────────────────
  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    revokeBlobUrl(formLogoUrl);
    const localPreview = URL.createObjectURL(file);
    setFormLogoUrl(localPreview);
    setLogoUploading(true);
    setLogoUploadError("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await apiFetch("/api/v1/upload", { method: "POST", body: fd });
      const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
      if (res.ok && data.url) {
        revokeBlobUrl(localPreview);
        setFormLogoUrl(data.url);
      } else {
        setLogoUploadError(data.error ?? `Upload failed (${res.status})`);
      }
    } catch {
      setLogoUploadError("Upload failed — network error");
    } finally {
      setLogoUploading(false);
      e.target.value = "";
    }
  }

  // ─── Create store ──────────────────────────────────────────────────────────
  function resetForm() {
    revokeBlobUrl(formLogoUrl);
    setFormName("");
    setFormSlug("");
    setFormCategory("Digital goods");
    setFormDescription("");
    setFormCurrency("USDC");
    setFormShielded(true);
    setFormLogoUrl(null);
    setCreateError("");
    setLogoUploadError("");
  }

  async function handleCreate() {
    if (logoUploading) return;
    if (formLogoUrl?.startsWith("blob:")) {
      setCreateError("Fix the logo upload error before creating the store");
      return;
    }
    setCreating(true);
    setCreateError("");
    try {
      const res = await apiFetch("/api/v1/stores", {
        method: "POST",
        body: JSON.stringify({
          name: formName,
          slug: formSlug,
          category: formCategory,
          description: formDescription,
          logoUrl: formLogoUrl,
          currency: formCurrency,
          privacy: formShielded ? "shielded" : "public",
        }),
      });
      const data = await res.json() as StoreRow & { error?: string };
      if (!res.ok) {
        setCreateError(data.error ?? "Failed to create store");
        return;
      }
      setStores((prev) => [{ ...data, productCount: 0, orderCount: 0 }, ...prev]);
      setDrawerOpen(false);
      resetForm();
    } finally {
      setCreating(false);
    }
  }

  return (
    <>
      <DPageHeader
        title="Storefronts"
        description="Create and manage privacy-native storefronts powered by Unseen Pay."
        actions={
          <DButton variant="primary" icon={Plus} onClick={() => setDrawerOpen(true)}>
            New Storefront
          </DButton>
        }
      />

      <div className="dash-kpi-grid">
        <DStatCard icon={Store} label="Total Storefronts" value={loading ? "—" : formatNumber(stores.length)} />
        <DStatCard icon={Globe} label="Live" value={loading ? "—" : formatNumber(liveCount)} />
        <DStatCard icon={ShieldCheck} label="Privacy" value="Shielded" />
      </div>

      <div className="dash-section">
        <DTabs items={tabItems} active={activeTab} onChange={setActiveTab} />

        {!loading && filtered.length === 0 ? (
          <DEmptyState
            icon={Store}
            title="No storefronts"
            description="Create your first storefront to start accepting private payments."
            action={
              <DButton variant="primary" icon={Plus} onClick={() => setDrawerOpen(true)}>
                New Storefront
              </DButton>
            }
          />
        ) : (
          <div className="sf-grid">
            {filtered.map((sf) => {
              const status = STATUS_BADGE[sf.status] ?? STATUS_BADGE.draft;
              return (
                <div key={sf.id} className="sf-card glass-card">
                  <div className="sf-card__head">
                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                      <div style={{
                        width: 44, height: 44, borderRadius: 10,
                        background: "rgba(123,47,255,0.1)",
                        border: "1px solid rgba(123,47,255,0.15)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        flexShrink: 0, overflow: "hidden",
                      }}>
                        {sf.logoUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={sf.logoUrl} alt={sf.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        ) : (
                          <Store size={20} style={{ opacity: 0.5 }} />
                        )}
                      </div>
                      <div className="sf-card__title-group">
                        <h3 className="sf-card__name">{sf.name}</h3>
                        <span className="sf-card__subdomain">
                          {getStorefrontBaseHost()
                            ? getStorefrontPublicLabel(sf.slug)
                            : `/${sf.slug}`}
                        </span>
                      </div>
                    </div>
                    <div className="sf-card__badges">
                      <DBadge variant={status.variant} dot>{status.label}</DBadge>
                      <DBadge variant={sf.privacy === "shielded" ? "success" : "muted"}>
                        {sf.privacy === "shielded" ? "Shielded" : "Public"}
                      </DBadge>
                    </div>
                  </div>

                  {sf.description && (
                    <p style={{ fontSize: "13px", color: "var(--color-text-muted)", margin: "8px 0 0", lineHeight: 1.5 }}>
                      {sf.description}
                    </p>
                  )}

                  <div className="sf-card__stats">
                    <div className="sf-card__stat">
                      <span className="sf-card__stat-label">Products</span>
                      <span className="sf-card__stat-value">{formatNumber(sf.productCount)}</span>
                    </div>
                    <div className="sf-card__stat">
                      <span className="sf-card__stat-label">Orders</span>
                      <span className="sf-card__stat-value">{formatNumber(sf.orderCount)}</span>
                    </div>
                    <div className="sf-card__stat">
                      <span className="sf-card__stat-label">Currency</span>
                      <span className="sf-card__stat-value">{sf.currency}</span>
                    </div>
                  </div>

                  <div className="sf-card__actions">
                    <DButton
                      variant="ghost"
                      icon={ExternalLink}
                      size="sm"
                      onClick={() => window.open(getStorefrontHomeUrl(sf.slug), "_blank")}
                    >
                      Visit
                    </DButton>
                    <DButton
                      variant="secondary"
                      size="sm"
                      icon={Settings}
                      onClick={() => router.push(`/dashboard/storefronts/${sf.id}`)}
                    >
                      Manage
                    </DButton>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* New Storefront Drawer */}
      <DDrawer
        open={drawerOpen}
        onClose={() => { setDrawerOpen(false); resetForm(); }}
        title="New Storefront"
      >
        <div className="sf-drawer-form">
          {/* Logo upload */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <label style={{ fontSize: "13px", fontWeight: 500, color: "var(--color-text-secondary)" }}>
              Store Logo
            </label>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{
                width: 64, height: 64, borderRadius: 12,
                background: "rgba(255,255,255,0.04)",
                border: "1px dashed rgba(255,255,255,0.12)",
                display: "flex", alignItems: "center", justifyContent: "center",
                overflow: "hidden", cursor: "pointer", flexShrink: 0,
              }}
                onClick={() => logoInputRef.current?.click()}
              >
                {formLogoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={formLogoUrl} alt="logo" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : logoUploading ? (
                  <div style={{ width: 20, height: 20, border: "2px solid rgba(255,255,255,0.1)", borderTopColor: "#7b2fff", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                ) : (
                  <ImageIcon size={24} style={{ opacity: 0.3 }} />
                )}
              </div>
              <div>
                <DButton variant="secondary" size="sm" onClick={() => logoInputRef.current?.click()} loading={logoUploading}>
                  {formLogoUrl ? "Change" : "Upload"} logo
                </DButton>
                <p style={{ fontSize: "11px", color: "var(--color-text-muted)", margin: "4px 0 0" }}>
                  PNG, JPG, WebP · max 5 MB
                </p>
              </div>
            </div>
            {logoUploadError ? (
              <p style={{ color: "#ef4444", fontSize: 12, margin: 0, lineHeight: 1.4 }}>{logoUploadError}</p>
            ) : null}
            <input ref={logoInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleLogoUpload} />
          </div>

          <DInput label="Store Name" value={formName} onChange={(v) => { setFormName(v); setFormSlug(""); }} placeholder="My Awesome Store" />
          <DInput
            label="Slug"
            value={formSlug}
            onChange={setFormSlug}
            placeholder="my-awesome-store"
            hint="store.unseen.finance/my-awesome-store"
          />
          <DSelect label="Category" value={formCategory} onChange={setFormCategory} options={CATEGORY_OPTIONS} />
          <DInput label="Description" value={formDescription} onChange={setFormDescription} placeholder="A short description of your store…" />
          <DSelect label="Currency" value={formCurrency} onChange={setFormCurrency} options={CURRENCY_OPTIONS} />
          <DToggle
            checked={formShielded}
            onChange={setFormShielded}
            label="Shielded transactions"
            description="All payments routed through Unseen's privacy layer (Umbra)."
          />

          {createError && (
            <p style={{ color: "#ef4444", fontSize: "13px", margin: 0 }}>{createError}</p>
          )}

          <DButton
            variant="primary"
            onClick={handleCreate}
            loading={creating}
            disabled={!formName.trim() || !formSlug.trim()}
          >
            Create Storefront
          </DButton>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </DDrawer>
    </>
  );
}
