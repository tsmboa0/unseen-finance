export function formatCurrency(
  amount: number,
  currency: "USD" | "USDC" | "SOL" = "USDC",
  options: { compact?: boolean; decimals?: number } = {},
): string {
  const { compact = false, decimals } = options;

  if (compact && Math.abs(amount) >= 1000) {
    const abs = Math.abs(amount);
    const sign = amount < 0 ? "-" : "";
    if (abs >= 1_000_000) {
      return `${sign}${(abs / 1_000_000).toFixed(abs >= 10_000_000 ? 1 : 2)}M ${currency}`;
    }
    if (abs >= 1_000) {
      return `${sign}${(abs / 1_000).toFixed(abs >= 10_000 ? 1 : 2)}k ${currency}`;
    }
  }

  const precision =
    decimals ?? (currency === "SOL" ? 3 : currency === "USD" ? 2 : 2);
  const formatted = amount.toLocaleString("en-US", {
    minimumFractionDigits: precision,
    maximumFractionDigits: precision,
  });

  return currency === "USD" ? `$${formatted}` : `${formatted} ${currency}`;
}

export function formatNumber(value: number, opts: { compact?: boolean } = {}): string {
  if (opts.compact && Math.abs(value) >= 1000) {
    if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
    return `${(value / 1_000).toFixed(1)}k`;
  }
  return value.toLocaleString("en-US");
}

export function formatPercent(value: number, decimals = 1): string {
  return `${value.toFixed(decimals)}%`;
}

export function formatDelta(value: number): { label: string; isPositive: boolean; isZero: boolean } {
  const rounded = Math.round(value * 10) / 10;
  if (rounded === 0) return { label: "0.0%", isPositive: false, isZero: true };
  const sign = rounded > 0 ? "+" : "";
  return {
    label: `${sign}${rounded.toFixed(1)}%`,
    isPositive: rounded > 0,
    isZero: false,
  };
}

export function formatRelativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const minutes = Math.round(diff / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;
  const date = new Date(timestamp);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function formatDate(timestamp: number, withTime = false): string {
  const date = new Date(timestamp);
  const base = date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  if (!withTime) return base;
  const time = date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  return `${base} · ${time}`;
}

export function truncateMiddle(value: string, head = 4, tail = 4): string {
  if (value.length <= head + tail + 3) return value;
  return `${value.slice(0, head)}…${value.slice(-tail)}`;
}
