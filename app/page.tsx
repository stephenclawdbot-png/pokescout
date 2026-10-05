import { ScoreBar } from "../components/ScoreBar";
import { breakoutScore, demandVsSupply, volumeAcceleration } from "../lib/scores";
import type { CardSignal } from "../lib/types";

const demo: CardSignal[] = [
  {
    slug: "pikachu-sp-demo",
    name: "Pikachu XXX/S-P",
    set: "S-P Promo",
    number: "XXX",
    language: "JP",
    distribution: "CAMPAIGN",
    price: 32,
    priceChange7d: 8,
    sales7d: 46,
    salesPrev7d: 18,
    activeListings: 49,
    activeListings7dAgo: 81,
    psa10Pop: 1340,
    popGrowth30d: 2.1,
    stage: 1,
    dataQuality: "ESTIMATED",
  },
];

export default function Home() {
  const c = demo[0];
  const vol = volumeAcceleration(c.sales7d, c.salesPrev7d);
  const listingRatio = c.activeListings / c.activeListings7dAgo;
  const dvs = demandVsSupply(vol, listingRatio);
  const score = breakoutScore(c);

  return (
    <main>
      <div className="grid">
        <ScoreBar label="Market temperature" value={62} />
        <ScoreBar label="Breakout score" value={score} />
        <ScoreBar label="Demand / supply" value={Math.round(Math.min(dvs, 9.9) * 10)} />
        <div className="panel">
          <div className="k">Data quality</div>
          <div className="v" style={{ fontSize: 14 }}>{c.dataQuality}</div>
        </div>
      </div>
      <section className="panel" style={{ marginTop: 12 }}>
        <div className="k">Early accumulation · Stage {c.stage}</div>
        <div className="row"><span>{c.name}</span><span className="tag">${c.price} · +{c.priceChange7d}% 7D</span></div>
        <div className="row"><span>7D sales</span><span>{c.salesPrev7d} → {c.sales7d}</span></div>
        <div className="row"><span>Active listings</span><span>{c.activeListings7dAgo} → {c.activeListings}</span></div>
        <div className="row"><span>PSA 10 pop / 30D growth</span><span>{c.psa10Pop} / +{c.popGrowth30d}%</span></div>
        <p style={{ color: "var(--muted)", fontSize: 12 }}>
          Demo row only. Live connectors are not wired. Flag pattern: volume accelerating, inventory contracting, price not fully repriced.
        </p>
      </section>
    </main>
  );
}
