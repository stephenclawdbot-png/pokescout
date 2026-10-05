import { delayedFeed } from "../../lib/feed";

export const dynamic = "force-dynamic";

export default async function FeedPage() {
  const feed = await delayedFeed();
  return (
    <main>
      <section className="hero">
        <h1>Delayed guide feed</h1>
        <p>TCGdex official art plus TCGPlayer market prices. Not eBay sold velocity. JSON at /api/feed.</p>
      </section>
      {feed.error && <p className="fine">Partial: {feed.error}</p>}
      <section className="board">
        {feed.rows.map((row) => (
          <article className="card" key={row.id}>
            {row.image ? <img src={row.image} alt={row.name} /> : null}
            <div className="meta">
              <span className="badge">DELAYED</span>
              <h2>{row.name}</h2>
              <div className="price">{row.market != null ? `$${row.market}` : "no market"}</div>
              <div className="fine">{row.set} · {row.updatedAt ?? "unknown"}</div>
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
