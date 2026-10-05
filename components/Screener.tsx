"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { change, ERAS, imgUrl, money, type Basis, type Card, type Market } from "../lib/market";
import { Pct } from "./ui";

export type SortKey = "name" | "set" | "rarity" | "price" | "low" | "usd1d" | "usd7d" | "usd30d" | "eurTrend" | "eu1d" | "eu7d" | "spread" | "move";

export type Filters = {
  q: string;
  setId: string;
  era: string;
  series: string;
  rarity: string;
  supertype: string;
  minPrice: string;
  maxPrice: string;
  dex: number;
  euOnly: boolean;
  watchOnly: boolean;
  sort: SortKey;
  dir: 1 | -1;
};

export const EMPTY_FILTERS: Filters = {
  q: "",
  setId: "",
  era: "",
  series: "",
  rarity: "",
  supertype: "",
  minPrice: "",
  maxPrice: "",
  dex: 0,
  euOnly: false,
  watchOnly: false,
  sort: "price",
  dir: -1,
};

type Props = {
  market: Market;
  basis: Basis;
  filters: Filters;
  setFilters: (f: Filters | ((f: Filters) => Filters)) => void;
  onOpen: (c: Card) => void;
  selected: Card | null;
  watch: string[];
  toggleWatch: (id: string) => void;
  emptyNote?: string;
};

const COLS: { key: SortKey | null; label: string; w: string; num?: boolean; title?: string }[] = [
  { key: null, label: "", w: "16px" },
  { key: null, label: "", w: "16px" },
  { key: "name", label: "CARD", w: "minmax(180px, 2fr)" },
  { key: "set", label: "SET", w: "minmax(130px, 1.3fr)" },
  { key: "rarity", label: "RARITY", w: "minmax(90px, 1fr)" },
  { key: "price", label: "PRICE $", w: "78px", num: true, title: "TCGplayer market (or Cardmarket trend converted)" },
  { key: "low", label: "LOW $", w: "70px", num: true, title: "TCGplayer lowest listing" },
  { key: "usd1d", label: "US 1D", w: "70px", num: true },
  { key: "usd7d", label: "US 7D", w: "70px", num: true },
  { key: "usd30d", label: "US 30D", w: "70px", num: true },
  { key: "eurTrend", label: "CM €", w: "70px", num: true, title: "Cardmarket trend price" },
  { key: "eu1d", label: "EU 1D", w: "70px", num: true, title: "Cardmarket avg1 vs avg7" },
  { key: "eu7d", label: "EU 7D", w: "70px", num: true, title: "Cardmarket avg7 vs avg30" },
  { key: "spread", label: "US/EU", w: "70px", num: true, title: "TCGplayer vs Cardmarket trend" },
];
const GRID = COLS.map((c) => c.w).join(" ");
const ROW = 28;

function sortValue(c: Card, k: SortKey, basis: Basis): number | string | null {
  switch (k) {
    case "name": return c.name.toLowerCase();
    case "set": return c.set.release + c.set.id + c.number.padStart(5, "0");
    case "rarity": return c.rarity;
    case "price": return c.price;
    case "low": return c.usdLow;
    case "usd1d": return c.usd1d;
    case "usd7d": return c.usd7d;
    case "usd30d": return c.usd30d;
    case "eurTrend": return c.eurTrend;
    case "eu1d": return c.eu1d;
    case "eu7d": return c.eu7d;
    case "spread": return c.spread;
    case "move": return change(c, basis);
  }
}

