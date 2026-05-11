"use client";

import { useCallback, useMemo, useState, useEffect } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { getSolBalance, getTokenBalance } from "@/lib/solana";
import { DBadge, DButton, DModal, DInput, DSelect } from "@/components/dashboard/primitives";
type UTXO = {
  id: string;
  amount: number;
  currency: "SOL" | "USDC" | "USDT";
  usdValue: number;
  age: string;
  sender: string;
  status: "claimable" | "claiming" | "claimed";
};
import { formatCurrency } from "@/components/dashboard/formatters";
import { useUmbraPrivateActions } from "@/hooks/use-umbra-private-actions";
import { useDashboardOverview } from "@/hooks/use-dashboard-overview";
import {
  ArrowDown,
  ArrowDownToLine,
  Clock,
  Eye,
  EyeOff,
  Send,
  Shield,
  ShieldCheck,
  Unlock,
  User2,
  Wallet,
} from "lucide-react";

type BalanceTab = "public" | "private";

const tabs: Array<{ id: BalanceTab; label: string; description: string }> = [
  { id: "public", label: "Public", description: "Visible treasury" },
  { id: "private", label: "Private", description: "Shielded funds" },
];

function buildHistorySeries(args: {
  points: Array<{ inflow: number; outflow: number; shielded: number }>;
  currentTotal: number;
  mode: BalanceTab;
}): number[] {
  const { points, currentTotal, mode } = args;
  const N = 30; // number of data points to display

  // Use daily activity values (not cumulative).
  // This means any transaction on any day creates a visible spike,
  // regardless of wallet balance.
  const raw = points.map((p) =>
    mode === "public"
      ? p.inflow + p.outflow   // show total daily activity volume
      : p.shielded,
  );

  // Pad the left with zeros so recent data always sits on the right side.
  const padded: number[] =
    raw.length >= N
      ? raw.slice(-N)
      : [...Array(N - raw.length).fill(0), ...raw];

  const hasActivity = padded.some((v) => v > 0);

  if (!hasActivity) {
    // No transaction records yet.
    // Return a placeholder value > 0 so the chart renders a centered
    // flat line instead of the bottom-of-chart artefact.
    const base = Math.max(currentTotal, 1);
    return padded.map(() => base);
  }

  return padded;
}

function BalanceLineChart({ data, mode }: { data: number[]; mode: BalanceTab }) {
  const width = 420;
  const height = 96;
  const pad = 10;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const isFlat = max === min;
  // When all values are equal, give a small artificial span so the line
  // renders at the vertical midpoint rather than the bottom of the chart.
  const span = isFlat ? Math.max(max, 1) : max - min;
  const step = (width - pad * 2) / Math.max(data.length - 1, 1);
  const midY = pad + (height - pad * 2) / 2;
  const points = data.map((value, index) => {
    const x = pad + index * step;
    // If all values are the same, draw the line at the vertical centre.
    const y = isFlat
      ? midY
      : pad + (1 - (value - min) / span) * (height - pad * 2);
    return [x, y] as const;
  });
  const linePath = points.reduce((path, [x, y], index) => {
    if (index === 0) return `M ${x} ${y}`;
    const [prevX, prevY] = points[index - 1];
    const cp1x = prevX + (x - prevX) * 0.42;
    const cp2x = prevX + (x - prevX) * 0.58;
    return `${path} C ${cp1x} ${prevY}, ${cp2x} ${y}, ${x} ${y}`;
  }, "");
  const lastPoint = points[points.length - 1];
  const firstPoint = points[0];
  const areaPath = `${linePath} L ${lastPoint[0]} ${height - pad} L ${firstPoint[0]} ${height - pad} Z`;
  const gradientId = `balance-area-${mode}`;

  return (
    <div className="balance-card__chart" aria-label={`${mode} balance history`} role="img">
      <svg className="balance-card__chart-svg" preserveAspectRatio="none" viewBox={`0 0 ${width} ${height}`}>
        <defs>
          <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="var(--balance-chart)" stopOpacity="0.28" />
            <stop offset="100%" stopColor="var(--balance-chart)" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75].map((line) => (
          <line
            key={line}
            stroke="var(--balance-grid)"
            strokeDasharray="4 7"
            strokeWidth="1"
            x1="10"
            x2={width - 10}
            y1={height * line}
            y2={height * line}
          />
        ))}
        <path d={areaPath} fill={`url(#${gradientId})`} />
        <path d={linePath} fill="none" stroke="var(--balance-chart)" strokeLinecap="round" strokeWidth="3" />
        <circle cx={lastPoint[0]} cy={lastPoint[1]} fill="var(--balance-chart)" r="4" />
        <circle cx={lastPoint[0]} cy={lastPoint[1]} fill="rgba(255,255,255,0.9)" r="2" />
      </svg>
      <div className="balance-card__chart-axis" aria-hidden="true">
        <span>30d ago</span>
        <span>Today</span>
      </div>
    </div>
  );
}

