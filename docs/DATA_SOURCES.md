# Data sources and limits

Do not scrape every marketplace on a short interval. Prefer official APIs, permitted delayed feeds, and third-party datasets. If a source is blocked or ToS-hostile, leave the field empty and label it missing.

| Source | Access | What it can honestly provide | Label |
| --- | --- | --- | --- |
| TCGplayer API | Closed to new developers since the eBay acquisition. Existing seller keys only. | Catalog, market/low/mid, listings for keyed sellers | DELAYED if a partner key exists; otherwise unavailable |
| eBay Browse / Marketplace Insights | Official API, app key, rate limits. Sold data is restricted. | Active listings; sold comps only where the account is allowed | LIVE or DELAYED |
| Cardmarket | No general public price API. Seller tools are account-scoped. | Asking prices via third-party datasets | DELAYED |
| PriceCharting API | Paid key | Sold-comp guides, including graded medians | DELAYED |
| pokemontcg.io / Scrydex | API key, catalog-first | Sets, numbers, images, TCGplayer/Cardmarket snapshots | DELAYED |
| TCGdex | Open catalog, no key | Multilingual set/card identity, images | LIVE catalog, no sales |
| JustTCG / PokeTrace / similar | Paid keys | Aggregated US/EU prices, some sold counts | DELAYED |
| Mercari / Mercari JP | No stable public API for this use | Do not scrape | unavailable |
| Yahoo Auctions Japan | No general public API | Do not scrape | unavailable |
| Rakuten / shop fronts | Mostly HTML | Do not crawl on a timer | unavailable |
| SNKRDUNK | No public card API confirmed | Leave empty | unavailable |
| Fanatics Collect / Goldin / Heritage | Auction archives, often public pages or partner feeds | Realized auction prices, low frequency | DELAYED |
| PSA population | PSA offers population reports; bulk API is not open | Population snapshots where a permitted export exists | DELAYED |
| CGC / BGS population | Public lookups, no bulk open API | Same as PSA | DELAYED |

Japan leading the West is a first-class feature, but it requires a permitted JP feed. Until that exists, Japan columns stay empty rather than invented.

Social mentions are a weak input. Transaction counts outrank them in the demand score.