export function Screener({ market, basis, filters: f, setFilters, onOpen, selected, watch, toggleWatch, emptyNote }: Props) {
  const [scroll, setScroll] = useState(0);
  const [height, setHeight] = useState(600);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setHeight(el.clientHeight));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const hay = useMemo(() => market.cards.map((c) => `${c.name} ${c.set.name} ${c.set.series} ${c.artist} ${c.id} ${c.number} ${c.rarity}`.toLowerCase()), [market]);
  const rarities = useMemo(() => [...new Set(market.cards.map((c) => c.rarity).filter(Boolean))].sort(), [market]);
  const series = useMemo(() => [...new Set(market.sets.map((s) => s.series))], [market]);
  const setsSorted = useMemo(() => [...market.sets].sort((a, b) => b.release.localeCompare(a.release)), [market]);

  const rows = useMemo(() => {
    const tokens = f.q.toLowerCase().split(/\s+/).filter(Boolean);
    const min = f.minPrice ? Number(f.minPrice) : null;
    const max = f.maxPrice ? Number(f.maxPrice) : null;
    const era = ERAS.find((e) => e.key === f.era);
    const watchSet = new Set(watch);
    const out: Card[] = [];
    market.cards.forEach((c, i) => {
      if (f.watchOnly && !watchSet.has(c.id)) return;
      if (f.setId && c.set.id !== f.setId) return;
      if (era && !era.series.includes(c.set.series)) return;
      if (f.series && c.set.series !== f.series) return;
      if (f.rarity && c.rarity !== f.rarity) return;
      if (f.supertype && c.supertype !== f.supertype) return;
      if (f.dex && c.dex !== f.dex) return;
      if (f.euOnly && c.eu7d == null) return;
      if (min != null && (c.price ?? -1) < min) return;
      if (max != null && (c.price ?? Infinity) > max) return;
      for (const t of tokens) if (!hay[i].includes(t)) return;
      out.push(c);
    });
    const k = f.sort;
    const dir = f.dir;
    return out.sort((a, b) => {
      const va = sortValue(a, k, basis);
      const vb = sortValue(b, k, basis);
      if (va == null && vb == null) return 0;
      if (va == null) return 1;
      if (vb == null) return -1;
      return (va < vb ? -1 : va > vb ? 1 : 0) * dir;
    });
  }, [market, hay, f, basis, watch]);

  const set = <K extends keyof Filters>(k: K, v: Filters[K]) => setFilters((x) => ({ ...x, [k]: v }));
  const sortBy = (k: SortKey) => setFilters((x) => ({ ...x, sort: k, dir: x.sort === k ? ((-x.dir) as 1 | -1) : k === "name" || k === "set" || k === "rarity" ? 1 : -1 }));

  const start = Math.max(0, Math.floor(scroll / ROW) - 10);
  const end = Math.min(rows.length, Math.ceil((scroll + height) / ROW) + 10);
  const active = f.setId || f.era || f.series || f.rarity || f.supertype || f.minPrice || f.maxPrice || f.dex || f.euOnly || f.q;
  const dexLabel = f.dex ? market.cards.find((c) => c.dex === f.dex)?.name : "";

  return (
    <section className="panel">
      <div className="filters">
        <input placeholder="filter…" value={f.q} onChange={(e) => set("q", e.target.value)} style={{ width: 160 }} />
        <select value={f.era} onChange={(e) => set("era", e.target.value)}>
          <option value="">all eras</option>
          {ERAS.map((e) => <option key={e.key} value={e.key}>{e.label}</option>)}
        </select>
        <select value={f.series} onChange={(e) => set("series", e.target.value)}>
          <option value="">all series</option>
          {series.map((s) => <option key={s}>{s}</option>)}
        </select>
        <select value={f.setId} onChange={(e) => set("setId", e.target.value)} style={{ maxWidth: 200 }}>
          <option value="">all sets</option>
          {setsSorted.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.release.slice(0, 4)})</option>)}
        </select>
        <select value={f.rarity} onChange={(e) => set("rarity", e.target.value)} style={{ maxWidth: 170 }}>
          <option value="">all rarities</option>
          {rarities.map((r) => <option key={r}>{r}</option>)}
        </select>
        <select value={f.supertype} onChange={(e) => set("supertype", e.target.value)}>
          <option value="">all types</option>
          <option value="P">Pokémon</option>
          <option value="T">Trainer</option>
          <option value="E">Energy</option>
        </select>
        <input placeholder="min $" value={f.minPrice} onChange={(e) => set("minPrice", e.target.value.replace(/[^\d.]/g, ""))} style={{ width: 64 }} />
        <input placeholder="max $" value={f.maxPrice} onChange={(e) => set("maxPrice", e.target.value.replace(/[^\d.]/g, ""))} style={{ width: 64 }} />
        <button className={`chip${f.euOnly ? " on" : ""}`} onClick={() => set("euOnly", !f.euOnly)}>HAS EU DATA</button>
        {f.dex > 0 && (
          <button className="chip on" onClick={() => set("dex", 0)}>#{f.dex} {dexLabel} ✕</button>
        )}
        {active && (
          <button className="chip" onClick={() => setFilters((x) => ({ ...EMPTY_FILTERS, watchOnly: x.watchOnly, sort: x.sort, dir: x.dir }))}>CLEAR</button>
        )}
        <span className="count">{rows.length.toLocaleString("en-US")} cards</span>
      </div>
      <div
        className="vt"
        ref={ref}
        style={{ height: "calc(100vh - 175px)", minHeight: 360 }}
        onScroll={(e) => setScroll(e.currentTarget.scrollTop)}
      >
        <div className="vt-inner">
          <div className="vt-head" style={{ gridTemplateColumns: GRID }}>
            {COLS.map((c, i) => (
              <div
                key={i}
                className={`${c.num ? "num" : ""}${c.key && f.sort === c.key ? " on" : ""}`}
                title={c.title}
                onClick={() => c.key && sortBy(c.key)}
              >
                {c.label}
                {c.key && f.sort === c.key ? (f.dir === 1 ? " ↑" : " ↓") : ""}
              </div>
            ))}
          </div>
          {rows.length === 0 && <div className="loading">{emptyNote ?? "No cards match."}</div>}
          <div style={{ height: rows.length * ROW, position: "relative" }}>
            {rows.slice(start, end).map((c, i) => {
              const style: CSSProperties = { gridTemplateColumns: GRID, position: "absolute", top: (start + i) * ROW, left: 0, right: 0 };
              const on = watch.includes(c.id);
              return (
                <div key={c.id} className={`vt-row${selected?.id === c.id ? " sel" : ""}`} style={style} onClick={() => onOpen(c)}>
                  <div>
                    <button
                      className={`star${on ? " on" : ""}`}
                      aria-label={on ? "remove from watchlist" : "add to watchlist"}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleWatch(c.id);
                      }}
                    >
                      {on ? "★" : "☆"}
                    </button>
                  </div>
                  <div>{c.img && <img className="thumb" src={imgUrl(c)} alt="" loading="lazy" />}</div>
                  <div>{c.name}</div>
                  <div className="muted">
                    {c.set.name} <span className="dim">#{c.number}</span>
                  </div>
                  <div className="dim">{c.rarity || "—"}</div>
                  <div className="num">{money(c.price)}</div>
                  <div className="num muted">{money(c.usdLow)}</div>
                  <div className="num"><Pct v={c.usd1d} /></div>
                  <div className="num"><Pct v={c.usd7d} /></div>
                  <div className="num"><Pct v={c.usd30d} /></div>
                  <div className="num muted">{money(c.eurTrend, "€")}</div>
                  <div className="num"><Pct v={c.eu1d} /></div>
                  <div className="num"><Pct v={c.eu7d} /></div>
                  <div className="num"><Pct v={c.spread} /></div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