export function BalanceCard() {
  const { user } = usePrivy();
  const { data: overviewData } = useDashboardOverview();
  const [activeTab, setActiveTab] = useState<BalanceTab>("public");
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [showAmounts, setShowAmounts] = useState(true);
  const [utxoModalOpen, setUtxoModalOpen] = useState(false);

  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [transferAddress, setTransferAddress] = useState("");
  const [transferAmount, setTransferAmount] = useState("");
  const [transferCurrency, setTransferCurrency] = useState("USDC");
  const [publicTransferMode, setPublicTransferMode] = useState<"normal" | "utxo">("normal");
  const [privateTransferMode, setPrivateTransferMode] = useState<"encrypted" | "utxo">("utxo");
  const [isTransferring, setIsTransferring] = useState(false);

  const [shieldModalOpen, setShieldModalOpen] = useState(false);
  const [shieldAmount, setShieldAmount] = useState("");
  const [shieldCurrency, setShieldCurrency] = useState("USDC");
  const [isShielding, setIsShielding] = useState(false);
  const [realBalances, setRealBalances] = useState([
    { currency: "SOL", amount: 0, usdValue: 0 },
    { currency: "USDC", amount: 0, usdValue: 0 },
    { currency: "USDT", amount: 0, usdValue: 0 },
  ]);
  const [localActionError, setLocalActionError] = useState<string | null>(null);

  const {
    privateBalances,
    utxos,
    canUseUmbraActions,
    syncingPrivateBalances,
    syncingClaimableUtxos,
    actionError,
    setActionError,
    shieldFromPublic,
    unshieldToPublic,
    transferFromPrivate,
    transferFromPublic,
    claimOne,
    claimAll,
  } = useUmbraPrivateActions();

  const walletAddress = user?.wallet?.address;

  const fetchBalances = useCallback(async () => {
    if (!walletAddress) return;
    const USDC_MINT = "4oG4sjmopf5MzvTHLE8rpVJ2uyczxfsw2K84SUTpNDx7";
    const USDT_MINT = "DXQwBNGgyQ2BzGWxEriJPVmXYFQBsQbXvfvfSNTaJkL6";
    const [sol, usdc, usdt] = await Promise.all([
      getSolBalance(walletAddress),
      getTokenBalance(walletAddress, USDC_MINT),
      getTokenBalance(walletAddress, USDT_MINT),
    ]);
    const solPrice = 170;
    setRealBalances([
      { currency: "SOL", amount: sol, usdValue: sol * solPrice },
      { currency: "USDC", amount: usdc, usdValue: usdc },
      { currency: "USDT", amount: usdt, usdValue: usdt },
    ]);
  }, [walletAddress]);

  // Poll on-chain balances every 15s
  useEffect(() => {
    void fetchBalances();
    const interval = setInterval(() => void fetchBalances(), 15_000);
    return () => clearInterval(interval);
  }, [fetchBalances]);

  // Also re-fetch immediately whenever an action changes balances (claim, shield, unshield)
  // This avoids waiting up to 15s for the balance to reflect the change.
  useEffect(() => {
    const onBalanceRefresh = () => void fetchBalances();
    window.addEventListener("balance:refresh", onBalanceRefresh);
    return () => window.removeEventListener("balance:refresh", onBalanceRefresh);
  }, [fetchBalances]);

  useEffect(() => {
    if (activeTab === "public" && publicTransferMode === "utxo" && transferCurrency === "SOL") {
      setTransferCurrency("USDC");
    }
  }, [activeTab, publicTransferMode, transferCurrency]);

  const balances = activeTab === "public" ? realBalances : privateBalances;
  const totalUsd = balances.reduce((sum, b) => sum + b.usdValue, 0);
  const history = useMemo(
    () =>
      buildHistorySeries({
        points: overviewData?.overview.volume30d ?? [],
        currentTotal: totalUsd,
        mode: activeTab,
      }),
    [activeTab, overviewData?.overview.volume30d, totalUsd],
  );
  const previousValue = history[history.length - 2] ?? totalUsd;
  const trendDelta = totalUsd - previousValue;
  const trendPercent = previousValue > 0 ? (trendDelta / previousValue) * 100 : 0;
  const claimableUtxos = utxos.filter((u) => u.status === "claimable");
  const pendingUtxos = utxos;
  const claimableTotal = claimableUtxos.reduce((sum, u) => sum + u.usdValue, 0);
  const privateSol = balances.find((b) => b.currency === "SOL")?.amount ?? 0;

  const publicStats = useMemo(
    () => [
      {
        label: "Send tokens",
        value: "Transfer",
        detail: "Send public tokens",
        icon: Send,
        action: true,
      },
      {
        label: "Shield tokens",
        value: "Hide",
        detail: "Move to private balance",
        icon: Shield,
        action: true,
      },
      {
        label: "Receive",
        value: "Deposit",
        detail: "Show public address",
        icon: ArrowDown,
        action: true,
      },
    ],
    [],
  );

  const privateStats = useMemo(
    () => [
      {
        label: "Unclaimed UTXOs",
        value: claimableUtxos.length.toString(),
        detail: claimableUtxos.length > 0 ? formatCurrency(claimableTotal, "USDC") : "Nothing pending",
        icon: ArrowDownToLine,
        action: true,
      },
      {
        label: "Send UTXO",
        value: "Transfer",
        detail: "Send shielded tokens",
        icon: Send,
        action: true,
      },
      {
        label: "UnShield tokens",
        value: "Reveal",
        detail: "Move to public balance",
        icon: Unlock,
        action: true,
      },
    ],
    [claimableTotal, claimableUtxos.length],
  );

  async function handleClaim(utxoId: string) {
    setClaimingId(utxoId);
    try {
      await claimOne(utxoId);
    } finally {
      setClaimingId(null);
    }
  }

  async function handleClaimAll() {
    setClaimingId("all");
    try {
      await claimAll();
    } finally {
      setClaimingId(null);
    }
  }

  async function handleTransfer() {
    setIsTransferring(true);
    setLocalActionError(null);
    setActionError(null);
    try {
      if (activeTab === "private") {
        if (!canUseUmbraActions) {
          throw new Error("Complete Umbra registration and ensure wallet is synced before private transfers.");
        }
        await transferFromPrivate({
          currency: transferCurrency as "USDC" | "USDT" | "SOL",
          amount: transferAmount,
          destinationAddress: transferAddress,
          transferType: privateTransferMode,
        });
      } else {
        await transferFromPublic({
          currency: transferCurrency as "USDC" | "USDT" | "SOL",
          amount: transferAmount,
          destinationAddress: transferAddress,
          transferMode: publicTransferMode,
        });
      }

      setTransferModalOpen(false);
      setTransferAddress("");
      setTransferAmount("");
    } catch (e) {
      setLocalActionError(e instanceof Error ? e.message : "Transfer failed.");
    } finally {
      setIsTransferring(false);
    }
  }

  async function handleShield() {
    setIsShielding(true);
    setLocalActionError(null);
    setActionError(null);
    try {
      if (!canUseUmbraActions) {
        throw new Error("Complete Umbra registration and ensure wallet is synced before shielding.");
      }
      if (activeTab === "public") {
        await shieldFromPublic(shieldCurrency as "USDC" | "USDT" | "SOL", shieldAmount);
      } else {
        await unshieldToPublic(shieldCurrency as "USDC" | "USDT" | "SOL", shieldAmount);
      }

      setShieldModalOpen(false);
      setShieldAmount("");
    } catch (e) {
      setLocalActionError(e instanceof Error ? e.message : "Shield action failed.");
    } finally {
      setIsShielding(false);
    }
  }

  const mask = (val: string) => (showAmounts ? val : "••••••");
  const totalAmount = totalUsd.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const currentTransferBalance = balances.find((b) => b.currency === transferCurrency)?.amount || 0;
  const transferAmountNum = parseFloat(transferAmount) || 0;
  const transferError = transferAmountNum > currentTransferBalance ? "Amount exceeds available balance" : "";

  const currentShieldBalance = balances.find((b) => b.currency === shieldCurrency)?.amount || 0;
  const shieldAmountNum = parseFloat(shieldAmount) || 0;
  const shieldError = shieldAmountNum > currentShieldBalance ? "Amount exceeds available balance" : "";

  const handleCloseTransferModal = () => {
    setTransferModalOpen(false);
    setLocalActionError(null);
    setActionError(null);
  };

  const handleCloseShieldModal = () => {
    setShieldModalOpen(false);
    setLocalActionError(null);
    setActionError(null);
  };

  const handleCloseUtxoModal = () => {
    setUtxoModalOpen(false);
    setLocalActionError(null);
    setActionError(null);
  };

  return (
    <div className={`balance-card balance-card--${activeTab}`}>
      <div className="balance-card__glow" aria-hidden="true" />

      <div className="balance-card__header">
        <div className="balance-card__title-row">
          <div className="balance-card__icon">
            <Wallet size={16} aria-hidden="true" />
          </div>
          <div>
            <h3 className="balance-card__title">Balance</h3>
            <p className="balance-card__subtitle">Public and private liquidity</p>
          </div>
        </div>
        <div className="balance-card__header-controls">
          <div className="balance-card__tabs" role="tablist" aria-label="Balance visibility">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  aria-label={`${tab.label}: ${tab.description}`}
                  aria-selected={isActive}
                  className={`balance-card__tab ${isActive ? "is-active" : ""}`}
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  role="tab"
                  type="button"
                >
                  <span>{tab.label}</span>
                  <small>{tab.description}</small>
                </button>
              );
            })}
          </div>
          <button
            aria-label={showAmounts ? "Hide amounts" : "Show amounts"}
            aria-pressed={!showAmounts}
            className="balance-card__eye"
            onClick={() => setShowAmounts(!showAmounts)}
            title={showAmounts ? "Hide amounts" : "Show amounts"}
            type="button"
          >
            {showAmounts ? <Eye size={16} aria-hidden="true" /> : <EyeOff size={16} aria-hidden="true" />}
          </button>
        </div>
      </div>

      <div className="balance-card__hero">
        <div className="balance-card__total">
          <span className="balance-card__total-label">
            {activeTab === "public" ? "Public balance" : "Private balance"}
          </span>
          <span className="balance-card__total-amount">
            {showAmounts ? (
              <>
                {totalAmount}
                <span className="balance-card__total-unit">USDC</span>
              </>
            ) : (
              mask(totalAmount)
            )}
          </span>
          <div className="balance-card__status-row">
            <DBadge variant={activeTab === "public" ? "muted" : "violet"} dot>
              {activeTab === "public" ? "On-chain visible" : "ZK-shielded"}
            </DBadge>
            <span className="balance-card__trend">
              {trendDelta >= 0 ? "+" : ""}{formatCurrency(trendDelta, "USDC")} ({trendPercent >= 0 ? "+" : ""}{trendPercent.toFixed(1)}%)
            </span>
          </div>
        </div>

        <BalanceLineChart data={history} mode={activeTab} />
      </div>

      <div className="balance-card__tokens" aria-label={`${activeTab} token balances`}>
        {balances.map((b) => (
          <div className="balance-card__token-row" key={b.currency}>
            <div className="balance-card__token-left">
              <span className={`balance-card__token-icon balance-card__token-icon--${b.currency.toLowerCase()}`}>
                {b.currency === "SOL" ? "◎" : "$"}
              </span>
              <div>
                <span className="balance-card__token-name">{b.currency}</span>
                <span className="balance-card__token-sub">
                  {mask(b.amount.toLocaleString("en-US", { maximumFractionDigits: 3 }))}
                </span>
              </div>
            </div>
            <span className="balance-card__token-usd">{mask(formatCurrency(b.usdValue, "USDC"))}</span>
          </div>
        ))}
      </div>

      <div className="balance-card__private-stats" aria-label={`${activeTab} balance details`}>
        {(activeTab === "private" ? privateStats : publicStats).map((stat) => {
          const Icon = stat.icon;
          if (stat.action) {
            let onClickHandler;
            if (stat.label === "Unclaimed UTXOs") onClickHandler = () => setUtxoModalOpen(true);
            else if (stat.label === "Send tokens" || stat.label === "Send UTXO") onClickHandler = () => setTransferModalOpen(true);
            else if (stat.label === "Shield tokens" || stat.label === "UnShield tokens") onClickHandler = () => setShieldModalOpen(true);

            return (
              <button
                className="balance-card__micro balance-card__micro--button"
                key={stat.label}
                onClick={onClickHandler}
                type="button"
              >
                <Icon size={15} aria-hidden="true" />
                <span>
                  {stat.label === "Unclaimed UTXOs" && syncingClaimableUtxos ? (
                    <strong style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{
                        animation: "spin 0.7s linear infinite",
                        border: "2px solid var(--balance-border)",
                        borderTopColor: "var(--balance-ink)",
                        borderRadius: "50%",
                        display: "inline-block",
                        height: "12px",
                        width: "12px",
                      }} />
                      Scanning...
                    </strong>
                  ) : (
                    <strong>{stat.value}</strong>
                  )}
                  <small>{stat.label}</small>
                </span>
                <em>{stat.label === "Unclaimed UTXOs" && syncingClaimableUtxos ? "Please wait" : stat.detail}</em>
              </button>
            );
          }

          return (
            <div className="balance-card__micro" key={stat.label}>
              <Icon size={15} aria-hidden="true" />
              <span>
                <strong>{stat.value}</strong>
                <small>{stat.label}</small>
              </span>
              <em>{stat.detail}</em>
            </div>
          );
        })}
      </div>
      {(actionError || localActionError) && activeTab === "private" ? (
        <div className="dash-umbra-modal__error" style={{ margin: "8px 22px 0" }}>
          {localActionError ?? actionError}
        </div>
      ) : null}
      {/* {syncingPrivateBalances && activeTab === "private" ? (
        <div style={{ margin: "8px 22px 0", fontSize: 12, color: "var(--color-text-muted)" }}>
          Syncing private balances...
        </div>
      ) : null} */}

      <DModal open={utxoModalOpen} onClose={handleCloseUtxoModal} title="Unclaimed UTXOs" wide>
        <div className="balance-card__modal-summary">
          <div>
            <span>Claimable value</span>
            <strong>{mask(formatCurrency(claimableTotal, "USDC"))}</strong>
          </div>
          <DButton
            className="balance-card__claim-all-btn"
            disabled={claimableUtxos.length === 0 || claimingId !== null}
            icon={ArrowDownToLine}
            loading={claimingId === "all"}
            onClick={handleClaimAll}
            size="sm"
            variant="primary"
          >
            Claim all
          </DButton>
        </div>

        {pendingUtxos.length === 0 ? (
          <div className="balance-card__utxo-empty">
            <ShieldCheck size={24} aria-hidden="true" />
            <span>All UTXOs claimed</span>
            <small>New private deposits will appear here when they are ready.</small>
          </div>
        ) : (
          <div className="balance-card__utxo-list">
            {pendingUtxos.map((u) => (
              <div className="balance-card__utxo-row" key={u.id}>
                <div className="balance-card__utxo-left">
                  <div className="balance-card__utxo-amount">
                    <span className="balance-card__utxo-val">
                      {mask(`${u.amount.toLocaleString("en-US")} ${u.currency}`)}
                    </span>
                    <span className="balance-card__utxo-usd">≈ {mask(formatCurrency(u.usdValue, "USDC"))}</span>
                  </div>
                  <div className="balance-card__utxo-meta">
                    <span><User2 size={11} aria-hidden="true" /> {u.sender}</span>
                    <span><Clock size={11} aria-hidden="true" /> {u.age}</span>
                  </div>
                </div>
                <div
                  className="balance-card__utxo-actions balance-card__tooltip-wrapper"
                  data-tooltip="Claims this UTXO into your encrypted private balance."
                  style={{ display: "flex", gap: "8px" }}
                >
                  <DButton
                    disabled={
                      u.status === "claimed" ||
                      u.status === "claiming" ||
                      (claimingId !== null && claimingId !== u.id)
                    }
                    loading={u.status === "claiming"}
                    onClick={() => handleClaim(u.id)}
                    size="sm"
                    variant={u.status === "claimed" ? "secondary" : "primary"}
                  >
                    {u.status === "claiming" ? "Claiming..." : u.status === "claimed" ? "Claimed ✓" : "Claim to private"}
                  </DButton>
                </div>
              </div>
            ))}
          </div>
        )}
      </DModal>

      <DModal open={transferModalOpen} onClose={handleCloseTransferModal} title="Transfer Tokens">
        <div style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 8 }}>
          <DSelect
            label="Transfer type"
            value={activeTab === "public" ? publicTransferMode : privateTransferMode}
            onChange={(val) => {
              if (activeTab === "public") setPublicTransferMode(val as "normal" | "utxo");
              else setPrivateTransferMode(val as "encrypted" | "utxo");
            }}
            options={
              activeTab === "public"
                ? [
                  { value: "normal", label: "Normal (visible SPL / SOL transfer)" },
                  { value: "utxo", label: "Send privately (receiver claims UTXO)" },
                ]
                : [
                  {
                    value: "encrypted",
                    label: "Confidential (encrypted balance → encrypted balance)",
                  },
                  {
                    value: "utxo",
                    label: "Send privately from shielded balance (receiver claims UTXO)",
                  },
                ]
            }
          />
          {activeTab === "private" && privateTransferMode === "encrypted" ? (
            <p style={{ fontSize: 12, color: "var(--color-text-muted)", margin: 0 }}>
              ETA→ETA transfers are not available in the bundled Umbra SDK yet. Choose “receiver claims UTXO” or you’ll
              see an error when sending.
            </p>
          ) : null}
          {activeTab === "public" && publicTransferMode === "utxo" ? (
            <p style={{ fontSize: 12, color: "var(--color-text-muted)", margin: 0 }}>
              Requires Umbra registration. USDC/USDT only — sends through the mixer as a receiver-claimable UTXO.
            </p>
          ) : null}
          <DInput
            label="Destination Address"
            placeholder="Solana address or .sol domain"
            value={transferAddress}
            onChange={setTransferAddress}
          />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 120px", gap: 12 }}>
            <DInput
              label="Amount"
              placeholder="0.00"
              value={transferAmount}
              onChange={setTransferAmount}
              type="number"
            />
            <DSelect
              label="Asset"
              value={transferCurrency}
              onChange={setTransferCurrency}
              options={
                activeTab === "public" && publicTransferMode === "utxo"
                  ? [
                    { value: "USDC", label: "USDC" },
                    { value: "USDT", label: "USDT" },
                  ]
                  : [
                    { value: "USDC", label: "USDC" },
                    { value: "USDT", label: "USDT" },
                    { value: "SOL", label: "SOL" },
                  ]
              }
            />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12, color: "var(--color-text-muted)" }}>
            <span>Available: {currentTransferBalance.toLocaleString("en-US", { maximumFractionDigits: 4 })} {transferCurrency}</span>
          </div>
          {transferError && <div className="dash-umbra-modal__error" style={{ marginTop: 0 }}>{transferError}</div>}
          {(actionError || localActionError) && (
            <div className="dash-umbra-modal__error" style={{ marginTop: 0 }}>
              {localActionError ?? actionError}
            </div>
          )}
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
            <DButton
              disabled={isTransferring || !transferAddress || !transferAmount || !!transferError}
              loading={isTransferring}
              onClick={handleTransfer}
              variant="primary"
            >
              Send {transferCurrency}
            </DButton>
          </div>
        </div>
      </DModal>

      <DModal open={shieldModalOpen} onClose={handleCloseShieldModal} title={activeTab === "public" ? "Shield Tokens" : "UnShield Tokens"}>
        <div style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 8 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 120px", gap: 12 }}>
            <DInput
              label="Amount"
              placeholder="0.00"
              value={shieldAmount}
              onChange={setShieldAmount}
              type="number"
            />
            <DSelect
              label="Asset"
              value={shieldCurrency}
              onChange={setShieldCurrency}
              options={[
                { value: "USDC", label: "USDC" },
                { value: "USDT", label: "USDT" },
                { value: "SOL", label: "SOL" }
              ]}
            />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12, color: "var(--color-text-muted)" }}>
            <span>Available: {currentShieldBalance.toLocaleString("en-US", { maximumFractionDigits: 4 })} {shieldCurrency}</span>
          </div>
          {shieldError && <div className="dash-umbra-modal__error" style={{ marginTop: 0 }}>{shieldError}</div>}
          {(actionError || localActionError) && (
            <div className="dash-umbra-modal__error" style={{ marginTop: 0 }}>
              {localActionError ?? actionError}
            </div>
          )}
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
            <DButton
              disabled={isShielding || !shieldAmount || !!shieldError}
              loading={isShielding}
              onClick={handleShield}
              variant="primary"
            >
              {activeTab === "public" ? "Shield" : "UnShield"} {shieldCurrency}
            </DButton>
          </div>
        </div>
      </DModal>

      <style>{balanceCardCSS}</style>
    </div>
  );
}

