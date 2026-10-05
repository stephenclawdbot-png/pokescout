"use client";

import { useMemo, useState } from "react";
import { aggregateSpecies, BASIS_LABEL, imgUrl, money, type Basis, type Card, type Market, type SpeciesAgg } from "../lib/market";
import type { Filters } from "./Screener";
import { Pct } from "./ui";

type Key = "dex" | "label" | "cards" | "value" | "move" | "top";

const val = (s: SpeciesAgg, k: Key): number | string | null =>
  k === "dex" ? s.dex : k === "label" ? s.label : k === "cards" ? s.cards : k === "value" ? s.value : k === "move" ? s.move : s.top?.price ?? null;

export function SpeciesView({ market, basis, onDrill, onOpen }: { market: Market; basis: Basis; onDrill: (f: Partial<Filters>) => void; onOpen: (c: Card) => void }) {
  const [sort, setSort] = useState<{ k: Key; dir: 1 | -1 }>({ k: "value", dir: -1 });
  const [q, setQ] = useState("");
  const rows = useMemo(() => {
    const t = q.trim().toLowerCase();
    return aggregateSpecies(market, basis)
      .filter((s) => !t || s.label.toLowerCase().includes(t) || String(s.dex) === t)
      .sort((a, b) => {
        const va = val(a, sort.k);
        const vb = val(b, sort.k);
        if (va == null) return 1;
        if (vb == null) return -1;
        return (va < vb ? -1 : va > vb ? 1 : 0) * sort.dir;
      });
  }, [market, basis, sort, q]);

  const th = (k: Key, label: string, num = false) => (
    <th className={num ? "num" : ""} style={{ cursor: "pointer", color: sort.k === k ? "var(--amber)" : undefined }} onClick={() => setSort((s) => ({ k, dir: s.k === k ? ((-s.dir) as 1 | -1) : k === "label" || k === "dex" ? 1 : -1 }))}>
      {label}
      {sort.k === k ? (sort.dir === 1 ? " ↑" : " ↓") : ""}
    </th>
  );

  return (
    <section className="panel">
      <div className="ph">
        <h3>Pokémon indices · {rows.length}</h3>
        <div className="ctl">
          <input placeholder="find pokémon…" value={q} onChange={(e) => setQ(e.target.value)} style={{ background: "var(--bg)", border: "1px solid var(--line-2)", padding: "2px 6px" }} />
        </div>
      </div>
      <div style={{ overflowX: "auto" }}>
        <table className="list">
          <thead>
            <tr>
              {th("dex", "#")}
              {th("label", "POKÉMON")}
              {th("cards", "CARDS", true)}
              {th("value", "1× EACH", true)}
              {th("move", "MOVE", true)}
              <th />
              {th("top", "TOP CARD", true)}
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map((s) => (
              <tr key={s.dex} className="click" onClick={() => onDrill({ dex: s.dex, sort: "price" })}>
                <td className="dim">{s.dex}</td>
                <td>{s.label}</td>
                <td className="num">{s.cards}</td>
                <td className="num">{money(s.value)}</td>
                <td className="num"><Pct v={s.move} /></td>
                <td>
                  {s.top && (
                    <img
                      className="thumb"
                      src={imgUrl(s.top)}
                      alt=""
                      loading="lazy"
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpen(s.top!);
                      }}
                    />
                  )}
                </td>
                <td className="num">{money(s.top?.price)}</td>
                <td className="nm muted">
                  {s.top?.name} <span className="dim">{s.top?.set.name}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="foot">Each Pokémon's index = every card featuring it (by National Pokédex number), price-weighted. MOVE = {BASIS_LABEL[basis]}. Click to screen all its cards.</div>
    </section>
  );
}
