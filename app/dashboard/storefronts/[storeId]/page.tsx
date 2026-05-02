"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  DPageHeader,
  DBadge,
  DButton,
  DModal,
  DInput,
  DSelect,
  DToggle,
  DEmptyState,
  DTabs,
} from "@/components/dashboard/primitives";
import {
  Plus,
  ArrowLeft,
  ExternalLink,
  Pencil,
  Trash2,
  Package,
  ShoppingCart,
  Settings,
  ImageIcon,
  Globe,
} from "lucide-react";
import { useMerchantApi } from "@/hooks/use-merchant-api";
import { useRef } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

type StoreDetail = {
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
};

type Product = {
  id: string;
  name: string;
  shortDesc: string | null;
  longDesc: string | null;
  price: string; // BigInt as string
  imageUrl: string | null;
  sku: string | null;
  stock: number | null;
  status: string;
  sortOrder: number;
};

const CURRENCY_OPTIONS = [
  { value: "USDC", label: "USDC" },
  { value: "SOL", label: "SOL" },
];

const STATUS_OPTIONS = [
  { value: "draft", label: "Draft" },
  { value: "live", label: "Live" },
  { value: "paused", label: "Paused" },
];

const CATEGORY_OPTIONS = [
  { value: "Digital goods", label: "Digital goods" },
  { value: "Merch", label: "Merch & apparel" },
  { value: "SaaS", label: "SaaS / subscriptions" },
  { value: "NFT", label: "NFT & collectibles" },
  { value: "Services", label: "Services" },
  { value: "Other", label: "Other" },
];

const STATUS_BADGE: Record<string, { variant: "success" | "warning" | "muted"; label: string }> = {
  live: { variant: "success", label: "Live" },
  paused: { variant: "warning", label: "Paused" },
  draft: { variant: "muted", label: "Draft" },
};

