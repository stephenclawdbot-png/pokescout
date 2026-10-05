# Canonical card schema

Identity key:

`set_code | card_number | language | variant | print | condition | grader | grade`

Raw cards use grader=`RAW` and grade=`0`.

## cards

- id
- set_code, set_name, card_number, name, year, language
- variant (base, reverse, illustration rare, promo stamp)
- print (unlimited, 1st edition, shadowless, reprint)
- distribution: BOOSTER, PROMO, EVENT_PROMO, POKEMON_CENTER, SPECIAL_BOX, TOURNAMENT, MAGAZINE, CAMPAIGN, STORE_PROMO, COLLABORATION, LOTTERY, PURCHASE_BONUS, ANNIVERSARY, OTHER
- character, illustrator, promo_family
- sealed_product_still_printed: boolean
- japan_exclusive: boolean

## observations

One row per listing or sale event.

- source, source_listing_id, observed_at
- side: ASK or SOLD
- price, currency, fx_to_usd
- condition, grader, grade, language
- seller_id, seller_country, ship_country
- format: AUCTION or BIN
- listed_at, sold_at, removed_at, relisted_from
- data_quality: LIVE | DELAYED | ESTIMATED

Dedup key preference: source_listing_id, else seller_id + image hash + price + day.

## population_snapshots

- card_id, grader, grade, pop, gem_rate, snapped_at, data_quality

## scores

Stored daily per identity. All score columns are MODEL-INFERRED.

- demand, scarcity, liquidity, collector_appeal, accumulation, breakout, risk
- stage 0–6
- demand_supply_ratio
- days_inventory
- supply_absorption
- volume_accel_7d, volume_accel_30d
