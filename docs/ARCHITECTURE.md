# Architecture

```
scripts/ingest.mjs ──► public/data/market.json        (all cards, current prices + moves)
   ▲                └► public/data/history/<set>.json (daily USD snapshots)
   │
   ├─ pokemontcg.io  /v2/cards (bulk, 250/page): universe, set metadata, images, TCGplayer prices
   └─ TCGdex /v2/en/cards/<id> (per card): Cardmarket avg1/avg7/avg30/trend
                                                      │
app/page.tsx → components/Terminal.tsx  ◄── fetch ────┘   (client-side: decode, aggregate, render)
```

- **Ingest** runs nightly in GitHub Actions. It refuses to publish if pokemontcg.io returns < 98% of cards, so a flaky night leaves yesterday's data in place. If TCGdex fails, the run still publishes USD data without EUR momentum.
- **Join**: TCGdex sets are matched to pokemontcg.io sets by normalized name (closest release date breaks ties), then cards by normalized number. Cardmarket blocks older than 7 days are dropped.
- **Printing**: one row per card. The TCGplayer price uses the main printing (holo → normal → unlimited → 1st edition → reverse).
- **Client**: `lib/market.ts` decodes the compact row format and computes derived fields (EU 1D/7D, trend agreement, US/EU gap), indices, breadth, and set/Pokémon aggregates. The screener is a hand-rolled virtualized grid, so all ~20k rows stay interactive.

## Not built yet

Graded (PSA/CGC/BGS) prices and population, Japanese cards, per-printing rows (reverse holo / 1st edition as separate tickers), sold-volume and listing-depth signals, alerts. The data-source notes in `DATA_SOURCES.md` list what each would need.
