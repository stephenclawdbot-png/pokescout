import { scoredCatalog } from "../lib/catalog";

export default function Home() {
  const cards = scoredCatalog();
  const early = cards.filter((c) => c.scores.stage === 1 || c.scores.stage === 2).sort((a, b) => b.scores.accumulation - a.scores.accumulation);
  const supply = cards.filter((c) => c.activeListings < c.activeListings7dAgo * 0.75);
  const temp = Math.round(cards.reduce((s, c) => s + c.scores.breakout, 0) / Math.max(cards.length, 1));

  return (
    <main>
      <div className="grid">
        <div className="panel"><div className="k">Market temperature</div><div className="v">{temp}</div></div>
        <div className="panel"><div className="k">Stage 1-2</div><div className="v">{early.length}</div></div>
        <div className="panel"><div className="k">Supply shocks</div><div className="v">{supply.length}</div></div>
        <div className="panel"><div className="k">Data quality</div><div className="v" style={{ fontSize: 14 }}>ESTIMATED</div></div>
      </div>
      <p style={{ color: "var(--muted)", fontSize: 12 }}>Fixture tape. Scores are model-inferred. No live feed. Primary metric is demand acceleration / supply acceleration. Stage 5 is not alerted.</p>
      <section className="panel" style={{ marginTop: 12 }}>
        <div className="k">Early accumulation</div>
        {early.map((c) => (
          <a key={c.slug} href={`/cards/${c.slug}`} className="row">
            <span>{c.name}<div style={{ color: "var(--muted)" }}>{c.set} / {c.language} / {c.distribution}</div></span>
            <span>${c.price} {c.priceChange7d >= 0 ? "+" : ""}{c.priceChange7d}%</span>
            <span className="tag">S{c.scores.stage} {c.scores.stageLabel}</span>
            <span>{c.scores.breakout}/100</span>
            <span>D/S {c.scores.demandSupplyRatio}x</span>
          </a>
        ))}
      </section>
      <section className="panel" style={{ marginTop: 12 }}>
        <div className="k">Supply shocks</div>
        {supply.map((c) => (
          <a key={c.slug} href={`/cards/${c.slug}`} className="row">
            <span>{c.name}</span>
            <span>{c.activeListings7dAgo} to {c.activeListings}</span>
            <span>Acc {c.scores.accumulation}</span>
            <span />
            <span>ESTIMATED</span>
          </a>
        ))}
      </section>
    </main>
  );
}
