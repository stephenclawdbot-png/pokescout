const IDS = ["base1-4", "swsh7-215", "sv03.5-025", "swsh12.5-160", "sv03.5-199"];

export async function GET() {
  const cards = await Promise.all(
    IDS.map(async (id) => {
      const res = await fetch(`https://api.tcgdex.net/v2/en/cards/${id}`, { next: { revalidate: 3600 } });
      if (!res.ok) return { id, ok: false };
      const c = await res.json();
      const tcg = c.pricing?.tcgplayer ?? {};
      const variant = tcg.holofoil || tcg.normal || tcg["reverse-holofoil"] || null;
      const cm = c.pricing?.cardmarket ?? null;
      return {
        id: c.id,
        name: c.name,
        set: c.set?.name ?? null,
        number: c.localId ?? null,
        image: c.image ? `${c.image}/low.webp` : null,
        usdMarket: variant?.marketPrice ?? null,
        usdLow: variant?.lowPrice ?? null,
        usdUpdated: tcg.updated ?? null,
        eurTrend: cm?.trend ?? null,
        eurAvg7: cm?.["avg7"] ?? null,
        eurUpdated: cm?.updated ?? null,
        quality: "DELAYED",
        source: "TCGdex guide (TCGPlayer hourly, Cardmarket daily)",
        ok: true,
      };
    })
  );
  return Response.json({
    quality: "DELAYED",
    note: "Guide prices only. Not sold velocity, listings, or PSA population.",
    fetchedAt: new Date().toISOString(),
    cards: cards.filter((c) => c.ok),
  });
}
