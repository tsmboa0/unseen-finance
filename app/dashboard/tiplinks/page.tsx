"use client";

import { useState } from "react";
import {
  DPageHeader,
  DStatCard,
  DTable,
  DTabs,
  DBadge,
  DButton,
  DDrawer,
  DInput,
  DSelect,
  DCopyField,
  DEmptyState,
} from "@/components/dashboard/primitives";
import {
  tiplinks,
  giftCards,
  type Tiplink,
  type GiftCard,
} from "@/components/dashboard/mock-data";
import {
  formatCurrency,
  formatDate,
  formatRelativeTime,
} from "@/components/dashboard/formatters";
import { Gift, Link, Plus, Copy, Send } from "lucide-react";

type Tab = "tiplinks" | "giftcards";

export default function TiplinksPage() {
  const [activeTab, setActiveTab] = useState<Tab>("tiplinks");

  /* ── Tiplink drawer state ─────────────────────────── */
  const [tlDrawerOpen, setTlDrawerOpen] = useState(false);
  const [tlLabel, setTlLabel] = useState("");
  const [tlAmount, setTlAmount] = useState("");
  const [tlCurrency, setTlCurrency] = useState("USDC");
  const [tlDescription, setTlDescription] = useState("");
  const [tlCreating, setTlCreating] = useState(false);
  const [tlCreatedLink, setTlCreatedLink] = useState("");

  /* ── Gift card drawer state ───────────────────────── */
  const [gcDrawerOpen, setGcDrawerOpen] = useState(false);
  const [gcEmail, setGcEmail] = useState("");
  const [gcAmount, setGcAmount] = useState("");
  const [gcMessage, setGcMessage] = useState("");
  const [gcCreating, setGcCreating] = useState(false);
  const [gcCreatedCode, setGcCreatedCode] = useState("");

  /* ── Tiplink stats ────────────────────────────────── */
  const tlActive = tiplinks.filter((t) => t.status === "active").length;
  const tlClaimed = tiplinks.filter((t) => t.status === "claimed").length;
  const tlTotalValue = tiplinks.reduce((sum, t) => sum + t.amount, 0);

  /* ── Gift card stats ──────────────────────────────── */
  const gcActive = giftCards.filter((g) => g.status === "active").length;
  const gcRedeemed = giftCards.filter((g) => g.status === "redeemed").length;
  const gcTotalValue = giftCards.reduce((sum, g) => sum + g.amount, 0);

  /* ── Tiplink drawer handlers ──────────────────────── */
  function resetTlDrawer() {
    setTlLabel("");
    setTlAmount("");
    setTlCurrency("USDC");
    setTlDescription("");
    setTlCreating(false);
    setTlCreatedLink("");
  }

  function openTlDrawer() {
    resetTlDrawer();
    setTlDrawerOpen(true);
  }

  function closeTlDrawer() {
    setTlDrawerOpen(false);
    resetTlDrawer();
  }

  function handleCreateTiplink() {
    setTlCreating(true);
    setTimeout(() => {
      const slug = Math.random().toString(36).slice(2, 8);
      setTlCreatedLink(`unseen.fi/tl/${slug}`);
      setTlCreating(false);
    }, 1000);
  }

  /* ── Gift card drawer handlers ────────────────────── */
  function resetGcDrawer() {
    setGcEmail("");
    setGcAmount("");
    setGcMessage("");
    setGcCreating(false);
    setGcCreatedCode("");
  }

  function openGcDrawer() {
    resetGcDrawer();
    setGcDrawerOpen(true);
  }

  function closeGcDrawer() {
    setGcDrawerOpen(false);
    resetGcDrawer();
  }

  function handleCreateGiftCard() {
    setGcCreating(true);
    setTimeout(() => {
      const seg1 = Math.random().toString(36).slice(2, 6).toUpperCase();
      const seg2 = Math.random().toString(36).slice(2, 6).toUpperCase();
      setGcCreatedCode(`GFT-${seg1}-${seg2}`);
      setGcCreating(false);
    }, 1000);
  }

  /* ── Status badge helper ──────────────────────────── */
  function statusBadge(status: string) {
    const variant =
      status === "active" || status === "live"
        ? "success"
        : status === "claimed" || status === "redeemed"
          ? "violet"
          : "muted";
    return (
      <DBadge variant={variant} dot>
        {status}
      </DBadge>
    );
  }

  /* ── Table columns ────────────────────────────────── */
  const tiplinkColumns = [
    { key: "label", header: "Label", render: (r: Tiplink) => r.label },
    {
      key: "amount",
      header: "Amount",
      align: "right" as const,
      render: (r: Tiplink) => formatCurrency(r.amount, r.currency),
    },
    {
      key: "status",
      header: "Status",
      render: (r: Tiplink) => statusBadge(r.status),
    },
    {
      key: "link",
      header: "Link",
      hideOnMobile: true,
      render: (r: Tiplink) => <DCopyField value={r.url} />,
    },
    {
      key: "created",
      header: "Created",
      hideOnMobile: true,
      render: (r: Tiplink) => formatRelativeTime(r.createdAt),
    },
  ];

  const giftCardColumns = [
    { key: "recipient", header: "Recipient", render: (r: GiftCard) => r.recipient },
    {
      key: "amount",
      header: "Amount",
      align: "right" as const,
      render: (r: GiftCard) => formatCurrency(r.amount, r.currency),
    },
    {
      key: "status",
      header: "Status",
      render: (r: GiftCard) => statusBadge(r.status),
    },
    {
      key: "code",
      header: "Code",
      hideOnMobile: true,
      render: (r: GiftCard) => <DCopyField value={r.code} />,
    },
    {
      key: "created",
      header: "Created",
      hideOnMobile: true,
      render: (r: GiftCard) => formatRelativeTime(r.createdAt),
    },
  ];

  return (
    <>
      <DPageHeader
        title="Tiplinks & Gift Cards"
        description="Send value anonymously. Gift privately."
      />

      <DTabs
        items={[
          { id: "tiplinks", label: "Tiplinks", count: tiplinks.length },
          { id: "giftcards", label: "Gift Cards", count: giftCards.length },
        ]}
        active={activeTab}
        onChange={(id) => setActiveTab(id as Tab)}
      />

      {/* ── Tiplinks tab ──────────────────────────────── */}
      {activeTab === "tiplinks" && (
        <>
          <div className="d-stat-row">
            <DStatCard icon={Link} label="Active" value={String(tlActive)} />
            <DStatCard icon={Copy} label="Claimed" value={String(tlClaimed)} />
            <DStatCard
              icon={Gift}
              label="Total Value"
              value={formatCurrency(tlTotalValue, "USDC")}
            />
          </div>

          <div className="d-section-actions">
            <DButton icon={Plus} onClick={openTlDrawer}>
              Create Tiplink
            </DButton>
          </div>

          <DTable
            columns={tiplinkColumns}
            data={tiplinks}
            emptyTitle="No tiplinks yet"
            emptyDescription="Create your first tiplink to send value anonymously."
          />

          <DDrawer open={tlDrawerOpen} onClose={closeTlDrawer} title="Create Tiplink">
            {tlCreatedLink ? (
              <div className="d-drawer-success">
                <p className="d-drawer-success__msg">Tiplink created successfully!</p>
                <DCopyField label="Share this link" value={tlCreatedLink} />
                <div style={{ marginTop: 16 }}>
                  <DButton variant="secondary" onClick={closeTlDrawer}>Done</DButton>
                </div>
              </div>
            ) : (
              <div className="d-drawer-form">
                <DInput label="Label" value={tlLabel} onChange={setTlLabel} placeholder="e.g. Hackathon prize" />
                <DInput label="Amount" value={tlAmount} onChange={setTlAmount} type="number" placeholder="0.00" />
                <DSelect label="Currency" value={tlCurrency} onChange={setTlCurrency}
                  options={[{ value: "USDC", label: "USDC" }, { value: "SOL", label: "SOL" }]} />
                <DInput label="Description" value={tlDescription} onChange={setTlDescription} placeholder="Optional note for yourself" />
                <DButton onClick={handleCreateTiplink} loading={tlCreating} disabled={!tlLabel || !tlAmount}>
                  Create Tiplink
                </DButton>
              </div>
            )}
          </DDrawer>
        </>
      )}

      {/* ── Gift Cards tab ────────────────────────────── */}
      {activeTab === "giftcards" && (
        <>
          <div className="d-stat-row">
            <DStatCard icon={Gift} label="Active" value={String(gcActive)} />
            <DStatCard icon={Copy} label="Redeemed" value={String(gcRedeemed)} />
            <DStatCard
              icon={Send}
              label="Total Value"
              value={formatCurrency(gcTotalValue, "USDC")}
            />
          </div>

          <div className="d-section-actions">
            <DButton icon={Plus} onClick={openGcDrawer}>
              Send Gift Card
            </DButton>
          </div>

          <DTable
            columns={giftCardColumns}
            data={giftCards}
            emptyTitle="No gift cards yet"
            emptyDescription="Send your first gift card."
          />

          <DDrawer open={gcDrawerOpen} onClose={closeGcDrawer} title="Send Gift Card">
            {gcCreatedCode ? (
              <div className="d-drawer-success">
                <p className="d-drawer-success__msg">Gift card created!</p>
                <DCopyField label="Gift card code" value={gcCreatedCode} />
                <div style={{ marginTop: 16 }}>
                  <DButton variant="secondary" onClick={closeGcDrawer}>Done</DButton>
                </div>
              </div>
            ) : (
              <div className="d-drawer-form">
                <DInput label="Recipient Email" value={gcEmail} onChange={setGcEmail} placeholder="e.g. priya@team.xyz" />
                <DInput label="Amount" value={gcAmount} onChange={setGcAmount} type="number" placeholder="0.00" />
                <DInput label="Message" value={gcMessage} onChange={setGcMessage} placeholder="Optional personal message" />
                <DButton onClick={handleCreateGiftCard} loading={gcCreating} disabled={!gcEmail || !gcAmount}>
                  Send Gift Card
                </DButton>
              </div>
            )}
          </DDrawer>
        </>
      )}
    </>
  );
}
