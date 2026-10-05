import { delayedFeed } from "../../lib/feed";

export const dynamic = "force-dynamic";

export default async function FeedPage() {
  const feed = await delayedFeed();
  return (
    <main>
      <div className="k">DELAYED DATA · TCGPlayer market guide · pokemontcg.io · cached 1h</div>
      <p className="k">This is a price guide, not a sold tape. No volume, no inventory absorption, no PSA population. Cardmarket on this source can lag; only the TCGPlayer block is shown.</p>
      {feed.error && <p className="k">Partial: {feed.error}</p>}
      <section className="panel" style={{ marginTop: 12 }}>
        {feed.rows.map((row) => (
          <div className="row" key={row.id}>
            <span>
              {row.name}
              <div className="k">{row.set} #{row.number} · {row.variant} · updated {row.updatedAt ?? "unknown"}</div>
            </span>
            <span>
              {row.market != null ? `$${row.market}` : "no market"}
              <div className="k">low {row.low != null ? `$${row.low}` : "—"} · DELAYED</div>
            </span>
          </div>
        ))}
        {feed.rows.length === 0 && <p>Feed empty. The upstream API did not return cards.</p>}
      </section>
    </main>
  );
}
