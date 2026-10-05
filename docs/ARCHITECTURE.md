# PokéScout architecture

PokéScout is a market-intelligence desk for the Pokémon TCG, not a price tracker. It ranks cards by how much proven demand exists relative to sellable supply, and it never treats a score as a price forecast.

## Pipeline

1. Ingest marketplace observations (listings, solds, removals) with a source label.
2. Normalize identity: SET + CARD NUMBER + LANGUAGE + VARIANT + PRINT + CONDITION + GRADING COMPANY + GRADE.
3. Deduplicate the same physical card across relists when seller, images, and timestamps allow it.
4. Snapshot populations (PSA / CGC / BGS) on a daily cadence.
5. Compute velocity, absorption, listing-wall, cross-market, and population features.
6. Score: Demand, Scarcity, Liquidity, Collector Appeal, Accumulation, Breakout, Risk.
7. Assign momentum stage 0–6.
8. Emit alerts only for Stage 1, Stage 2, and early Stage 3.
9. Backtest signals on reconstructed historical states before any alert is treated as live.

## Data quality labels

Every number rendered in the product must carry one of:

- LIVE DATA — official or permitted feed, current window
- DELAYED DATA — licensed or public feed older than the source SLA
- ESTIMATED DATA — fixture, interpolation, or incomplete coverage
- MODEL-INFERRED DATA — score, stage, analogue, or probability

The v1 catalog in `lib/catalog.ts` is ESTIMATED. Scores computed from it are MODEL-INFERRED. Do not present them as market prices.

## Obsession metric

Demand acceleration / available-supply acceleration.

If transactions are rising while sellable inventory is contracting, and price has only moved modestly, that is the setup. A vertical price candle with falling volume is late, not early.

## What is not built yet

Marketplace connectors, population crawlers, historical backtests, portfolio storage, and real-time alerts. Those wait until a source is both legally usable and technically stable.
