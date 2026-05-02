"use client";

import { useMemo } from "react";

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
