export type FeedRow = {
  id: string;
  name: string;
  set: string;
  number: string;
  variant: string;
  market: number | null;
  low: number | null;
  updatedAt: string | null;
  image: string | null;
  url: string | null;
  source: "pokemontcg.io";
  basis: "TCGPlayer market guide";
  dataQuality: "DELAYED";
};

const IDS = ["base1-4", "swsh7-215", "sv3pt5-25", "swsh12pt5-160", "base1-58"];

type PriceBlock = { market?: number; low?: number; mid?: number };

function pickPrice(prices: Record<string, PriceBlock> | undefined) {
  if (!prices) return { variant: "none", market: null, low: null };
  const order = ["holofoil", "unlimitedHolofoil", "1stEditionHolofoil", "normal", "reverseHolofoil"];
  const key = order.find((k) => prices[k]?.market != null) ?? Object.keys(prices)[0];
  const block = key ? prices[key] : undefined;
  return { variant: key ?? "none", market: block?.market ?? null, low: block?.low ?? null };
}

export async function delayedFeed(): Promise<{ fetchedAt: string; rows: FeedRow[]; error?: string }> {
  const rows: FeedRow[] = [];
  const errors: string[] = [];
  await Promise.all(
    IDS.map(async (id) => {
      try {
        const res = await fetch(`https://api.pokemontcg.io/v2/cards/${id}`, {
          next: { revalidate: 3600 },
          headers: { Accept: "application/json" },
        });
        if (!res.ok) {
          errors.push(`${id} ${res.status}`);
          return;
        }
        const body = await res.json();
        const card = body.data;
        const picked = pickPrice(card.tcgplayer?.prices);
        rows.push({
          id: card.id,
          name: card.name,
          set: card.set?.name ?? "",
          number: card.number ?? "",
          variant: picked.variant,
          market: picked.market,
          low: picked.low,
          updatedAt: card.tcgplayer?.updatedAt ?? null,
          image: card.images?.small ?? null,
          url: card.tcgplayer?.url ?? null,
          source: "pokemontcg.io",
          basis: "TCGPlayer market guide",
          dataQuality: "DELAYED",
        });
      } catch (err) {
        errors.push(`${id} ${err instanceof Error ? err.message : "fetch failed"}`);
      }
    })
  );
  rows.sort((a, b) => (b.market ?? 0) - (a.market ?? 0));
  return {
    fetchedAt: new Date().toISOString(),
    rows,
    error: errors.length ? errors.join("; ") : undefined,
  };
}
