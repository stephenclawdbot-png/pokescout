"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { availableBases, BASIS_LABEL, breadth, change, decode, defaultBasis, indexMove, money, signed, type Basis, type Card, type Market, type RawMarket } from "../lib/market";
import { Overview } from "./Overview";
import { Screener, type Filters, EMPTY_FILTERS } from "./Screener";
import { SetsView } from "./SetsView";
import { SpeciesView } from "./SpeciesView";
import { CardDrawer } from "./CardDrawer";

type Tab = "market" | "screener" | "sets" | "species" | "watch";
const TABS: { key: Tab; label: string }[] = [
  { key: "market", label: "MARKET" },
  { key: "screener", label: "SCREENER" },
  { key: "sets", label: "SETS" },
  { key: "species", label: "POKÉMON" },
  { key: "watch", label: "WATCHLIST" },
];

const WATCH_KEY = "pokescout.watch";

function loadWatch(): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(WATCH_KEY) ?? "[]");
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

export function Terminal() {
  const [market, setMarket] = useState<Market | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("market");
  const [basis, setBasis] = useState<Basis>("eu7d");
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [selected, setSelected] = useState<Card | null>(null);
  const [watch, setWatch] = useState<string[]>([]);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/data/market.json")
      .then((r) => {
        if (!r.ok) throw new Error(`market.json ${r.status}`);
        return r.json() as Promise<RawMarket>;
      })
      .then((raw) => {
        const m = decode(raw);
        setMarket(m);
        setBasis(defaultBasis(m));
        const id = decodeURIComponent(location.hash.replace(/^#card=/, ""));
        if (id && m.byId.has(id)) setSelected(m.byId.get(id)!);
      })
      .catch((e) => setError(String(e)));
    setWatch(loadWatch());
  }, []);

  const toggleWatch = useCallback((id: string) => {
    setWatch((w) => {
      const next = w.includes(id) ? w.filter((x) => x !== id) : [...w, id];
      try {
        localStorage.setItem(WATCH_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  }, []);

  const open = useCallback((c: Card | null) => {
    setSelected(c);
    try {
      history.replaceState(null, "", c ? `#card=${encodeURIComponent(c.id)}` : location.pathname + location.search);
    } catch {}
  }, []);

  const drill = useCallback((f: Partial<Filters>) => {
    setFilters({ ...EMPTY_FILTERS, ...f });
    setTab("screener");
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      const typing = t.tagName === "INPUT" || t.tagName === "SELECT" || t.tagName === "TEXTAREA";
      if (e.key === "Escape") {
        if (selected) open(null);
        else if (typing) t.blur();
        return;
      }
      if (typing || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "/") {
        e.preventDefault();
        searchRef.current?.focus();
      } else if (/^[1-5]$/.test(e.key)) {
        setTab(TABS[Number(e.key) - 1].key);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected, open]);

  const header = useMemo(() => {
    if (!market) return null;
    const priced = market.cards.filter((c) => c.price != null);
    const cap = priced.reduce((s, c) => s + (c.price ?? 0), 0);
    const liquid = priced.filter((c) => (c.price ?? 0) >= 1);
    const br = breadth(liquid, basis);
    const all = indexMove(liquid, basis);
    return { priced: priced.length, cap, br, all };
  }, [market, basis]);

  const tape = useMemo(() => {
    if (!market) return [];
    return market.cards
      .filter((c) => (c.price ?? 0) >= 10 && change(c, basis) != null && (basis !== "eu7d" || c.confirmed))
      .sort((a, b) => Math.abs(change(b, basis)!) - Math.abs(change(a, basis)!))
      .slice(0, 40);
  }, [market, basis]);

  if (error)
    return (
      <div className="loading">
        Could not load market data ({error}). Run <span className="amber">npm run ingest</span> to build public/data/market.json.
      </div>
    );
  if (!market || !header) return <div className="loading">LOADING MARKET · ~20,000 CARDS…</div>;

  const bases = availableBases(market);

  return (
    <div className="term">
      <header className="topbar">
        <div className="brand">
          POKÉSCOUT <b>TERMINAL</b>
        </div>
        <div className="stats">
          <span className="stat"><span className="k">CARDS</span>{market.cards.length.toLocaleString("en-US")}</span>
          <span className="stat"><span className="k">PRICED</span>{header.priced.toLocaleString("en-US")}</span>
          <span className="stat"><span className="k">1× EACH</span>{money(header.cap)}</span>
          <span className="stat">
            <span className="k">PKMN-ALL</span>
            <span className={(header.all.pct ?? 0) >= 0 ? "up" : "down"}>{signed(header.all.pct)}</span>
          </span>
          <span className="stat">
            <span className="k">BREADTH</span>
            <span className="up">▲{header.br.up.toLocaleString("en-US")}</span> <span className="down">▼{header.br.down.toLocaleString("en-US")}</span>
          </span>
          <span className="stat"><span className="k">EURUSD</span>{market.fx.toFixed(4)}</span>
          <span className="stat"><span className="k">AS OF</span>{market.asOf}</span>
        </div>
        <label className="cmd">
          <span>&gt;</span>
          <input
            ref={searchRef}
            placeholder="SEARCH CARD / SET / ARTIST  ( / )"
            value={filters.q}
            onChange={(e) => {
              setFilters((f) => ({ ...f, q: e.target.value }));
              setTab("screener");
            }}
          />
        </label>
      </header>

      {tape.length > 0 && (
        <div className="tape" aria-label="biggest movers">
          <div className="tape-inner">
            {[...tape, ...tape].map((c, i) => {
              const ch = change(c, basis)!;
              return (
                <span key={i} className="tape-item" onClick={() => open(c)}>
                  <span className="muted">{c.name.toUpperCase()}</span> <span className="dim">{c.set.name}</span> {money(c.price)}{" "}
                  <span className={ch >= 0 ? "up" : "down"}>
                    {ch >= 0 ? "▲" : "▼"}
                    {signed(ch)}
                  </span>
                </span>
              );
            })}
          </div>
        </div>
      )}

      <nav className="tabs">
        {TABS.map((t, i) => (
          <button key={t.key} className={`tab${tab === t.key ? " on" : ""}`} onClick={() => setTab(t.key)}>
            <span className="fk">{i + 1}</span>
            {t.label}
            {t.key === "watch" && watch.length ? ` (${watch.length})` : ""}
          </button>
        ))}
        <span className="spacer" />
        <span className="note">
          MOVE BASIS{" "}
          {bases.map((b) => (
            <button key={b} className={`chip${basis === b ? " on" : ""}`} onClick={() => setBasis(b)} title={BASIS_LABEL[b]} style={{ marginLeft: 4 }}>
              {b.toUpperCase()}
            </button>
          ))}
        </span>
      </nav>

      <main className="body">
        {tab === "market" && <Overview market={market} basis={basis} onOpen={open} onDrill={drill} />}
        {tab === "screener" && <Screener market={market} basis={basis} filters={filters} setFilters={setFilters} onOpen={open} selected={selected} watch={watch} toggleWatch={toggleWatch} />}
        {tab === "sets" && <SetsView market={market} basis={basis} onDrill={drill} />}
        {tab === "species" && <SpeciesView market={market} basis={basis} onDrill={drill} onOpen={open} />}
        {tab === "watch" && (
          <Screener
            market={market}
            basis={basis}
            filters={{ ...filters, watchOnly: true }}
            setFilters={setFilters}
            onOpen={open}
            selected={selected}
            watch={watch}
            toggleWatch={toggleWatch}
            emptyNote="No cards on your watchlist yet. Open any card and press ☆ to track it. Stored in this browser only."
          />
        )}
      </main>

      {selected && <CardDrawer market={market} card={selected} basis={basis} onClose={() => open(null)} onOpen={open} watched={watch.includes(selected.id)} toggleWatch={toggleWatch} />}
    </div>
  );
}
