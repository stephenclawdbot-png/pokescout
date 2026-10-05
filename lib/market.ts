// Client-side model for public/data/market.json (written by scripts/ingest.mjs).

export type RawMarket = {
  generatedAt: string;
  asOf: string;
  historyDays: number;
  fx: { eurUsd: number };
  sources: Record<string, string>;
  sets: [string, string, string, string, number, number, string, string][];
  cols: string[];
  rows: (string | number | null)[][];
};

export type SetInfo = {
  idx: number;
  id: string;
  name: string;
  series: string;
  release: string;
  printed: number;
  total: number;
  symbol: string;
  logo: string;
};

export type Card = {
  id: string;
  name: string;
  set: SetInfo;
  number: string;
  rarity: string;
  supertype: string;
  img: string;
  usd: number | null;
  usdLow: number | null;
  variant: string;
  eurTrend: number | null;
  eurAvg1: number | null;
  eurAvg7: number | null;
  eurAvg30: number | null;
  eurLow: number | null;
  usd1d: number | null;
  usd7d: number | null;
  usd30d: number | null;
  dex: number;
  artist: string;
  // derived
  price: number | null; // USD, falling back to Cardmarket trend converted at today's FX
  eu1d: number | null; // Cardmarket avg1 vs avg7
  eu7d: number | null; // Cardmarket avg7 vs avg30
  euTrend: number | null; // Cardmarket trend vs avg30
  spread: number | null; // TCGplayer USD vs Cardmarket trend (USD) — positive = US richer
  confirmed: boolean; // avg7 and trend both moved the same direction vs avg30
  euClean: boolean; // confirmed, and both averages sit within 1.75× of the US price (filters condition-mix noise)
};

export type Market = {
  generatedAt: string;
  asOf: string;
  historyDays: number;
  fx: number;
  sources: Record<string, string>;
  sets: SetInfo[];
  cards: Card[];
  byId: Map<string, Card>;
};

const pct = (now: number | null, then: number | null) =>
  now != null && then != null && then > 0 ? Math.round((now / then - 1) * 1000) / 10 : null;

export function decode(raw: RawMarket): Market {
  const sets: SetInfo[] = raw.sets.map((s, idx) => ({
    idx,
    id: s[0],
    name: s[1],
    series: s[2],
    release: s[3],
    printed: s[4],
    total: s[5],
    symbol: s[6],
    logo: s[7],
  }));
  const fx = raw.fx.eurUsd;
  const ci = Object.fromEntries(raw.cols.map((c, i) => [c, i]));
  const num = (r: (string | number | null)[], k: string) => r[ci[k]] as number | null;
  const str = (r: (string | number | null)[], k: string) => (r[ci[k]] as string) ?? "";
  const cards: Card[] = raw.rows.map((r) => {
    const eurTrend = num(r, "eurTrend");
    const eurAvg1 = num(r, "eurAvg1");
    const eurAvg7 = num(r, "eurAvg7");
    const eurAvg30 = num(r, "eurAvg30");
    const usd = num(r, "usd");
    const eu7d = pct(eurAvg7, eurAvg30);
    const euTrend = pct(eurTrend, eurAvg30);
    const confirmed = eu7d != null && euTrend != null && Math.sign(eu7d) === Math.sign(euTrend);
    const near = (eur: number | null) => eur != null && usd != null && eur * fx > usd / 1.75 && eur * fx < usd * 1.75;
    const eurUsd = eurTrend != null ? eurTrend * fx : null;
    // Beyond 4× apart the two markets are almost always pricing different printings, not a real gap.
    const comparable = usd != null && eurUsd != null && usd / eurUsd < 4 && eurUsd / usd < 4;
    return {
      id: str(r, "id"),
      name: str(r, "name"),
      set: sets[num(r, "set") as number],
      number: str(r, "number"),
      rarity: str(r, "rarity"),
      supertype: str(r, "supertype"),
      img: str(r, "img"),
      usd,
      usdLow: num(r, "usdLow"),
      variant: str(r, "variant"),
      eurTrend,
      eurAvg1,
      eurAvg7,
      eurAvg30,
      eurLow: num(r, "eurLow"),
      usd1d: num(r, "usd1d"),
      usd7d: num(r, "usd7d"),
      usd30d: num(r, "usd30d"),
      dex: (num(r, "dex") as number) ?? 0,
      artist: str(r, "artist"),
      price: usd ?? (eurTrend != null ? Math.round(eurTrend * fx * 100) / 100 : null),
      eu1d: pct(eurAvg1, eurAvg7),
      eu7d,
      euTrend,
      spread: comparable ? pct(usd, eurUsd) : null,
      confirmed,
      euClean: confirmed && near(eurAvg7) && near(eurAvg30),
    };
  });
  return {
    generatedAt: raw.generatedAt,
    asOf: raw.asOf,
    historyDays: raw.historyDays,
    fx,
    sources: raw.sources,
    sets,
    cards,
    byId: new Map(cards.map((c) => [c.id, c])),
  };
}

// ---------- signal selection ----------

export type Basis = "eu7d" | "us1d" | "us7d" | "us30d";

export const BASIS_LABEL: Record<Basis, string> = {
  eu7d: "7D · Cardmarket avg7 vs avg30, cross-checked",
  us1d: "1D · TCGplayer market",
  us7d: "7D · TCGplayer market",
  us30d: "30D · TCGplayer market",
};

