"use client";

import { useEffect, useMemo, useState } from "react";
import { change, imgLarge, imgUrl, money, type Basis, type Card, type Market } from "../lib/market";
import { Pct, Spark } from "./ui";

type History = { dates: string[]; prices: Record<string, (number | null)[]> };
const cache = new Map<string, Promise<History | null>>();

function loadHistory(setId: string) {
  if (!cache.has(setId)) {
    cache.set(
      setId,
      fetch(`/data/history/${encodeURIComponent(setId)}.json`)
        .then((r) => (r.ok ? (r.json() as Promise<History>) : null))
        .catch(() => null)
    );
  }
  return cache.get(setId)!;
}

const VARIANT: Record<string, string> = { H: "Holofoil", N: "Normal", UH: "Unlimited holo", U: "Unlimited", "1H": "1st Ed holo", "1N": "1st Ed", "1": "1st Ed", R: "Reverse holo" };

type Props = { market: Market; card: Card; basis: Basis; onClose: () => void; onOpen: (c: Card) => void; watched: boolean; toggleWatch: (id: string) => void };

export function CardDrawer({ market, card: c, basis, onClose, onOpen, watched, toggleWatch }: Props) {
  const [hist, setHist] = useState<{ dates: string[]; values: (number | null)[] } | null>(null);

  useEffect(() => {
    let live = true;
    setHist(null);
    loadHistory(c.set.id).then((h) => {
      if (live && h) setHist({ dates: h.dates, values: h.prices[c.id] ?? [] });
    });
    return () => {
      live = false;
    };
  }, [c]);

  const comps = useMemo(
    () => (c.dex ? market.cards.filter((x) => x.dex === c.dex && x.id !== c.id && x.price != null).sort((a, b) => b.price! - a.price!).slice(0, 12) : []),
    [market, c]
  );

  const q = encodeURIComponent(`${c.name} ${c.number}/${c.set.printed} ${c.set.name}`);
  const points = hist?.values.filter((v) => v != null).length ?? 0;

  return (
    <>
      <div className="scrim" onClick={onClose} />
      <aside className="drawer" role="dialog" aria-label={c.name}>
        <div className="ph">
          <h3>{c.id}</h3>
          <div className="ctl">
            <button className={`chip${watched ? " on" : ""}`} onClick={() => toggleWatch(c.id)}>
              {watched ? "★ WATCHING" : "☆ WATCH"}
            </button>
            <button className="close" onClick={onClose} aria-label="close">
              ESC ✕
            </button>
          </div>
        </div>
        <div className="dhead">
          {c.img ? <img src={imgLarge(c)} alt={c.name} onError={(e) => (e.currentTarget.src = imgUrl(c))} /> : null}
          <div style={{ minWidth: 0 }}>
            <h2>{c.name}</h2>
            <div className="muted">
              {c.set.name} · #{c.number}/{c.set.printed}
            </div>
            <div className="dim">
              {c.set.series} · {c.set.release}
            </div>
            <div className="big">{money(c.price)}</div>
            <div>
              <Pct v={change(c, basis)} /> <span className="dim">{basis.toUpperCase()}</span>
            </div>
            <div className="kv">
              <span className="k">RARITY</span>
              <span>{c.rarity || "—"}</span>
              <span className="k">PRINTING</span>
              <span>{VARIANT[c.variant] ?? (c.variant || "—")}</span>
              <span className="k">TCGP MARKET</span>
              <span>{money(c.usd)}</span>
              <span className="k">TCGP LOW</span>
              <span>{money(c.usdLow)}</span>
              <span className="k">US 1D / 7D / 30D</span>
              <span>
                <Pct v={c.usd1d} /> / <Pct v={c.usd7d} /> / <Pct v={c.usd30d} />
              </span>
              <span className="k">CM TREND</span>
              <span>
                {money(c.eurTrend, "€")} <span className="dim">{c.eurTrend != null ? `≈ ${money(c.eurTrend * market.fx)}` : ""}</span>
              </span>
              <span className="k">CM AVG 1/7/30</span>
              <span>
                {money(c.eurAvg1, "€")} / {money(c.eurAvg7, "€")} / {money(c.eurAvg30, "€")}
              </span>
              <span className="k">EU 1D / 7D</span>
              <span>
                <Pct v={c.eu1d} /> / <Pct v={c.eu7d} /> {c.eu7d != null && <span className="dim">{c.confirmed ? "trend agrees" : "trend disagrees"}</span>}
              </span>
              <span className="k">US vs EU</span>
              <span>
                <Pct v={c.spread} />
              </span>
              <span className="k">ARTIST</span>
              <span>{c.artist || "—"}</span>
            </div>
          </div>
        </div>
        <div className="links">
          <a href={`https://prices.pokemontcg.io/tcgplayer/${c.id}`} target="_blank" rel="noreferrer">TCGplayer ↗</a>
          <a href={`https://prices.pokemontcg.io/cardmarket/${c.id}`} target="_blank" rel="noreferrer">Cardmarket ↗</a>
          <a href={`https://www.ebay.com/sch/i.html?_nkw=${q}&LH_Sold=1&LH_Complete=1`} target="_blank" rel="noreferrer">eBay sold ↗</a>
          <a href={`https://www.pricecharting.com/search-products?q=${q}&type=prices`} target="_blank" rel="noreferrer">PriceCharting ↗</a>
        </div>

        <div className="sect">
          <h4>TCGPLAYER MARKET · DAILY</h4>
          {hist && points >= 2 ? (
            <>
              <Spark values={hist.values} />
              <div className="dim" style={{ display: "flex", justifyContent: "space-between" }}>
                <span>{hist.dates[0]}</span>
                <span>{hist.dates[hist.dates.length - 1]}</span>
              </div>
            </>
          ) : (
            <div className="dim">
              {hist ? `${points} daily snapshot${points === 1 ? "" : "s"} so far — the chart fills in as the daily ingest runs.` : "loading…"}
            </div>
          )}
        </div>

        {comps.length > 0 && (
          <div className="sect">
            <h4>OTHER {comps[0] ? `#${c.dex}` : ""} CARDS</h4>
            <table className="list">
              <tbody>
                {comps.map((x) => (
                  <tr key={x.id} className="click" onClick={() => onOpen(x)}>
                    <td><img className="thumb" src={imgUrl(x)} alt="" loading="lazy" /></td>
                    <td className="nm">
                      {x.name} <span className="dim">{x.set.name}</span>
                    </td>
                    <td className="num">{money(x.price)}</td>
                    <td className="num"><Pct v={change(x, basis)} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </aside>
    </>
  );
}
