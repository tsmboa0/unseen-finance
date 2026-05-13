"use client";

import { useMemo, useState, useRef, useCallback } from "react";
import { formatCurrency } from "@/components/dashboard/formatters";

/* ─── Shared helpers ──────────────────────────────────── */

function pathFromPoints(points: [number, number][]): string {
  if (points.length === 0) return "";
  let d = `M ${points[0][0]} ${points[0][1]}`;
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const cp1x = prev[0] + (curr[0] - prev[0]) * 0.4;
    const cp2x = prev[0] + (curr[0] - prev[0]) * 0.6;
    d += ` C ${cp1x} ${prev[1]}, ${cp2x} ${curr[1]}, ${curr[0]} ${curr[1]}`;
  }
  return d;
}

function normalize(values: number[], height: number, padding = 0): number[] {
  const max = Math.max(...values, 1);
  return values.map((v) => height - padding - ((v / max) * (height - padding * 2)));
}

/* ─── Sparkline ───────────────────────────────────────── */

export function Sparkline({
  data,
  width = 80,
  height = 28,
  color = "var(--color-violet-glow)",
}: {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
}) {
  const points = useMemo(() => {
    const ys = normalize(data, height, 2);
    const step = data.length > 1 ? width / (data.length - 1) : 0;
    return data.map((_, i): [number, number] => [i * step, ys[i]]);
  }, [data, width, height]);

  return (
    <svg className="d-sparkline" height={height} viewBox={`0 0 ${width} ${height}`} width={width}>
      <path d={pathFromPoints(points)} fill="none" stroke={color} strokeWidth={1.5} />
    </svg>
  );
}

/* ─── AreaChart ────────────────────────────────────────── */

export type AreaSeries = { label: string; color: string; data: number[] };

export function AreaChart({
  series,
  labels,
  height = 240,
  className = "",
}: {
  series: AreaSeries[];
  labels?: string[];
  height?: number;
  className?: string;
}) {
  const W = 640;
  const PAD = 32;
  const innerW = W - PAD * 2;
  const innerH = height - PAD * 2;

  const allValues = series.flatMap((s) => s.data);
  const globalMax = Math.max(...allValues, 1);

  return (
    <div className={`d-chart ${className}`}>
      <svg className="d-chart__svg" preserveAspectRatio="none" viewBox={`0 0 ${W} ${height}`}>
        <defs>
          {series.map((s, si) => (
            <linearGradient id={`area-g-${si}`} key={si} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={s.color} stopOpacity={0.3} />
              <stop offset="100%" stopColor={s.color} stopOpacity={0} />
            </linearGradient>
          ))}
        </defs>

        {[0, 0.25, 0.5, 0.75, 1].map((frac) => {
          const y = PAD + (1 - frac) * innerH;
          return (
            <line key={frac} stroke="var(--color-line-soft)" strokeWidth={0.5} x1={PAD} x2={W - PAD} y1={y} y2={y} />
          );
        })}

        {series.map((s, si) => {
          const n = s.data.length;
          const step = n > 1 ? innerW / (n - 1) : 0;
          const points: [number, number][] = s.data.map((v, i) => [
            PAD + i * step,
            PAD + (1 - v / globalMax) * innerH,
          ]);
          const line = pathFromPoints(points);
          const firstPt = points[0];
          const lastPt = points[points.length - 1];
          const areaD = `${line} L ${lastPt[0]} ${PAD + innerH} L ${firstPt[0]} ${PAD + innerH} Z`;

          return (
            <g key={si}>
              <path d={areaD} fill={`url(#area-g-${si})`} />
              <path d={line} fill="none" stroke={s.color} strokeWidth={2} />
            </g>
          );
        })}

        {labels &&
          labels.map((lbl, i) => {
            const n = labels.length;
            const step = n > 1 ? innerW / (n - 1) : 0;
            return (
              <text
                fill="var(--color-text-muted)"
                fontSize={10}
                key={i}
                textAnchor="middle"
                x={PAD + i * step}
                y={height - 8}
              >
                {lbl}
              </text>
            );
          })}
      </svg>

      <div className="d-chart__legend">
        {series.map((s, i) => (
          <span className="d-chart__legend-item" key={i}>
            <span className="d-chart__legend-dot" style={{ background: s.color }} />
            {s.label}
          </span>
        ))}
      </div>
    </div>
  );
}

