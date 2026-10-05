"use client";

import { useMemo, useState } from "react";
import { aggregateSets, BASIS_LABEL, money, type Basis, type Market, type SetAgg } from "../lib/market";
import type { Filters } from "./Screener";
import { Pct } from "./ui";

type Key = "release" | "name" | "cards" | "value" | "move" | "top";

const val = (s: SetAgg, k: Key): number | string | null =>
  k === "release" ? s.set.release : k === "name" ? s.set.name : k === "cards" ? s.cards : k === "value" ? s.value : k === "move" ? s.move : s.top?.price ?? null;

export function SetsView({ market, basis, onDrill }: { market: Market; basis: Basis; onDrill: (f: Partial<Filters>) => void }) {
  const [sort, setSort] = useState<{ k: Key; dir: 1 | -1 }>({ k: "release", dir: -1 });
  const rows = useMemo(() => {
    const list = aggregateSets(market, basis);
    return list.sort((a, b) => {
      const va = val(a, sort.k);
      const vb = val(b, sort.k);
      if (va == null) return 1;
      if (vb == null) return -1;
      return (va < vb ? -1 : va > vb ? 1 : 0) * sort.dir;
    });
  }, [market, basis, sort]);

  const th = (k: Key, label: string, num = false) => (
    <th className={num ? "num" : ""} style={{ cursor: "pointer", color: sort.k === k ? "var(--amber)" : undefined }} onClick={() => setSort((s) => ({ k, dir: s.k === k ? ((-s.dir) as 1 | -1) : k === "name" ? 1 : -1 }))}>
      {label}
      {sort.k === k ? (sort.dir === 1 ? " ↑" : " ↓") : ""}
    </th>
  );

  return (
    <section className="panel">
      <div className="ph">
        <h3>All sets · {rows.length}</h3>
        <span className="dim">MOVE = {BASIS_LABEL[basis]}</span>
      </div>
      <div style={{ overflowX: "auto" }}>
        <table className="list">
          <thead>
            <tr>
              <th />
              {th("name", "SET")}
              <th>SERIES</th>
              {th("release", "RELEASED")}
              {th("cards", "CARDS", true)}
              {th("value", "SET COST 1×", true)}
              {th("move", "MOVE", true)}
              <th className="num">▲ / ▼</th>
              {th("top", "TOP CARD", true)}
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map((s) => (
              <tr key={s.set.id} className="click" onClick={() => onDrill({ setId: s.set.id, sort: "price" })}>
                <td>{s.set.symbol && <img src={s.set.symbol} alt="" style={{ height: 16, verticalAlign: "middle" }} loading="lazy" />}</td>
                <td>{s.set.name}</td>
                <td className="muted">{s.set.series}</td>
                <td className="muted">{s.set.release}</td>
                <td className="num">{s.cards}</td>
                <td className="num">{money(s.value)}</td>
                <td className="num"><Pct v={s.move} /></td>
                <td className="num">
                  <span className="up">{s.up}</span> / <span className="down">{s.down}</span>
                </td>
                <td className="num">{money(s.top?.price)}</td>
                <td className="nm muted">{s.top?.name}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="foot">SET COST 1× = buying one copy of every priced card in the set at market. Click a set to screen its cards.</div>
    </section>
  );
}