function formatPrice(raw: string, currency: string): string {
  const decimals = currency === "SOL" ? 9 : 6;
  const num = Number(raw) / Math.pow(10, decimals);
  return `${num.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: decimals })} ${currency}`;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function StoreManagePage() {
  const { storeId } = useParams<{ storeId: string }>();
  const router = useRouter();
  const { apiFetch, loading: authLoading } = useMerchantApi();

  const [store, setStore] = useState<StoreDetail | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("products");

  // ─── Fetch ──────────────────────────────────────────────────────────────────
  const fetchStore = useCallback(async () => {
    if (authLoading) return;
    const [storeRes, prodRes] = await Promise.all([
      apiFetch(`/api/v1/stores/${storeId}`),
      apiFetch(`/api/v1/stores/${storeId}/products`),
    ]);
    if (storeRes.ok) setStore(await storeRes.json() as StoreDetail);
    if (prodRes.ok) {
      const pd = await prodRes.json() as { data: Product[] };
      setProducts(pd.data);
    }
    setLoading(false);
  }, [storeId, apiFetch, authLoading]);

  useEffect(() => { fetchStore(); }, [fetchStore]);

  if (loading) return <LoadingState />;
  if (!store) return <NotFound onBack={() => router.push("/dashboard/storefronts")} />;

  const badge = STATUS_BADGE[store.status] ?? STATUS_BADGE.draft;

  const tabs = [
    { id: "products", label: "Products", count: products.filter((p) => p.status === "active").length },
    { id: "settings", label: "Settings" },
  ];

  return (
    <>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
        <button
          onClick={() => router.push("/dashboard/storefronts")}
          style={{ background: "none", border: "none", color: "var(--color-text-muted)", cursor: "pointer", display: "flex", alignItems: "center", gap: 4, fontSize: 14 }}
        >
          <ArrowLeft size={16} /> Storefronts
        </button>
      </div>

      <DPageHeader
        title={store.name}
        description={store.description ?? `/${store.slug}`}
        actions={
          <div style={{ display: "flex", gap: 8 }}>
            <DBadge variant={badge.variant} dot>{badge.label}</DBadge>
            <DButton
              variant="ghost"
              icon={ExternalLink}
              size="sm"
              onClick={() => window.open(`/store/${store.slug}`, "_blank")}
            >
              Visit store
            </DButton>
          </div>
        }
      />

      <DTabs items={tabs} active={activeTab} onChange={setActiveTab} />

      {activeTab === "products" && (
        <ProductsTab
          store={store}
          products={products}
          setProducts={setProducts}
          apiFetch={apiFetch}
        />
      )}

      {activeTab === "settings" && (
        <SettingsTab
          store={store}
          setStore={setStore}
          apiFetch={apiFetch}
        />
      )}
    </>
  );
}

// ─── Products Tab ─────────────────────────────────────────────────────────────

function ProductsTab({
  store,
  products,
  setProducts,
  apiFetch,
}: {
  store: StoreDetail;
  products: Product[];
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
  apiFetch: (path: string, init?: RequestInit) => Promise<Response>;
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Product | null>(null);
  const [saving, setSaving] = useState(false);
  const [archiving, setArchiving] = useState<string | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  // Form
  const [name, setName] = useState("");
  const [shortDesc, setShortDesc] = useState("");
  const [longDesc, setLongDesc] = useState("");
  const [priceInput, setPriceInput] = useState("");
  const [sku, setSku] = useState("");
  const [stock, setStock] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageUploading, setImageUploading] = useState(false);
  const [formError, setFormError] = useState("");

  const activeProducts = products.filter((p) => p.status === "active");

  function openCreate() {
    setEditTarget(null);
    setName(""); setShortDesc(""); setLongDesc(""); setPriceInput(""); setSku(""); setStock(""); setImageUrl(null); setFormError("");
    setModalOpen(true);
  }

  function openEdit(p: Product) {
    setEditTarget(p);
    const decimals = store.currency === "SOL" ? 9 : 6;
    const humanPrice = (Number(p.price) / Math.pow(10, decimals)).toString();
    setName(p.name);
    setShortDesc(p.shortDesc ?? "");
    setLongDesc(p.longDesc ?? "");
    setPriceInput(humanPrice);
    setSku(p.sku ?? "");
    setStock(p.stock !== null ? String(p.stock) : "");
    setImageUrl(p.imageUrl);
    setFormError("");
    setModalOpen(true);
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await apiFetch("/api/v1/upload", { method: "POST", body: fd });
      if (res.ok) {
        const data = await res.json() as { url: string };
        setImageUrl(data.url);
      }
    } finally {
      setImageUploading(false);
    }
  }

  async function handleSave() {
    if (!name.trim()) { setFormError("Product name is required"); return; }
    const priceNum = parseFloat(priceInput);
    if (isNaN(priceNum) || priceNum < 0) { setFormError("Valid price is required"); return; }

    setSaving(true);
    setFormError("");
    try {
      const decimals = store.currency === "SOL" ? 9 : 6;
      const rawPrice = Math.round(priceNum * Math.pow(10, decimals));
      const payload = {
        name: name.trim(),
        shortDesc: shortDesc.trim() || null,
        longDesc: longDesc.trim() || null,
        price: rawPrice,
        imageUrl,
        sku: sku.trim() || null,
        stock: stock !== "" ? Number(stock) : null,
      };

      if (editTarget) {
        const res = await apiFetch(`/api/v1/stores/${store.id}/products/${editTarget.id}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          const updated = await res.json() as Product;
          setProducts((prev) => prev.map((p) => p.id === updated.id ? updated : p));
          setModalOpen(false);
        } else {
          const err = await res.json() as { error?: string };
          setFormError(err.error ?? "Failed to update product");
        }
      } else {
        const res = await apiFetch(`/api/v1/stores/${store.id}/products`, {
          method: "POST",
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          const created = await res.json() as Product;
          setProducts((prev) => [created, ...prev]);
          setModalOpen(false);
        } else {
          const err = await res.json() as { error?: string };
          setFormError(err.error ?? "Failed to create product");
        }
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleArchive(productId: string) {
    setArchiving(productId);
    try {
      await apiFetch(`/api/v1/stores/${store.id}/products/${productId}`, { method: "DELETE" });
      setProducts((prev) => prev.map((p) => p.id === productId ? { ...p, status: "archived" } : p));
    } finally {
      setArchiving(null);
    }
  }

  return (
    <div style={{ marginTop: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <span style={{ color: "var(--color-text-muted)", fontSize: 14 }}>
          {activeProducts.length} product{activeProducts.length !== 1 ? "s" : ""}
        </span>
        <DButton variant="primary" icon={Plus} onClick={openCreate}>Add Product</DButton>
      </div>

      {activeProducts.length === 0 ? (
        <DEmptyState
          icon={Package}
          title="No products yet"
          description="Add your first product to start selling."
          action={<DButton variant="primary" icon={Plus} onClick={openCreate}>Add Product</DButton>}
        />
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 16 }}>
          {activeProducts.map((p) => (
            <div key={p.id} className="glass-card" style={{ borderRadius: 16, overflow: "hidden" }}>
              {/* Image */}
              <div style={{ height: 160, background: "rgba(255,255,255,0.03)", position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
                {p.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.imageUrl} alt={p.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  <Package size={36} style={{ opacity: 0.15 }} />
                )}
                {p.stock !== null && p.stock <= 5 && (
                  <div style={{ position: "absolute", top: 8, right: 8 }}>
                    <DBadge variant="warning">{p.stock === 0 ? "Out of stock" : `${p.stock} left`}</DBadge>
                  </div>
                )}
              </div>

              {/* Info */}
              <div style={{ padding: "14px 16px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <h4 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: "var(--color-text-primary)" }}>{p.name}</h4>
                    {p.shortDesc && <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--color-text-muted)", lineHeight: 1.4 }}>{p.shortDesc}</p>}
                  </div>
                  <span style={{ fontSize: 15, fontWeight: 700, color: "#a78bfa", whiteSpace: "nowrap", marginLeft: 8 }}>
                    {formatPrice(p.price, store.currency)}
                  </span>
                </div>

                <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
                  <DButton variant="secondary" size="sm" icon={Pencil} onClick={() => openEdit(p)}>Edit</DButton>
                  <DButton
                    variant="ghost"
                    size="sm"
                    icon={Trash2}
                    loading={archiving === p.id}
                    onClick={() => handleArchive(p.id)}
                  >
                    Archive
                  </DButton>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Product Modal */}
      <DModal open={modalOpen} onClose={() => setModalOpen(false)} title={editTarget ? "Edit Product" : "Add Product"}>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {/* Image upload */}
          <div>
            <label style={{ fontSize: 13, fontWeight: 500, color: "var(--color-text-secondary)", display: "block", marginBottom: 8 }}>
              Product Image
            </label>
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <div
                onClick={() => imageInputRef.current?.click()}
                style={{
                  width: 72, height: 72, borderRadius: 10, overflow: "hidden",
                  background: "rgba(255,255,255,0.04)",
                  border: "1px dashed rgba(255,255,255,0.12)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  cursor: "pointer", flexShrink: 0,
                }}
              >
                {imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={imageUrl} alt="product" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : imageUploading ? (
                  <div style={{ width: 20, height: 20, border: "2px solid rgba(255,255,255,0.1)", borderTopColor: "#7b2fff", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                ) : (
                  <ImageIcon size={24} style={{ opacity: 0.3 }} />
                )}
              </div>
              <DButton variant="secondary" size="sm" loading={imageUploading} onClick={() => imageInputRef.current?.click()}>
                {imageUrl ? "Change image" : "Upload image"}
              </DButton>
              <input ref={imageInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleImageUpload} />
            </div>
          </div>

          <DInput label="Name *" value={name} onChange={setName} placeholder="e.g. Premium Plan" autoFocus />
          <DInput label="Short description" value={shortDesc} onChange={setShortDesc} placeholder="One-line summary shown in grid" />
          <DInput label="Long description" value={longDesc} onChange={setLongDesc} placeholder="Detailed description shown on product page" />
          <DInput
            label={`Price (${store.currency}) *`}
            value={priceInput}
            onChange={setPriceInput}
            placeholder="0.00"
            type="number"
          />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <DInput label="SKU" value={sku} onChange={setSku} placeholder="Optional" />
            <DInput label="Stock" value={stock} onChange={setStock} placeholder="Blank = unlimited" type="number" />
          </div>

          {formError && <p style={{ color: "#ef4444", fontSize: 13, margin: 0 }}>{formError}</p>}

          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 4 }}>
            <DButton variant="ghost" onClick={() => setModalOpen(false)}>Cancel</DButton>
            <DButton variant="primary" loading={saving} onClick={handleSave}>
              {editTarget ? "Save changes" : "Add Product"}
            </DButton>
          </div>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </DModal>
    </div>
  );
}

// ─── Settings Tab ─────────────────────────────────────────────────────────────

function SettingsTab({
  store,
  setStore,
  apiFetch,
}: {
  store: StoreDetail;
  setStore: React.Dispatch<React.SetStateAction<StoreDetail | null>>;
  apiFetch: (path: string, init?: RequestInit) => Promise<Response>;
}) {
  const [name, setName] = useState(store.name);
  const [category, setCategory] = useState(store.category ?? "Other");
  const [description, setDescription] = useState(store.description ?? "");
  const [currency, setCurrency] = useState(store.currency);
  const [privacy, setPrivacy] = useState(store.privacy === "shielded");
  const [status, setStatus] = useState(store.status);
  const [logoUrl, setLogoUrl] = useState<string | null>(store.logoUrl);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);
  const logoRef = useRef<HTMLInputElement>(null);

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await apiFetch("/api/v1/upload", { method: "POST", body: fd });
      if (res.ok) {
        const data = await res.json() as { url: string };
        setLogoUrl(data.url);
      }
    } finally {
      setLogoUploading(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      const res = await apiFetch(`/api/v1/stores/${store.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          name, category, description, currency,
          privacy: privacy ? "shielded" : "public",
          status, logoUrl,
        }),
      });
      if (res.ok) {
        const updated = await res.json() as StoreDetail;
        setStore((prev) => prev ? { ...prev, ...updated } : null);
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ marginTop: 24, maxWidth: 520 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        {/* Logo */}
        <div>
          <label style={{ fontSize: 13, fontWeight: 500, color: "var(--color-text-secondary)", display: "block", marginBottom: 8 }}>Store Logo</label>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <div
              style={{ width: 72, height: 72, borderRadius: 12, overflow: "hidden", background: "rgba(255,255,255,0.04)", border: "1px dashed rgba(255,255,255,0.12)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}
              onClick={() => logoRef.current?.click()}
            >
              {logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logoUrl} alt="logo" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : <ImageIcon size={24} style={{ opacity: 0.3 }} />}
            </div>
            <DButton variant="secondary" size="sm" loading={logoUploading} onClick={() => logoRef.current?.click()}>
              {logoUrl ? "Change logo" : "Upload logo"}
            </DButton>
            <input ref={logoRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleLogoUpload} />
          </div>
        </div>

        <DInput label="Store Name" value={name} onChange={setName} placeholder="My Store" />
        <DSelect label="Category" value={category} onChange={setCategory} options={CATEGORY_OPTIONS} />
        <DInput label="Description" value={description} onChange={setDescription} placeholder="A short description…" />
        <DSelect label="Currency" value={currency} onChange={setCurrency} options={CURRENCY_OPTIONS} />
        <DSelect label="Status" value={status} onChange={setStatus} options={STATUS_OPTIONS} />
        <DToggle
          checked={privacy}
          onChange={setPrivacy}
          label="Shielded payments"
          description="All payments go through Unseen's privacy layer."
        />

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <DButton variant="primary" loading={saving} onClick={handleSave}>Save settings</DButton>
          {saved && <span style={{ fontSize: 13, color: "#22c55e" }}>✓ Saved</span>}
        </div>

        {/* Public store link */}
        <div style={{ padding: "14px 16px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12 }}>
          <p style={{ margin: "0 0 8px", fontSize: 13, fontWeight: 500, color: "var(--color-text-secondary)" }}>Public URL</p>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Globe size={14} style={{ opacity: 0.4 }} />
            <code style={{ fontSize: 13, color: "var(--color-text-muted)" }}>
              {typeof window !== "undefined" ? window.location.origin : ""}/store/{store.slug}
            </code>
            <a href={`/store/${store.slug}`} target="_blank" rel="noreferrer">
              <ExternalLink size={13} style={{ opacity: 0.4 }} />
            </a>
          </div>
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// ─── States ───────────────────────────────────────────────────────────────────

function LoadingState() {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 300 }}>
      <div style={{ width: 32, height: 32, border: "3px solid rgba(123,47,255,0.2)", borderTopColor: "#7b2fff", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function NotFound({ onBack }: { onBack: () => void }) {
  return (
    <div style={{ textAlign: "center", padding: "80px 24px" }}>
      <ShoppingCart size={48} style={{ opacity: 0.15, marginBottom: 16 }} />
      <h2 style={{ color: "var(--color-text-primary)" }}>Store not found</h2>
      <DButton variant="secondary" icon={ArrowLeft} onClick={onBack}>Back to Storefronts</DButton>
    </div>
  );
}