// The move used for rankings, indices and breadth. EU moves only count when cross-checked (euClean);
// the raw Cardmarket figures stay visible in the screener columns.
export function change(c: Card, b: Basis): number | null {
  if (b === "eu7d") return c.euClean ? c.eu7d : null;
  if (b === "us1d") return c.usd1d;
  if (b === "us7d") return c.usd7d;
  return c.usd30d;
}

export function availableBases(m: Market): Basis[] {
  const out: Basis[] = ["eu7d"];
  if (m.historyDays >= 2) out.push("us1d");
  if (m.historyDays >= 6) out.push("us7d");
  if (m.historyDays >= 27) out.push("us30d");
  return out;
}

export function defaultBasis(m: Market): Basis {
  return m.historyDays >= 6 ? "us7d" : "eu7d";
}

// Median move across the basket. A price-weighted sum gets dragged around by one or two
// thin, expensive cards (a single high-grade sale moves a vintage holo's 7-day average 2×),
// so every index, set, era and Pokémon move is the median card move instead.
export function indexMove(cards: Card[], b: Basis): { pct: number | null; n: number } {
  const moves: number[] = [];
  for (const c of cards) {
    const ch = change(c, b);
    if (ch != null) moves.push(ch);
  }
  if (!moves.length) return { pct: null, n: 0 };
  moves.sort((x, y) => x - y);
  const mid = moves.length >> 1;
  const med = moves.length % 2 ? moves[mid] : (moves[mid - 1] + moves[mid]) / 2;
  return { pct: Math.round(med * 10) / 10, n: moves.length };
}

export function breadth(cards: Card[], b: Basis, band = 2) {
  let up = 0;
  let down = 0;
  let flat = 0;
  for (const c of cards) {
    const ch = change(c, b);
    if (ch == null) continue;
    if (ch > band) up++;
    else if (ch < -band) down++;
    else flat++;
  }
  return { up, down, flat };
}

// ---------- groupings ----------

export const ERAS: { key: string; label: string; series: string[] }[] = [
  { key: "wotc", label: "WOTC VINTAGE", series: ["Base", "Gym", "Neo", "E-Card"] },
  { key: "mid", label: "EX → B&W", series: ["EX", "POP", "NP", "Diamond & Pearl", "Platinum", "HeartGold & SoulSilver", "Black & White"] },
  { key: "modern", label: "XY → SWSH", series: ["XY", "Sun & Moon", "Sword & Shield"] },
  { key: "current", label: "S&V → MEGA", series: ["Scarlet & Violet", "Mega Evolution"] },
];

const CHASE = /illustration|secret|hyper|rainbow|gold|shiny|trainer gallery|ace spec|amazing|radiant|legend|star|crystal|prime/i;
export const isChase = (c: Card) => CHASE.test(c.rarity);

export type SetAgg = {
  set: SetInfo;
  cards: number;
  priced: number;
  value: number; // cost of one copy of every priced card, USD
  top: Card | null;
  move: number | null;
  up: number;
  down: number;
};

export function aggregateSets(m: Market, b: Basis): SetAgg[] {
  const groups = new Map<number, Card[]>();
  for (const c of m.cards) {
    const g = groups.get(c.set.idx);
    if (g) g.push(c);
    else groups.set(c.set.idx, [c]);
  }
  return m.sets
    .filter((s) => groups.has(s.idx))
    .map((s) => {
      const cs = groups.get(s.idx)!;
      let value = 0;
      let priced = 0;
      let top: Card | null = null;
      for (const c of cs) {
        if (c.price == null) continue;
        value += c.price;
        priced++;
        if (!top || c.price > (top.price ?? 0)) top = c;
      }
      const br = breadth(cs, b);
      return { set: s, cards: cs.length, priced, value, top, move: indexMove(cs, b).pct, up: br.up, down: br.down };
    });
}

export type SpeciesAgg = {
  dex: number;
  label: string;
  cards: number;
  value: number;
  top: Card | null;
  move: number | null;
  members: Card[];
};

export function aggregateSpecies(m: Market, b: Basis): SpeciesAgg[] {
  const groups = new Map<number, Card[]>();
  for (const c of m.cards) {
    if (!c.dex) continue;
    const g = groups.get(c.dex);
    if (g) g.push(c);
    else groups.set(c.dex, [c]);
  }
  return [...groups.entries()].map(([dex, cs]) => {
    let value = 0;
    let top: Card | null = null;
    for (const c of cs) {
      if (c.price == null) continue;
      value += c.price;
      if (!top || c.price > (top.price ?? 0)) top = c;
    }
    return { dex, label: speciesLabel(cs), cards: cs.length, value, top, move: indexMove(cs, b).pct, members: cs };
  });
}

// The shortest card name for a Pokédex number is almost always the bare species name.
function speciesLabel(cs: Card[]) {
  let best = cs[0].name;
  for (const c of cs) if (c.name.length < best.length) best = c.name;
  return best;
}

// ---------- formatting ----------

export function money(n: number | null | undefined, cur = "$") {
  if (n == null) return "—";
  if (n >= 1_000_000) return `${cur}${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 10_000) return `${cur}${(n / 1000).toFixed(1)}K`;
  if (n >= 100) return `${cur}${Math.round(n).toLocaleString("en-US")}`;
  return `${cur}${n.toFixed(2)}`;
}

export function signed(n: number | null | undefined, digits = 1) {
  if (n == null) return "—";
  return `${n > 0 ? "+" : ""}${n.toFixed(digits)}%`;
}

export const imgUrl = (c: Card) => (c.img ? `https://images.pokemontcg.io/${c.img}` : "");
export const imgLarge = (c: Card) => (c.img ? `https://images.pokemontcg.io/${c.img.replace(/\.png$/, "_hires.png")}` : "");