const balanceCardCSS = `
.balance-card {
  --balance-ink: var(--color-text-primary);
  --balance-muted: var(--color-text-secondary);
  --balance-subtle: var(--color-text-muted);
  --balance-panel: rgba(255, 255, 255, 0.055);
  --balance-panel-strong: rgba(255, 255, 255, 0.09);
  --balance-border: rgba(168, 85, 247, 0.18);
  --balance-border-soft: rgba(240, 236, 255, 0.1);
  --balance-chart: #7b2fff;
  --balance-grid: rgba(240, 236, 255, 0.1);
  --balance-hover: rgba(255, 255, 255, 0.1);
  --balance-icon-bg: linear-gradient(135deg, rgba(123, 47, 255, 0.2), rgba(255, 255, 255, 0.06));
  --balance-unit: rgba(240, 236, 255, 0.58);
  --balance-trend: #c4b5fd;
  background:
    linear-gradient(135deg, rgba(13, 9, 32, 0.96) 0%, rgba(17, 12, 40, 0.94) 48%, rgba(38, 20, 74, 0.82) 100%);
  border: 1px solid var(--balance-border);
  border-radius: 24px;
  box-shadow: 0 24px 70px rgba(0, 0, 0, 0.32);
  color: var(--balance-ink);
  display: flex;
  flex-direction: column;
  gap: 0;
  min-width: 320px;
  overflow: hidden;
  padding: 0;
  position: relative;
}

[data-theme="light"] .balance-card {
  --balance-ink: #21152f;
  --balance-muted: rgba(48, 31, 67, 0.64);
  --balance-subtle: rgba(48, 31, 67, 0.54);
  --balance-panel: rgba(255, 255, 255, 0.42);
  --balance-panel-strong: rgba(255, 255, 255, 0.82);
  --balance-border: rgba(88, 52, 131, 0.1);
  --balance-border-soft: rgba(88, 52, 131, 0.1);
  --balance-grid: rgba(63, 32, 92, 0.12);
  --balance-hover: rgba(255, 255, 255, 0.72);
  --balance-icon-bg: linear-gradient(135deg, rgba(123, 47, 255, 0.14), rgba(255, 255, 255, 0.72));
  --balance-unit: rgba(48, 31, 67, 0.58);
  --balance-trend: #4f2a74;
  background:
    linear-gradient(135deg, rgba(255, 255, 255, 0.96) 0%, rgba(250, 247, 255, 0.9) 45%, rgba(236, 224, 255, 0.82) 100%);
  border-color: rgba(126, 87, 194, 0.2);
  box-shadow: 0 24px 70px rgba(50, 28, 88, 0.14);
}

.balance-card--private {
  --balance-chart: #6d28d9;
}

.balance-card__glow {
  background: radial-gradient(circle at 82% 8%, rgba(124, 58, 237, 0.18), transparent 34%);
  inset: 0;
  pointer-events: none;
  position: absolute;
}

.balance-card__header,
.balance-card__tabs,
.balance-card__hero,
.balance-card__tokens,
.balance-card__private-stats {
  position: relative;
  z-index: 1;
}

.balance-card__header {
  align-items: center;
  display: flex;
  gap: 12px;
  justify-content: space-between;
  padding: 16px 18px 10px;
}

.balance-card__title-row {
  align-items: center;
  display: flex;
  gap: 10px;
  min-width: 0;
}

.balance-card__icon {
  align-items: center;
  background: var(--balance-icon-bg);
  border: 1px solid var(--balance-border);
  border-radius: 11px;
  color: #6d28d9;
  display: flex;
  height: 34px;
  justify-content: center;
  width: 34px;
}

.balance-card__title {
  color: var(--balance-ink);
  font-size: 15px;
  font-weight: 800;
  letter-spacing: -0.02em;
  margin: 0;
}

.balance-card__subtitle {
  color: var(--balance-muted);
  font-size: 12px;
  margin: 1px 0 0;
}

.balance-card__header-controls {
  align-items: center;
  display: flex;
  flex-shrink: 0;
  gap: 8px;
}

.balance-card__eye {
  align-items: center;
  background: var(--balance-panel);
  border: 1px solid var(--balance-border);
  border-radius: 12px;
  color: var(--balance-muted);
  cursor: pointer;
  display: flex;
  height: 34px;
  justify-content: center;
  padding: 0;
  width: 34px;
}

.balance-card__tabs {
  background: var(--balance-panel);
  border: 1px solid var(--balance-border);
  border-radius: 999px;
  display: grid;
  gap: 3px;
  grid-template-columns: repeat(2, 1fr);
  margin: 0;
  padding: 3px;
}

.balance-card__tab {
  background: transparent;
  border: 0;
  border-radius: 999px;
  color: var(--balance-muted);
  cursor: pointer;
  min-height: 28px;
  min-width: 66px;
  padding: 5px 10px;
  text-align: center;
}

.balance-card__tab span,
.balance-card__tab small {
  display: block;
}

.balance-card__tab span {
  color: inherit;
  font-size: 12px;
  font-weight: 800;
}

.balance-card__tab small {
  display: none;
  color: var(--balance-subtle);
  font-size: 11px;
  margin-top: 2px;
}

.balance-card__tab.is-active {
  background: var(--balance-panel-strong);
  box-shadow: 0 10px 24px rgba(61, 30, 102, 0.1);
  color: var(--balance-ink);
}

.balance-card__hero {
  align-items: stretch;
  display: grid;
  gap: 14px;
  /* chart takes remaining space; total pane has a min so it doesn't shrink too small */
  grid-template-columns: minmax(160px, 0.7fr) minmax(0, 1fr);
  padding: 0 18px 12px;
}

.balance-card__total {
  align-items: flex-start;
  display: flex;
  flex-direction: column;
  gap: 7px;
  justify-content: center;
  margin-bottom: 0;
}

.balance-card__total-label {
  color: var(--balance-muted);
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.balance-card__total-amount {
  align-items: baseline;
  color: var(--balance-ink);
  display: inline-flex;
  gap: 8px;
  font-size: clamp(28px, 3.1vw, 36px);
  font-variant-numeric: tabular-nums;
  font-weight: 900;
  letter-spacing: -0.055em;
  line-height: 0.95;
}

.balance-card__total-unit {
  color: var(--balance-unit);
  font-size: 0.38em;
  font-weight: 850;
  letter-spacing: 0.08em;
  line-height: 1;
}

.balance-card__status-row {
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.balance-card__trend {
  color: var(--balance-trend);
  font-size: 12px;
  font-variant-numeric: tabular-nums;
  font-weight: 750;
}

.balance-card__chart {
  background: var(--balance-panel);
  border: 1px solid var(--balance-border);
  border-radius: 18px;
  padding: 8px 9px 6px;
}

.balance-card__chart-svg {
  display: block;
  height: 96px;
  width: 100%;
}

.balance-card__chart-axis {
  color: var(--balance-subtle);
  display: flex;
  font-size: 11px;
  justify-content: space-between;
  padding: 0 2px;
}

.balance-card__tokens {
  display: grid;
  gap: 8px;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  padding: 0 18px 12px;
}

.balance-card__token-row {
  align-items: center;
  background: var(--balance-panel);
  border: 1px solid var(--balance-border);
  border-radius: 13px;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  justify-content: space-between;
  padding: 10px 12px;
  min-width: 0;
  transition: all 0.2s cubic-bezier(0.25, 1, 0.5, 1);
}

.balance-card__token-row:hover {
  background: var(--balance-surface);
  border-color: var(--balance-border-soft);
  transform: translateY(-1px);
}

.balance-card__token-left {
  align-items: center;
  display: flex;
  gap: 10px;
  min-width: 0;
}

.balance-card__token-left > div {
  min-width: 0;
}

.balance-card__token-icon {
  align-items: center;
  border-radius: 50%;
  color: #fff;
  display: flex;
  font-size: 12px;
  font-weight: 800;
  height: 26px;
  justify-content: center;
  width: 26px;
}

.balance-card__token-icon--sol { background: linear-gradient(135deg, #9945ff, #14f195); }
.balance-card__token-icon--usdc { background: linear-gradient(135deg, #2775ca, #69a7ff); }
.balance-card__token-icon--usdt { background: linear-gradient(135deg, #26a17b, #50c878); }

.balance-card__token-name {
  color: var(--balance-ink);
  display: block;
  font-size: 12px;
  font-weight: 800;
}

.balance-card__token-sub,
.balance-card__token-usd {
  font-variant-numeric: tabular-nums;
}

.balance-card__token-sub {
  color: var(--balance-muted);
  display: block;
  font-size: 11px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.balance-card__token-usd {
  color: var(--balance-ink);
  font-size: 12px;
  font-weight: 800;
  white-space: nowrap;
}

.balance-card__private-stats {
  border-top: 1px solid var(--balance-border-soft);
  display: grid;
  gap: 8px;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  padding: 12px 18px 14px;
}

.balance-card__micro {
  align-items: flex-start;
  background: var(--balance-panel);
  border: 1px solid var(--balance-border);
  border-radius: 15px;
  color: var(--balance-ink);
  display: flex;
  flex-direction: column;
  gap: 5px;
  min-height: 76px;
  padding: 9px;
}

.balance-card__micro svg {
  color: #6d28d9;
}

.balance-card__micro strong,
.balance-card__micro small,
.balance-card__micro em {
  display: block;
}

.balance-card__micro strong {
  font-size: 17px;
  font-variant-numeric: tabular-nums;
  line-height: 1;
}

.balance-card__micro small,
.balance-card__micro em {
  color: var(--balance-muted);
  font-size: 11px;
  font-style: normal;
  line-height: 1.25;
}

.balance-card__micro em {
  margin-top: auto;
}

.balance-card__micro--button {
  cursor: pointer;
  text-align: left;
}

.balance-card button:focus-visible,
.balance-card__modal-summary button:focus-visible,
.balance-card__utxo-row button:focus-visible {
  outline: 2px solid rgba(109, 40, 217, 0.72);
  outline-offset: 2px;
}

.balance-card__modal-summary {
  align-items: center;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.08), rgba(123, 47, 255, 0.08));
  border: 1px solid var(--color-line-soft);
  border-radius: 16px;
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 14px;
}

.balance-card__modal-summary span,
.balance-card__modal-summary strong {
  display: block;
}

.balance-card__modal-summary span {
  color: var(--color-text-muted);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.balance-card__modal-summary strong {
  color: var(--color-text-primary);
  font-size: 22px;
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.03em;
}

.balance-card__utxo-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.balance-card__utxo-row {
  align-items: center;
  background: rgba(123, 47, 255, 0.04);
  border: 1px solid rgba(123, 47, 255, 0.12);
  border-radius: 14px;
  display: flex;
  gap: 12px;
  justify-content: space-between;
  padding: 12px;
}

.balance-card__utxo-left {
  display: flex;
  flex-direction: column;
  gap: 5px;
  min-width: 0;
}

.balance-card__utxo-amount {
  align-items: baseline;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.balance-card__utxo-val {
  color: var(--color-text-primary);
  font-size: 14px;
  font-weight: 750;
}

.balance-card__utxo-usd {
  color: var(--color-text-muted);
  font-size: 12px;
}

.balance-card__utxo-meta {
  color: var(--color-text-muted);
  display: flex;
  flex-wrap: wrap;
  font-size: 11px;
  gap: 12px;
}

.balance-card__utxo-meta span {
  align-items: center;
  display: inline-flex;
  gap: 4px;
}

.balance-card__utxo-empty {
  align-items: center;
  color: var(--color-text-muted);
  display: flex;
  flex-direction: column;
  gap: 7px;
  padding: 28px 0;
  text-align: center;
}

.balance-card__utxo-empty span {
  color: var(--color-text-primary);
  font-size: 14px;
  font-weight: 750;
}

.balance-card__utxo-empty small {
  font-size: 12px;
}

.balance-card__claim-all-btn,
.balance-card__claim-all-btn span {
  color: #ffffff !important;
}

.balance-card__tooltip-wrapper {
  position: relative;
}

.balance-card__tooltip-wrapper:hover::after {
  content: attr(data-tooltip);
  position: absolute;
  bottom: calc(100% + 8px);
  right: 0;
  background: var(--color-bg-card);
  color: var(--color-text-primary);
  border: 1px solid var(--color-violet-border, rgba(168, 85, 247, 0.2));
  padding: 8px 12px;
  border-radius: 8px;
  font-size: 11px;
  line-height: 1.4;
  white-space: normal;
  width: 220px;
  text-align: right;
  z-index: 100;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  pointer-events: none;
}

@media (hover: hover) {
  .balance-card__eye,
  .balance-card__tab,
  .balance-card__micro--button,
  .balance-card__utxo-row {
    transition: background-color 150ms ease-out, border-color 150ms ease-out, color 150ms ease-out, transform 150ms ease-out, box-shadow 150ms ease-out;
  }

  .balance-card__eye:hover,
  .balance-card__micro--button:hover {
    background: var(--balance-hover);
    border-color: rgba(109, 40, 217, 0.24);
    color: var(--balance-ink);
  }

  .balance-card__tab:hover,
  .balance-card__utxo-row:hover {
    border-color: rgba(109, 40, 217, 0.2);
  }

  .balance-card__micro--button:hover {
    transform: translateY(-1px);
  }
}

@media (prefers-reduced-motion: reduce) {
  .balance-card *,
  .balance-card *::before,
  .balance-card *::after {
    transition: none !important;
  }
}

/* When the balance row stacks (≤1024px), the card can be wider but the
   hero section may still be too cramped — stack chart below at ≤740px */
@media (max-width: 740px) {
  .balance-card__hero {
    grid-template-columns: 1fr;
    gap: 12px;
  }
}

@media (max-width: 520px) {
  .balance-card {
    min-width: 0;
  }

  .balance-card__header {
    align-items: flex-start;
    flex-direction: column;
  }

  .balance-card__header-controls {
    width: 100%;
  }

  .balance-card__tabs {
    flex: 1;
  }

  .balance-card__tokens,
  .balance-card__private-stats {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .balance-card__micro {
    min-height: auto;
  }

  .balance-card__modal-summary,
  .balance-card__utxo-row {
    align-items: stretch;
    flex-direction: column;
  }
}
`;
