# PokéScout Terminal

A market terminal for every English Pokémon card ever printed (~20,700 cards, ~176 sets): prices, movers, set and Pokémon indices, and a full screener.

## What's on screen

| Tab | What it shows |
| --- | --- |
| **1 MARKET** | Index tiles (PKMN-ALL, PKMN-100, WOTC Vintage, Modern Chase) with breadth bars · a heatmap of every set grouped by era (tile size = set value, colour = move) · top gainers / losers · most valuable cards · US vs EU price gap · era table |
| **2 SCREENER** | All cards in one virtualized table. Sort any column; filter by era, series, set, rarity, type, price band, free text (name / set / artist / number) |
| **3 SETS** | Every set: release date, card count, cost to buy one of everything, move, breadth, top card |
| **4 POKÉMON** | One index per Pokémon (every card featuring it by Pokédex number): total value, move, top card |
| **5 WATCHLIST** | Cards you starred (stored in your browser) |

Click any card for the detail drawer: big art, every price field, daily price history, other cards of the same Pokémon, and links to TCGplayer, Cardmarket, eBay sold and PriceCharting.

Keys: `/` search · `1`–`5` tabs · `Esc` close.

## How "moving" is measured

The **MOVE BASIS** switch in the tab bar picks the signal used everywhere:

- **EU7D** (available from day one): Cardmarket 7-day average sell price vs its 30-day average. "Confirmed" means Cardmarket's trend price agrees in direction.
- **US1D / US7D / US30D**: change in TCGplayer market price, from PokéScout's own daily snapshots. These appear once enough history exists (2, 6 and 27 days). The default switches to US7D automatically once it's available.

Indices are price-weighted: they show how much a basket holding one copy of each card moved.

## Data

`npm run ingest` (or the daily GitHub Action) writes:

- `public/data/market.json`: every card with current prices and derived moves (the app loads this)
- `public/data/history/<set>.json`: daily TCGplayer market price per card (up to 400 days)

Sources: pokemontcg.io (card universe and TCGplayer USD, daily) and TCGdex (Cardmarket EUR averages, daily). Both are free, with no key needed. Set `POKEMONTCG_API_KEY` for higher pokemontcg.io rate limits. See `docs/DATA_SOURCES.md` for what is and isn't covered.

## Run

```bash
npm install
npm run ingest   # ~15–20 min: ~84 bulk pages + ~19k Cardmarket lookups
npm run dev
```

Deploys as a plain Next.js app (Vercel). The workflow in `.github/workflows/ingest.yml` refreshes the data nightly and commits it, which triggers a redeploy.