/** Same stacked-area look as {@link AreaChart}, with hover crosshair + tooltip (dashboard-quality). */
export function InteractiveAreaChart({
  series,
  labels,
  pointMeta,
  height = 260,
  className = "",
  currency = "USDC",
}: {
  series: AreaSeries[];
  labels?: string[];
  /** One row per x-index; usually UTC `YYYY-MM-DD`. */
  pointMeta: Array<{ day: string }>;
  height?: number;
  className?: string;
  currency?: "USDC" | "USD";
}) {
  const W = 640;
  const PAD = 32;
  const innerW = W - PAD * 2;
  const innerH = height - PAD * 2;

  const n = series[0]?.data.length ?? 0;
  const allValues = series.flatMap((s) => s.data);
  const globalMax = Math.max(...allValues, 1);

  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ left: number; top: number } | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const cxAt = useCallback(
    (idx: number) => {
      if (n <= 0) return PAD;
      if (n === 1) return PAD + innerW / 2;
      return PAD + (idx / (n - 1)) * innerW;
    },
    [n, PAD, innerW],
  );

  const updateHover = useCallback(
    (clientX: number, clientY: number) => {
      const wrap = wrapRef.current;
      const svg = svgRef.current;
      if (!wrap || !svg || n <= 0) return;

      const wrapRect = wrap.getBoundingClientRect();
      const svgRect = svg.getBoundingClientRect();
      const relX = clientX - svgRect.left;
      const viewX = svgRect.width > 0 ? (relX / svgRect.width) * W : PAD + innerW / 2;
      const t = innerW > 0 ? (viewX - PAD) / innerW : 0;
      const tClamped = Math.min(1, Math.max(0, t));
      const idx = n <= 1 ? 0 : Math.round(tClamped * (n - 1));

      const cxSvg = cxAt(idx);
      const cxPx = (cxSvg / W) * svgRect.width + (svgRect.left - wrapRect.left);
      const py = clientY - wrapRect.top;

      const EST_W = 268;
      const EST_H = 136;
      const GAP = 14;
      const maxLeft = Math.max(8, wrap.clientWidth - EST_W - 8);
      const maxTop = Math.max(8, wrap.clientHeight - EST_H - 8);

      const fitsRight = cxPx + GAP + EST_W <= wrap.clientWidth - 8;
      const fitsLeft = cxPx - GAP - EST_W >= 8;
      let left = cxPx + GAP;
      if (!fitsRight && fitsLeft) {
        left = cxPx - EST_W - GAP;
      } else if (!fitsRight && !fitsLeft) {
        left = cxPx + GAP;
      }
      left = Math.min(Math.max(8, left), maxLeft);

      let top = py + GAP;
      if (top + EST_H > wrap.clientHeight - 8) {
        top = py - EST_H - GAP;
      }
      top = Math.min(Math.max(8, top), maxTop);

      setHoverIdx(idx);
      setTooltipPos({ left, top });
    },
    [W, PAD, innerW, n, cxAt],
  );

  const yAt = (v: number) => PAD + (1 - v / globalMax) * innerH;

  const hoverDayLabel = useMemo(() => {
    if (hoverIdx === null || !pointMeta[hoverIdx]) return "";
    const raw = pointMeta[hoverIdx].day;
    const d = new Date(`${raw}T12:00:00.000Z`);
    return d.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
      timeZone: "UTC",
    });
  }, [hoverIdx, pointMeta]);

  return (
    <div
      ref={wrapRef}
      className={`d-chart d-chart--interactive ${className}`}
      onMouseLeave={() => {
        setHoverIdx(null);
        setTooltipPos(null);
      }}
      onMouseMove={(e) => updateHover(e.clientX, e.clientY)}
      role="presentation"
    >
      <svg
        ref={svgRef}
        className="d-chart__svg"
        preserveAspectRatio="none"
        viewBox={`0 0 ${W} ${height}`}
      >
        <defs>
          {series.map((s, si) => (
            <linearGradient id={`i-area-g-${si}`} key={si} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={s.color} stopOpacity={0.32} />
              <stop offset="100%" stopColor={s.color} stopOpacity={0} />
            </linearGradient>
          ))}
        </defs>

        {[0, 0.25, 0.5, 0.75, 1].map((frac) => {
          const y = PAD + (1 - frac) * innerH;
          return (
            <line key={frac} stroke="var(--color-line-soft)" strokeWidth={0.5} x1={PAD} x2={W - PAD} y1={y} y2={y} />
          );
        })}

        {series.map((s, si) => {
          const step = n > 1 ? innerW / (n - 1) : 0;
          const points: [number, number][] = s.data.map((v, i) => [PAD + i * step, yAt(v)]);
          const line = pathFromPoints(points);
          const firstPt = points[0];
          const lastPt = points[points.length - 1];
          const areaD =
            points.length >= 2
              ? `${line} L ${lastPt[0]} ${PAD + innerH} L ${firstPt[0]} ${PAD + innerH} Z`
              : "";

          return (
            <g key={si}>
              {areaD ? <path d={areaD} fill={`url(#i-area-g-${si})`} /> : null}
              {line ? <path d={line} fill="none" stroke={s.color} strokeWidth={2} /> : null}
            </g>
          );
        })}

        {hoverIdx !== null && n > 0 ? (
          <line
            stroke="var(--color-violet-primary)"
            strokeDasharray="5 5"
            strokeOpacity={0.85}
            strokeWidth={1}
            x1={cxAt(hoverIdx)}
            x2={cxAt(hoverIdx)}
            y1={PAD}
            y2={PAD + innerH}
          />
        ) : null}

        {hoverIdx !== null &&
          series.map((s, si) => {
            const v = s.data[hoverIdx];
            return (
              <circle
                cx={cxAt(hoverIdx)}
                cy={yAt(v)}
                fill={s.color}
                key={si}
                r={5}
                stroke="var(--color-bg-card)"
                strokeWidth={2}
              />
            );
          })}

        {labels &&
          labels.map((lbl, i) => {
            if (!lbl?.trim()) return null;
            const step = n > 1 ? innerW / (n - 1) : 0;
            return (
              <text
                fill="var(--color-text-muted)"
                fontSize={10}
                key={i}
                textAnchor="middle"
                x={PAD + i * step}
                y={height - 8}
              >
                {lbl}
              </text>
            );
          })}
      </svg>

      {hoverIdx !== null && pointMeta[hoverIdx] && tooltipPos ? (
        <div className="d-chart__tooltip" style={{ left: tooltipPos.left, top: tooltipPos.top }}>
          <p className="d-chart__tooltip-date">{hoverDayLabel}</p>
          <ul className="d-chart__tooltip-rows">
            {series.map((s, i) => (
              <li key={i}>
                <span className="d-chart__tooltip-dot" style={{ background: s.color }} />
                <span className="d-chart__tooltip-label">{s.label}</span>
                <span className="d-chart__tooltip-value">
                  {formatCurrency(s.data[hoverIdx] ?? 0, currency)}
                </span>
              </li>
            ))}
          </ul>
          <p className="d-chart__tooltip-hint">UTC day · display units</p>
        </div>
      ) : null}

      <div className="d-chart__legend">
        {series.map((s, i) => (
          <span className="d-chart__legend-item" key={i}>
            <span className="d-chart__legend-dot" style={{ background: s.color }} />
            {s.label}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ─── DonutChart ──────────────────────────────────────── */

export type DonutSlice = { label: string; value: number; color: string };

export function DonutChart({
  slices,
  size = 180,
  thickness = 24,
  centerLabel,
  centerValue,
  className = "",
}: {
  slices: DonutSlice[];
  size?: number;
  thickness?: number;
  centerLabel?: string;
  centerValue?: string;
  className?: string;
}) {
  const total = slices.reduce((s, sl) => s + sl.value, 0) || 1;
  const r = (size - thickness) / 2;
  const circ = 2 * Math.PI * r;

  let offset = 0;

  return (
    <div className={`d-donut ${className}`} style={{ width: size, height: size }}>
      <svg className="d-donut__svg" viewBox={`0 0 ${size} ${size}`}>
        {slices.map((sl, i) => {
          const dash = (sl.value / total) * circ;
          const gap = circ - dash;
          const o = offset;
          offset += dash;
          return (
            <circle
              cx={size / 2}
              cy={size / 2}
              fill="none"
              key={i}
              r={r}
              stroke={sl.color}
              strokeDasharray={`${dash} ${gap}`}
              strokeDashoffset={-o}
              strokeWidth={thickness}
              style={{ transition: "stroke-dasharray 0.5s ease, stroke-dashoffset 0.5s ease" }}
            />
          );
        })}
      </svg>
      {(centerLabel || centerValue) && (
        <div className="d-donut__center">
          {centerValue && <span className="d-donut__value">{centerValue}</span>}
          {centerLabel && <span className="d-donut__label">{centerLabel}</span>}
        </div>
      )}
    </div>
  );
}

/* ─── BarChart ─────────────────────────────────────────── */

export function BarChart({
  data,
  height = 200,
  color = "var(--color-violet-primary)",
  className = "",
}: {
  data: Array<{ label: string; value: number }>;
  height?: number;
  color?: string;
  className?: string;
}) {
  const maxVal = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className={`d-bar-chart ${className}`} style={{ height }}>
      {data.map((d) => {
        const h = (d.value / maxVal) * 100;
        return (
          <div className="d-bar-chart__col" key={d.label}>
            <div className="d-bar-chart__bar-wrap">
              <div
                className="d-bar-chart__bar"
                style={{ height: `${h}%`, background: color }}
              />
            </div>
            <span className="d-bar-chart__label">{d.label}</span>
          </div>
        );
      })}
    </div>
  );
}
