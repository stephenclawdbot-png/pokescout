export type FeedRow = {
  id: string;
  name: string;
  set: string;
  number: string;
  variant: string;
  market: number | null;
  low: number | null;
  currency: string;
  updatedAt: string | null;
  image: string | null;
  source: "TCGdex";
  basis: "TCGPlayer market guide";
  dataQuality: "DELAYED";
};

const IDS = [
  "base1-4",
  "base1-58",
  "swsh7-215",
  "swsh12pt5gg-GG30",
  "swsh12pt5-160",
  "sv08-161",
];

type PriceBlock = { marketPrice?: number; lowPrice?: number; midPrice?: number };

function pick(pricing: Record<string, PriceBlock> | undefined) {
  if (!pricing) return { variant: "none", market: null, low: null };
  const order = ["holofoil", "normal", "reverse", "reverseHolofoil"];
  const key = order.find((k) => pricing[k]?.marketPrice != null) ?? Object.keys(pricing)[0];
  const block = key ? pricing[key] : undefined;
  return { variant: key ?? "none", market: block?.marketPrice ?? null, low: block?.lowPrice ?? null };
}

export async function delayedFeed(): Promise<{ fetchedAt: string; rows: FeedRow[]; error?: string }> {
  const rows: FeedRow[] = [];
  const errors: string[] = [];
  await Promise.all(
    IDS.map(async (id) => {
      try {
        const res = await fetch(`https://api.tcgdex.net/v2/en/cards/${id}`, {
          next: { revalidate: 3600 },
          headers: { Accept: "application/json" },
        });
        if (!res.ok) {
          errors.push(`${id} ${res.status}`);
          return;
        }
        const card = await res.json();
        const tcg = card.pricing?.tcgplayer;
        const picked = pick(tcg);
        rows.push({
          id: card.id,
          name: card.name,
          set: card.set?.name ?? "",
          number: card.localId ?? "",
          variant: picked.variant,
          market: picked.market,
          low: picked.low,
          currency: "USD",
          updatedAt: tcg?.updated ?? card.updated ?? null,
          image: card.image ? `${card.image}/high.webp` : null,
          source: "TCGdex",
          basis: "TCGPlayer market guide",
          dataQuality: "DELAYED",
        });
      } catch (err) {
        errors.push(`${id} ${err instanceof Error ? err.message : "fetch failed"}`);
      }
    })
  );
  rows.sort((a, b) => (b.market ?? 0) - (a.market ?? 0));
  return { fetchedAt: new Date().toISOString(), rows, error: errors.length ? errors.join("; ") : undefined };
}
