export type FeedRow = {
  id: string;
  name: string;
  set: string;
  number: string;
  variant: string;
  market: number | null;
  low: number | null;
  eurTrend: number | null;
  updatedAt: string | null;
  image: string | null;
  source: "tcgdex" | "pokemontcg.io";
  dataQuality: "DELAYED";
};

const IDS = [
  "base1-4",
  "base1-58",
  "swsh7-215",
  "sv03.5-025",
  "sv03.5-199",
  "swsh12.5-160",
  "sv03.5-006",
  "swsh12-186",
];

const POKEMON_ID: Record<string, string> = {
  "sv03.5-025": "sv3pt5-25",
  "sv03.5-199": "sv3pt5-199",
  "sv03.5-006": "sv3pt5-6",
  "swsh12.5-160": "swsh12pt5-160",
};

async function fromTcgdex(id: string): Promise<FeedRow | null> {
  const res = await fetch(`https://api.tcgdex.net/v2/en/cards/${id}`, { next: { revalidate: 3600 } });
  if (!res.ok) return null;
  const c = await res.json();
  const tcg = c.pricing?.tcgplayer ?? {};
  const variant = tcg.holofoil || tcg.normal || tcg["reverse-holofoil"] || null;
  const key = tcg.holofoil ? "holofoil" : tcg.normal ? "normal" : "reverse-holofoil";
  return {
    id,
    name: c.name ?? id,
    set: c.set?.name ?? "",
    number: String(c.localId ?? ""),
    variant: key,
    market: variant?.marketPrice ?? null,
    low: variant?.lowPrice ?? null,
    eurTrend: c.pricing?.cardmarket?.trend ?? null,
    updatedAt: tcg.updated ?? c.pricing?.cardmarket?.updated ?? null,
    image: c.image ? `${c.image}/high.webp` : null,
    source: "tcgdex",
    dataQuality: "DELAYED",
  };
}

async function fromPokemonTcg(id: string): Promise<FeedRow | null> {
  const pid = POKEMON_ID[id] ?? id;
  const res = await fetch(`https://api.pokemontcg.io/v2/cards/${pid}`, {
    next: { revalidate: 3600 },
    headers: { Accept: "application/json" },
  });
  if (!res.ok) return null;
  const card = (await res.json()).data;
  const prices = card.tcgplayer?.prices ?? {};
  const order = ["holofoil", "unlimitedHolofoil", "normal", "reverseHolofoil"];
  const key = order.find((k) => prices[k]?.market != null) ?? Object.keys(prices)[0];
  const block = key ? prices[key] : undefined;
  return {
    id,
    name: card.name,
    set: card.set?.name ?? "",
    number: card.number ?? "",
    variant: key ?? "none",
    market: block?.market ?? null,
    low: block?.low ?? null,
    eurTrend: null,
    updatedAt: card.tcgplayer?.updatedAt ?? null,
    image: card.images?.large ?? card.images?.small ?? null,
    source: "pokemontcg.io",
    dataQuality: "DELAYED",
  };
}

export async function delayedFeed(): Promise<{ fetchedAt: string; rows: FeedRow[]; error?: string }> {
  const rows: FeedRow[] = [];
  const errors: string[] = [];
  await Promise.all(
    IDS.map(async (id) => {
      try {
        const row = (await fromTcgdex(id)) ?? (await fromPokemonTcg(id));
        if (!row || !row.image) errors.push(`${id} empty`);
        else rows.push(row);
      } catch (err) {
        errors.push(`${id} ${err instanceof Error ? err.message : "failed"}`);
      }
    })
  );
  rows.sort((a, b) => (b.market ?? 0) - (a.market ?? 0));
  return { fetchedAt: new Date().toISOString(), rows, error: errors.length ? errors.join("; ") : undefined };
}
