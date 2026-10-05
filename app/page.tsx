import { delayedFeed } from "../lib/feed";
import { scoredCatalog } from "../lib/catalog";

export const dynamic = "force-dynamic";

function money(n: number | null) {
  return n == null ? "—" : `$${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

export default async function Home() {
  const feed = await delayedFeed();
  const early = scoredCatalog().filter((c) => c.scores.stage === 1 || c.scores.stage === 2);
  return (
    <main>
      <section className="hero">
        <h1>Cards, not a terminal.</h1>
        <p>Art and guide prices come from TCGdex (TCGPlayer market). That feed is delayed by about a day. The scout scores underneath are still estimated fixtures, not a sold tape.</p>
      </section>
      {feed.error && <p className="fine">Partial feed: {feed.error}</p>}
      <section className="board">
        {feed.rows.map((row) => (
          <article className="card" key={row.id}>
            {row.image ? <img src={row.image} alt={row.name} /> : <div />}
            <div className="meta">
              <span className="badge">DELAYED</span>
              <h2>{row.name}</h2>
              <div className="sub">{row.set} #{row.number} · {row.variant}</div>
              <div className="price">{money(row.market)}</div>
              <div className="fine">low {money(row.low)} · updated {row.updatedAt?.slice(0, 10) ?? "unknown"}</div>
            </div>
          </article>
        ))}
      </section>
      <section className="panel">
        <div className="k">Estimated early signals · no photos, fixture tape</div>
        {early.map((c) => (
          <a className="row" key={c.slug} href={`/cards/${c.slug}`}>
            <span>{c.name}</span>
            <span>S{c.scores.stage} · {c.scores.breakout}/100 · ESTIMATED</span>
          </a>
        ))}
      </section>
    </main>
  );
}
