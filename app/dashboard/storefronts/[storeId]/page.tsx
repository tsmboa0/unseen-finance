"use client";

import { useState, useEffect, useCallback, useRef } from "react";
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
  Mail,
  MapPin,
  CheckCircle,
  Clock,
  XCircle,
} from "lucide-react";
import { useMerchantApi } from "@/hooks/use-merchant-api";
import { getStorefrontBaseHost, getStorefrontHomeUrl, getStorefrontPublicLabel } from "@/lib/storefront-host";

function revokeBlobUrl(url: string | null | undefined) {
  if (url?.startsWith("blob:")) URL.revokeObjectURL(url);
}

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

type ShippingAddress = {
  addressLine: string;
  city: string;
  country: string;
  postalCode: string;
};

type OrderItem = {
  productId: string;
  name: string;
  qty: number;
  price: string;
};

type Order = {
  id: string;
  createdAt: string;
  customerName: string | null;
  customerEmail: string | null;
  shippingAddress: ShippingAddress | null;
  items: OrderItem[];
  totalAmount: string;
  currency: string;
  paymentStatus: string;
  confirmedAt: string | null;
  txSignature: string | null;
  deliveryStatus: string;
  deliveredAt: string | null;
  isNew: boolean;
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
  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersTotal, setOrdersTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("products");

  // Derive newCount from local state so it updates immediately on mark-as-delivered
  const newOrdersCount = orders.filter((o) => o.isNew && o.deliveryStatus !== "delivered").length;

  // ─── Fetch ──────────────────────────────────────────────────────────────────
  const fetchStore = useCallback(async () => {
    if (authLoading) return;
    const [storeRes, prodRes, ordersRes] = await Promise.all([
      apiFetch(`/api/v1/stores/${storeId}`),
      apiFetch(`/api/v1/stores/${storeId}/products`),
      apiFetch(`/api/v1/stores/${storeId}/orders`),
    ]);
    if (storeRes.ok) setStore(await storeRes.json() as StoreDetail);
    if (prodRes.ok) {
      const pd = await prodRes.json() as { data: Product[] };
      setProducts(pd.data);
    }
    if (ordersRes.ok) {
      const od = await ordersRes.json() as { data: Order[]; total: number };
      setOrders(od.data);
      setOrdersTotal(od.total);
    }
    setLoading(false);
  }, [storeId, apiFetch, authLoading]);

  useEffect(() => { fetchStore(); }, [fetchStore]);

  if (loading) return <LoadingState />;
  if (!store) return <NotFound onBack={() => router.push("/dashboard/storefronts")} />;

  const badge = STATUS_BADGE[store.status] ?? STATUS_BADGE.draft;

  const tabs = [
    { id: "products", label: "Products", count: products.filter((p) => p.status === "active").length },
    { id: "orders", label: `Orders${newOrdersCount > 0 ? ` · ${newOrdersCount} new` : ""}`, count: ordersTotal || undefined },
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
        description={
          store.description ??
          (getStorefrontBaseHost()
            ? getStorefrontPublicLabel(store.slug)
            : `/${store.slug}`)
        }
        actions={
          <div style={{ display: "flex", gap: 8 }}>
            <DBadge variant={badge.variant} dot>{badge.label}</DBadge>
            <DButton
              variant="ghost"
              icon={ExternalLink}
              size="sm"
              onClick={() => window.open(getStorefrontHomeUrl(store.slug), "_blank")}
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

      {activeTab === "orders" && (
        <OrdersTab
          orders={orders}
          total={ordersTotal}
          newCount={newOrdersCount}
          storeId={storeId}
          apiFetch={apiFetch}
          onOrderUpdate={(updatedOrder) =>
            setOrders((prev) =>
              prev.map((o) =>
                o.id === updatedOrder.id
                  ? {
                      ...o,
                      ...updatedOrder,
                      // Marking delivered clears the "new" flag so the count drops
                      isNew: updatedOrder.deliveryStatus === "delivered" ? false : o.isNew,
                    }
                  : o,
              ),
            )
          }
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
  const pendingPreviewBlobRef = useRef<string | null>(null);

  // Form
  const [name, setName] = useState("");
  const [shortDesc, setShortDesc] = useState("");
  const [longDesc, setLongDesc] = useState("");
  const [priceInput, setPriceInput] = useState("");
  const [sku, setSku] = useState("");
  const [stock, setStock] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  /** What the modal <img> shows (can stay blob if HTTPS preview fails). */
  const [imageDisplaySrc, setImageDisplaySrc] = useState<string | null>(null);
  const [imageUploading, setImageUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [formError, setFormError] = useState("");

  const activeProducts = products.filter((p) => p.status === "active");

  function openCreate() {
    setEditTarget(null);
    revokeBlobUrl(imageDisplaySrc);
    revokeBlobUrl(imageUrl);
    revokePendingProductPreviewBlob();
    setName(""); setShortDesc(""); setLongDesc(""); setPriceInput(""); setSku(""); setStock("");
    setImageUrl(null); setImageDisplaySrc(null); setFormError(""); setUploadError("");
    setModalOpen(true);
  }

  function openEdit(p: Product) {
    setEditTarget(p);
    revokeBlobUrl(imageDisplaySrc);
    revokeBlobUrl(imageUrl);
    revokePendingProductPreviewBlob();
    const decimals = store.currency === "SOL" ? 9 : 6;
    const humanPrice = (Number(p.price) / Math.pow(10, decimals)).toString();
    setName(p.name);
    setShortDesc(p.shortDesc ?? "");
    setLongDesc(p.longDesc ?? "");
    setPriceInput(humanPrice);
    setSku(p.sku ?? "");
    setStock(p.stock !== null ? String(p.stock) : "");
    setImageUrl(p.imageUrl);
    setImageDisplaySrc(p.imageUrl);
    setFormError("");
    setUploadError("");
    setModalOpen(true);
  }

  function closeProductModal() {
    if (pendingPreviewBlobRef.current) {
      URL.revokeObjectURL(pendingPreviewBlobRef.current);
      pendingPreviewBlobRef.current = null;
    }
    revokeBlobUrl(imageUrl);
    if (imageDisplaySrc?.startsWith("blob:") && imageDisplaySrc !== imageUrl) {
      revokeBlobUrl(imageDisplaySrc);
    }
    setModalOpen(false);
  }

  function revokePendingProductPreviewBlob() {
    if (pendingPreviewBlobRef.current) {
      URL.revokeObjectURL(pendingPreviewBlobRef.current);
      pendingPreviewBlobRef.current = null;
    }
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    revokeBlobUrl(imageDisplaySrc);
    revokePendingProductPreviewBlob();

    const localPreview = URL.createObjectURL(file);
    setImageDisplaySrc(localPreview);
    setImageUploading(true);
    setUploadError("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await apiFetch("/api/v1/upload", { method: "POST", body: fd });
      const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
      if (res.ok && data.url) {
        setImageUrl(data.url);
        setImageDisplaySrc(data.url);
        pendingPreviewBlobRef.current = localPreview;
        setUploadError("");
      } else {
        setUploadError(data.error ?? `Upload failed (${res.status})`);
      }
    } catch {
      setUploadError("Upload failed — network error");
    } finally {
      setImageUploading(false);
      e.target.value = "";
    }
  }

  async function handleSave() {
    if (!name.trim()) { setFormError("Product name is required"); return; }
    if (imageUploading) { setFormError("Wait for the image upload to finish"); return; }
    if (imageUrl?.startsWith("blob:")) {
      setFormError("Fix the image upload error before saving, or remove the image and try again");
      return;
    }
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
      <DModal open={modalOpen} onClose={closeProductModal} title={editTarget ? "Edit Product" : "Add Product"}>
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
                {imageDisplaySrc ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={imageDisplaySrc}
                    alt="product"
                    onLoad={() => {
                      if (pendingPreviewBlobRef.current) {
                        URL.revokeObjectURL(pendingPreviewBlobRef.current);
                        pendingPreviewBlobRef.current = null;
                      }
                    }}
                    onError={() => {
                      const hold = pendingPreviewBlobRef.current;
                      if (hold) {
                        pendingPreviewBlobRef.current = null;
                        setImageDisplaySrc(hold);
                        setUploadError(
                          "Uploaded, but the preview URL did not load. In Supabase → Storage, open your bucket and enable Public so browser previews work.",
                        );
                      } else if (imageUrl?.startsWith("http")) {
                        setUploadError(
                          "This image URL failed to load (make the Storage bucket public, or check the link).",
                        );
                      }
                    }}
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                ) : imageUploading ? (
                  <div style={{ width: 20, height: 20, border: "2px solid rgba(255,255,255,0.1)", borderTopColor: "#7b2fff", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                ) : (
                  <ImageIcon size={24} style={{ opacity: 0.3 }} />
                )}
              </div>
              <DButton variant="secondary" size="sm" loading={imageUploading} onClick={() => imageInputRef.current?.click()}>
                {imageDisplaySrc ? "Change image" : "Upload image"}
              </DButton>
              <input ref={imageInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleImageUpload} />
            </div>
            {uploadError ? (
              <p style={{ color: "#ef4444", fontSize: 12, margin: "8px 0 0", lineHeight: 1.4 }}>{uploadError}</p>
            ) : null}
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
            <DButton variant="ghost" onClick={closeProductModal}>Cancel</DButton>
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

// ─── Orders Tab ───────────────────────────────────────────────────────────────

function DeliveryBadge({ status }: { status: string }) {
  const delivered = status === "delivered";
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      fontSize: 12, fontWeight: 600,
      color: delivered ? "#0369a1" : "#b45309",
      background: delivered ? "rgba(3,105,161,0.08)" : "rgba(180,83,9,0.08)",
      border: `1px solid ${delivered ? "rgba(3,105,161,0.2)" : "rgba(180,83,9,0.2)"}`,
      borderRadius: 20, padding: "3px 10px",
      whiteSpace: "nowrap",
    }}>
      {delivered ? <CheckCircle size={11} /> : <Clock size={11} />}
      {delivered ? "Delivered" : "Received"}
    </span>
  );
}

function OrdersTab({
  orders,
  total,
  newCount,
  storeId,
  apiFetch,
  onOrderUpdate,
}: {
  orders: Order[];
  total: number;
  newCount: number;
  storeId: string;
  apiFetch: (path: string, init?: RequestInit) => Promise<Response>;
  onOrderUpdate: (updated: Partial<Order> & { id: string }) => void;
}) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [marking, setMarking] = useState<string | null>(null);
  const [markError, setMarkError] = useState<string | null>(null);

  function fmtPrice(raw: string, currency: string): string {
    const decimals = currency === "SOL" ? 9 : 6;
    const num = Number(raw) / Math.pow(10, decimals);
    return `${num.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;
  }

  function fmtDate(iso: string) {
    return new Date(iso).toLocaleDateString("en-US", {
      year: "numeric", month: "short", day: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  }

  async function markDelivered(orderId: string) {
    setMarking(orderId);
    setMarkError(null);
    try {
      const res = await apiFetch(`/api/v1/stores/${storeId}/orders/${orderId}`, {
        method: "PATCH",
        body: JSON.stringify({ deliveryStatus: "delivered" }),
      });
      if (res.ok) {
        const data = await res.json() as { deliveryStatus: string; deliveredAt: string | null };
        onOrderUpdate({ id: orderId, deliveryStatus: data.deliveryStatus, deliveredAt: data.deliveredAt });
      } else {
        const err = await res.json().catch(() => ({})) as { error?: string };
        setMarkError(err.error ?? `Failed to update order (${res.status})`);
      }
    } catch (e) {
      setMarkError(e instanceof Error ? e.message : "Network error — please try again");
    } finally {
      setMarking(null);
    }
  }

  if (orders.length === 0) {
    return (
      <div style={{ marginTop: 24 }}>
        <DEmptyState
          icon={ShoppingCart}
          title="No completed orders yet"
          description="Confirmed orders from your storefront will appear here."
        />
      </div>
    );
  }

  return (
    <div style={{ marginTop: 24 }}>
      {/* Header row */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
        <span style={{ fontSize: 13, color: "var(--color-text-muted)" }}>
          {total} completed order{total !== 1 ? "s" : ""}
        </span>
        {newCount > 0 && (
          <span style={{
            display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 700,
            color: "#fff", background: "#7b2fff", borderRadius: 20, padding: "3px 10px",
            boxShadow: "0 1px 6px rgba(123,47,255,0.4)",
          }}>
            {newCount} new
          </span>
        )}
      </div>

      {markError && (
        <div style={{ margin: "0 0 12px", padding: "10px 14px", background: "rgba(220,38,38,0.08)", border: "1px solid rgba(220,38,38,0.2)", borderRadius: 10, fontSize: 13, color: "#dc2626" }}>
          {markError}
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {[...orders].sort((a, b) => {
          const rank = (o: Order) =>
            o.deliveryStatus === "delivered" ? 2 : o.isNew ? 0 : 1;
          return rank(a) - rank(b);
        }).map((order) => {
          const isOpen = expanded === order.id;
          const isDelivered = order.deliveryStatus === "delivered";

          return (
            <div
              key={order.id}
              className="glass-card"
              style={{
                borderRadius: 14, overflow: "hidden",
                border: order.isNew && !isDelivered
                  ? "1px solid rgba(123,47,255,0.35)"
                  : "1px solid var(--color-line-soft)",
              }}
            >
              {/* Summary row */}
              <div
                onClick={() => setExpanded(isOpen ? null : order.id)}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr auto auto auto auto 20px",
                  gap: 12, alignItems: "center",
                  padding: "14px 18px", cursor: "pointer", userSelect: "none",
                }}
              >
                {/* Customer + date */}
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "var(--color-text-primary)" }}>
                      {order.customerName ?? "Unknown customer"}
                    </p>
                    {order.isNew && !isDelivered && (
                      <span style={{
                        fontSize: 10, fontWeight: 700, letterSpacing: "0.05em",
                        color: "#7b2fff", background: "rgba(123,47,255,0.1)",
                        border: "1px solid rgba(123,47,255,0.25)",
                        borderRadius: 20, padding: "1px 7px",
                      }}>NEW</span>
                    )}
                  </div>
                  <p style={{ margin: "2px 0 0", fontSize: 12, color: "var(--color-text-muted)" }}>
                    {fmtDate(order.confirmedAt ?? order.createdAt)}
                    {" · "}{order.items.length} item{order.items.length !== 1 ? "s" : ""}
                  </p>
                </div>

                {/* Amount */}
                <span style={{ fontSize: 14, fontWeight: 700, color: "var(--color-violet-glow)", whiteSpace: "nowrap" }}>
                  {fmtPrice(order.totalAmount, order.currency)}
                </span>

                {/* Paid badge */}
                <span style={{
                  display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, fontWeight: 600,
                  color: "#16a34a", background: "rgba(22,163,74,0.08)", border: "1px solid rgba(22,163,74,0.2)",
                  borderRadius: 20, padding: "3px 10px", whiteSpace: "nowrap",
                }}>
                  <CheckCircle size={11} /> Paid
                </span>

                {/* Delivery status badge */}
                <DeliveryBadge status={order.deliveryStatus} />

                {/* Expand chevron */}
                <svg
                  width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                  style={{ color: "var(--color-text-muted)", transition: "transform 0.2s", transform: isOpen ? "rotate(180deg)" : "none" }}
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </div>

              {/* Expanded detail */}
              {isOpen && (
                <div style={{ borderTop: "1px solid var(--color-line-soft)", padding: "18px" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 18 }}>
                    {/* Customer */}
                    <div>
                      <p style={{ margin: "0 0 8px", fontSize: 11, fontWeight: 700, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.07em" }}>Customer</p>
                      {order.customerName && (
                        <p style={{ margin: "0 0 4px", fontSize: 14, fontWeight: 500, color: "var(--color-text-primary)" }}>{order.customerName}</p>
                      )}
                      {order.customerEmail && (
                        <a
                          href={`mailto:${order.customerEmail}`}
                          style={{ fontSize: 13, color: "var(--color-violet-glow)", display: "inline-flex", alignItems: "center", gap: 5, textDecoration: "none" }}
                        >
                          <Mail size={12} /> {order.customerEmail}
                        </a>
                      )}
                    </div>

                    {/* Shipping */}
                    <div>
                      <p style={{ margin: "0 0 8px", fontSize: 11, fontWeight: 700, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.07em" }}>Ship To</p>
                      {order.shippingAddress ? (
                        <p style={{ margin: 0, fontSize: 13, color: "var(--color-text-muted)", lineHeight: 1.8, display: "flex", gap: 5 }}>
                          <MapPin size={12} style={{ marginTop: 3, flexShrink: 0 }} />
                          <span>
                            {order.shippingAddress.addressLine}<br />
                            {order.shippingAddress.city}, {order.shippingAddress.postalCode}<br />
                            {order.shippingAddress.country}
                          </span>
                        </p>
                      ) : (
                        <p style={{ margin: 0, fontSize: 13, color: "var(--color-text-muted)" }}>No shipping address provided</p>
                      )}
                    </div>
                  </div>

                  {/* Items */}
                  <div style={{ marginBottom: 16 }}>
                    <p style={{ margin: "0 0 8px", fontSize: 11, fontWeight: 700, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.07em" }}>Items Ordered</p>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {order.items.map((item, i) => (
                        <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13 }}>
                          <span style={{ color: "var(--color-text-secondary)" }}>
                            {item.name}
                            <span style={{ color: "var(--color-text-muted)", marginLeft: 6 }}>×{item.qty}</span>
                          </span>
                          <span style={{ color: "var(--color-text-primary)", fontWeight: 600 }}>
                            {fmtPrice((BigInt(item.price) * BigInt(item.qty)).toString(), order.currency)}
                          </span>
                        </div>
                      ))}
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, borderTop: "1px solid var(--color-line-soft)", paddingTop: 8, marginTop: 4 }}>
                        <span style={{ fontWeight: 600, color: "var(--color-text-secondary)" }}>Total</span>
                        <span style={{ fontWeight: 700, color: "var(--color-violet-glow)" }}>
                          {fmtPrice(order.totalAmount, order.currency)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Footer: tx link + action button */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
                    {order.txSignature ? (
                      <div style={{ padding: "8px 12px", background: "rgba(22,163,74,0.05)", border: "1px solid rgba(22,163,74,0.12)", borderRadius: 10, flex: 1, minWidth: 0 }}>
                        <p style={{ margin: 0, fontSize: 12, color: "var(--color-text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          Tx:{" "}
                          <a
                            href={`https://explorer.solana.com/tx/${order.txSignature}?cluster=devnet`}
                            target="_blank"
                            rel="noreferrer"
                            style={{ color: "var(--color-violet-glow)", fontFamily: "monospace" }}
                          >
                            {order.txSignature.slice(0, 14)}…{order.txSignature.slice(-10)}
                          </a>
                          <ExternalLink size={10} style={{ marginLeft: 4, verticalAlign: "middle", opacity: 0.6 }} />
                        </p>
                      </div>
                    ) : <div />}

                    {/* Mark as Delivered button */}
                    {!isDelivered ? (
                      <DButton
                        variant="primary"
                        size="sm"
                        icon={CheckCircle}
                        loading={marking === order.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          void markDelivered(order.id);
                        }}
                      >
                        Mark as Delivered
                      </DButton>
                    ) : (
                      <span style={{
                        display: "inline-flex", alignItems: "center", gap: 6,
                        fontSize: 13, fontWeight: 600, color: "#0369a1",
                      }}>
                        <CheckCircle size={14} />
                        Delivered {order.deliveredAt ? `· ${fmtDate(order.deliveredAt)}` : ""}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
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
  const [logoUploadError, setLogoUploadError] = useState("");
  const logoRef = useRef<HTMLInputElement>(null);

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    revokeBlobUrl(logoUrl);
    const localPreview = URL.createObjectURL(file);
    setLogoUrl(localPreview);
    setLogoUploading(true);
    setLogoUploadError("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await apiFetch("/api/v1/upload", { method: "POST", body: fd });
      const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
      if (res.ok && data.url) {
        revokeBlobUrl(localPreview);
        setLogoUrl(data.url);
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

  async function handleSave() {
    if (logoUploading) return;
    if (logoUrl?.startsWith("blob:")) {
      setLogoUploadError("Fix the logo upload error before saving");
      return;
    }
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
        revokeBlobUrl(logoUrl);
        setLogoUrl(updated.logoUrl ?? null);
        setStore((prev) => prev ? { ...prev, ...updated } : null);
        setSaved(true);
        setLogoUploadError("");
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
          {logoUploadError ? (
            <p style={{ color: "#ef4444", fontSize: 12, margin: "6px 0 0" }}>{logoUploadError}</p>
          ) : null}
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
            <code style={{ fontSize: 13, color: "var(--color-text-muted)", wordBreak: "break-all" }}>
              {getStorefrontPublicLabel(store.slug)}
            </code>
            <a href={getStorefrontHomeUrl(store.slug)} target="_blank" rel="noreferrer">
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
