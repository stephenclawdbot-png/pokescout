"use client";

import { signed } from "../lib/market";

export function Pct({ v, digits = 1 }: { v: number | null | undefined; digits?: number }) {
  if (v == null) return <span className="dim">—</span>;
  const cls = v > 0 ? "up" : v < 0 ? "down" : "muted";
  const arrow = v > 0 ? "▲" : v < 0 ? "▼" : "";
  return (
    <span className={cls}>
      {arrow}
      {signed(v, digits)}
    </span>
  );
}

// Diverging fill for a % move: red ← neutral → green, saturating at ±cap.
export function heat(v: number | null, cap = 25) {
  if (v == null) return "#1a1c20";
  const t = Math.min(Math.abs(v) / cap, 1);
  const pole = v >= 0 ? "#1f9d63" : "#d23f3f";
  return `color-mix(in oklab, ${pole} ${Math.round(18 + t * 82)}%, var(--heat-mid))`;
}

export function HeatLegend({ cap = 25 }: { cap?: number }) {
  return (
    <div className="legend">
      <span>−{cap}%</span>
      <span className="ramp" style={{ background: `linear-gradient(90deg, ${heat(-cap, cap)}, ${heat(0, cap)}, ${heat(cap, cap)})` }} />
      <span>+{cap}%</span>
    </div>
  );
}

export function Spark({ values, width = 520, height = 120 }: { values: (number | null)[]; width?: number; height?: number }) {
  const pts = values.map((v, i) => [i, v] as const).filter((p): p is readonly [number, number] => p[1] != null);
  if (pts.length < 2) return null;
  const xs = values.length - 1 || 1;
  const vals = pts.map((p) => p[1]);
  const lo = Math.min(...vals);
  const hi = Math.max(...vals);
  const pad = (hi - lo) * 0.1 || hi * 0.05 || 1;
  const y = (v: number) => height - 4 - ((v - (lo - pad)) / (hi + pad - (lo - pad))) * (height - 8);
  const x = (i: number) => (i / xs) * (width - 2) + 1;
  const d = pts.map((p, i) => `${i ? "L" : "M"}${x(p[0]).toFixed(1)},${y(p[1]).toFixed(1)}`).join("");
  const rising = vals[vals.length - 1] >= vals[0];
  const color = rising ? "var(--up)" : "var(--down)";
  return (
    <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height} preserveAspectRatio="none" role="img" aria-label="price history">
      <path d={`${d}L${x(pts[pts.length - 1][0])},${height}L${x(pts[0][0])},${height}Z`} fill={color} opacity={0.08} />
      <path d={d} fill="none" stroke={color} strokeWidth={2} vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
    </svg>
  );
}
