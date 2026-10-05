"use client";

import { useMemo, useState } from "react";
import { aggregateSets, BASIS_LABEL, breadth, change, ERAS, imgUrl, indexMove, isChase, money, type Basis, type Card, type Market, type SetAgg } from "../lib/market";
import type { Filters } from "./Screener";
import { heat, HeatLegend, Pct } from "./ui";

type Props = { market: Market; basis: Basis; onOpen: (c: Card) => void; onDrill: (f: Partial<Filters>) => void };

const MIN_PRICES = [1, 5, 25, 100];

export function Overview({ market, basis, onOpen, onDrill }: Props) {
  const [minPrice, setMinPrice] = useState(5);
  const [confirmedOnly, setConfirmedOnly] = useState(true);
  const [tip, setTip] = useState<{ x: number; y: number; s: SetAgg } | null>(null);

  const liquid = useMemo(() => market.cards.filter((c) => (c.price ?? 0) >= 1), [market]);

  const indices = useMemo(() => {
    const top100 = [...liquid].sort((a, b) => (b.price ?? 0) - (a.price ?? 0)).slice(0, 100);
    const wotc = liquid.filter((c) => ERAS[0].series.includes(c.set.series));
    const chase = liquid.filter((c) => ERAS[3].series.includes(c.set.series) && isChase(c));
    return [
      { name: "PKMN-ALL", sub: "every card ≥ $1", cards: liquid },
      { name: "PKMN-100", sub: "100 most valuable", cards: top100 },
      { name: "WOTC VINTAGE", sub: "Base → E-Card, ≥ $1", cards: wotc },
      { name: "MODERN CHASE", sub: "S&V / Mega secret & IR, ≥ $1", cards: chase },
    ].map((x) => ({ ...x, move: indexMove(x.cards, basis), br: breadth(x.cards, basis) }));
  }, [liquid, basis]);

  const movers = useMemo(() => {
    const pool = market.cards.filter((c) => {
      if ((c.price ?? 0) < minPrice) return false;
      if (change(c, basis) == null) return false;
      if (basis === "eu7d") {
        if (confirmedOnly && !c.confirmed) return false;
        if ((c.eurAvg30 ?? 0) < 0.5) return false;
      }
      return true;
    });
    const sorted = pool.sort((a, b) => change(b, basis)! - change(a, basis)!);
    return { up: sorted.slice(0, 15), down: sorted.slice(-15).reverse() };
  }, [market, basis, minPrice, confirmedOnly]);

  const sets = useMemo(() => aggregateSets(market, basis), [market, basis]);
  const heatRows = useMemo(() => {
    const bySeries = new Map<string, SetAgg[]>();
    for (const s of sets) {
      if (s.value < 1) continue;
      const g = bySeries.get(s.set.series);
      if (g) g.push(s);
      else bySeries.set(s.set.series, [s]);
    }
    return [...bySeries.entries()]
      .map(([series, list]) => ({ series, list: list.sort((a, b) => b.set.release.localeCompare(a.set.release)), latest: list.reduce((m, s) => (s.set.release > m ? s.set.release : m), "") }))
      .sort((a, b) => b.latest.localeCompare(a.latest));
  }, [sets]);
  const maxValue = Math.max(...sets.map((s) => s.value), 1);

  const top = useMemo(() => [...market.cards].filter((c) => c.price != null).sort((a, b) => b.price! - a.price!).slice(0, 15), [market]);
  const spreads = useMemo(
    () =>
      market.cards
        .filter((c) => c.spread != null && (c.usd ?? 0) >= 20 && (c.eurAvg30 ?? 0) > 0)
        .sort((a, b) => Math.abs(b.spread!) - Math.abs(a.spread!))
        .slice(0, 15),
    [market]
  );
  const eras = useMemo(
    () =>
      ERAS.map((e) => {
        const cs = liquid.filter((c) => e.series.includes(c.set.series));
        return { ...e, n: cs.length, value: cs.reduce((s, c) => s + (c.price ?? 0), 0), move: indexMove(cs, basis).pct, br: breadth(cs, basis) };
      }),
    [liquid, basis]
  );

  return (
    <div className="grid">
      {indices.map((x) => {
        const tot = x.br.up + x.br.down + x.br.flat || 1;
        return (
          <section key={x.name} className="panel span-3 idx">
            <div className="name">{x.name}</div>
            <div className="val">
              <Pct v={x.move.pct} />
            </div>
            <div className="sub">
              {x.sub} · {x.move.n.toLocaleString("en-US")} with data
            </div>
            <div className="bar" title={`▲${x.br.up} · ${x.br.flat} flat · ▼${x.br.down}`}>
              <i style={{ width: `${(x.br.up / tot) * 100}%`, background: "var(--up)" }} />
              <i style={{ width: `${(x.br.flat / tot) * 100}%`, background: "var(--line-2)" }} />
              <i style={{ width: `${(x.br.down / tot) * 100}%`, background: "var(--down)" }} />
            </div>
          </section>
        );
      })}

      <section className="panel span-8">
        <div className="ph">
          <h3>World map · every set, by era</h3>
          <HeatLegend />
        </div>
        <div className="pb" onMouseLeave={() => setTip(null)}>
          {heatRows.map((row) => (
            <div key={row.series} className="heat-series">
              <div className="lbl">{row.series}</div>
              <div className="heat-row">
                {row.list.map((s) => (
                  <div
                    key={s.set.id}
                    className="tile"
                    style={{ background: heat(s.move), flexGrow: Math.sqrt(s.value / maxValue) * 10 + 0.5, flexBasis: `${46 + Math.sqrt(s.value / maxValue) * 120}px` }}
                    onMouseMove={(e) => setTip({ x: e.clientX, y: e.clientY, s })}
                    onClick={() => onDrill({ setId: s.set.id, sort: "price" })}
                  >
                    <span className="t">{s.set.name}</span>
                    <span className="p">{s.move == null ? "—" : `${s.move > 0 ? "+" : ""}${s.move.toFixed(1)}%`}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="foot">
          Tile size = cost of one copy of every card in the set. Colour = price-weighted move ({BASIS_LABEL[basis]}). Click a set to open it in the screener.
        </div>
        {tip && (
          <div className="tip" style={{ left: Math.min(tip.x + 14, window.innerWidth - 290), top: tip.y + 14 }}>
            <div className="amber">{tip.s.set.name}</div>
            <div className="muted">
              {tip.s.set.series} · {tip.s.set.release}
            </div>
            <div>
              move <Pct v={tip.s.move} /> · <span className="up">▲{tip.s.up}</span> <span className="down">▼{tip.s.down}</span>
            </div>
            <div>
              {tip.s.cards} cards · set cost {money(tip.s.value)}
            </div>
            {tip.s.top && (
              <div className="muted">
                top: {tip.s.top.name} {money(tip.s.top.price)}
              </div>
            )}
          </div>
        )}
      </section>

      <section className="panel span-4">
        <div className="ph">
          <h3>Movers</h3>
          <div className="ctl">
            {MIN_PRICES.map((p) => (
              <button key={p} className={`chip${minPrice === p ? " on" : ""}`} onClick={() => setMinPrice(p)}>
                ≥${p}
              </button>
            ))}
            {basis === "eu7d" && (
              <button className={`chip${confirmedOnly ? " on" : ""}`} onClick={() => setConfirmedOnly((v) => !v)} title="Only cards where Cardmarket trend agrees with the 7-day average">
                CONFIRMED
              </button>
            )}
          </div>
        </div>
        <MoverTable title="GAINERS" cards={movers.up} basis={basis} onOpen={onOpen} />
        <MoverTable title="LOSERS" cards={movers.down} basis={basis} onOpen={onOpen} />
      </section>

      <section className="panel span-4">
        <div className="ph">
          <h3>Most valuable</h3>
        </div>
        <CardList cards={top} basis={basis} onOpen={onOpen} />
      </section>

      <section className="panel span-4">
        <div className="ph">
          <h3>US vs EU gap</h3>
        </div>
        <table className="list">
          <thead>
            <tr>
              <th />
              <th>CARD</th>
              <th className="num">TCGP $</th>
              <th className="num">CM €→$</th>
              <th className="num">GAP</th>
            </tr>
          </thead>
          <tbody>
            {spreads.map((c) => (
              <tr key={c.id} className="click" onClick={() => onOpen(c)}>
                <td><img className="thumb" src={imgUrl(c)} alt="" loading="lazy" /></td>
                <td className="nm">
                  {c.name} <span className="dim">{c.set.name}</span>
                </td>
                <td className="num">{money(c.usd)}</td>
                <td className="num">{money(c.eurTrend! * market.fx)}</td>
                <td className="num"><Pct v={c.spread} /></td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="foot">Positive = TCGplayer (US) is richer than Cardmarket (EU) trend. Cards ≥ $20. Mixed conditions on Cardmarket inflate some gaps.</div>
      </section>

      <section className="panel span-4">
        <div className="ph">
          <h3>Eras</h3>
        </div>
        <table className="list">
          <thead>
            <tr>
              <th>ERA</th>
              <th className="num">CARDS ≥$1</th>
              <th className="num">1× EACH</th>
              <th className="num">MOVE</th>
              <th className="num">▲/▼</th>
            </tr>
          </thead>
          <tbody>
            {eras.map((e) => (
              <tr key={e.key} className="click" onClick={() => onDrill({ era: e.key, sort: "move" })}>
                <td>{e.label}</td>
                <td className="num">{e.n.toLocaleString("en-US")}</td>
                <td className="num">{money(e.value)}</td>
                <td className="num"><Pct v={e.move} /></td>
                <td className="num">
                  <span className="up">{e.br.up}</span>/<span className="down">{e.br.down}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="foot">
          USD prices: {market.sources.usd}. EUR momentum: {market.sources.eur}. Own daily history: {market.historyDays} day{market.historyDays === 1 ? "" : "s"} so far; US 1D/7D/30D unlock as it accrues.
        </div>
      </section>
    </div>
  );
}

function MoverTable({ title, cards, basis, onOpen }: { title: string; cards: Card[]; basis: Basis; onOpen: (c: Card) => void }) {
  return (
    <table className="list">
      <thead>
        <tr>
          <th />
          <th>{title}</th>
          <th className="num">PRICE</th>
          <th className="num">MOVE</th>
        </tr>
      </thead>
      <tbody>
        {cards.length === 0 && (
          <tr>
            <td colSpan={4} className="dim">No cards pass the filter.</td>
          </tr>
        )}
        {cards.map((c) => (
          <tr key={c.id} className="click" onClick={() => onOpen(c)}>
            <td><img className="thumb" src={imgUrl(c)} alt="" loading="lazy" /></td>
            <td className="nm">
              {c.name} <span className="dim">{c.set.name}</span>
            </td>
            <td className="num">{money(c.price)}</td>
            <td className="num"><Pct v={change(c, basis)} /></td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function CardList({ cards, basis, onOpen }: { cards: Card[]; basis: Basis; onOpen: (c: Card) => void }) {
  return (
    <table className="list">
      <thead>
        <tr>
          <th />
          <th>CARD</th>
          <th className="num">PRICE</th>
          <th className="num">MOVE</th>
        </tr>
      </thead>
      <tbody>
        {cards.map((c) => (
          <tr key={c.id} className="click" onClick={() => onOpen(c)}>
            <td><img className="thumb" src={imgUrl(c)} alt="" loading="lazy" /></td>
            <td className="nm">
              {c.name} <span className="dim">{c.set.name}</span>
            </td>
            <td className="num">{money(c.price)}</td>
            <td className="num"><Pct v={change(c, basis)} /></td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
