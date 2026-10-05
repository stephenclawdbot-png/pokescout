export type Distribution =
  | "BOOSTER"
  | "PROMO"
  | "EVENT_PROMO"
  | "POKEMON_CENTER"
  | "SPECIAL_BOX"
  | "TOURNAMENT"
  | "MAGAZINE"
  | "CAMPAIGN"
  | "STORE_PROMO"
  | "COLLABORATION"
  | "LOTTERY"
  | "PURCHASE_BONUS"
  | "ANNIVERSARY"
  | "OTHER";

export type Stage = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export type CardInput = {
  slug: string;
  name: string;
  set: string;
  number: string;
  language: string;
  year: number;
  distribution: Distribution;
  character: string;
  promoFamily?: string;
  illustrator?: string;
  japanExclusive?: boolean;
  sealedStillPrinted?: boolean;
  nickname?: string;
  price: number;
  priceChange7d: number;
  priceChange30d: number;
  sales24h: number;
  sales7d: number;
  salesPrev7d: number;
  sales30d: number;
  salesPrev30d: number;
  uniqueBuyers7d: number;
  activeListings: number;
  activeListings7dAgo: number;
  activeListings30dAgo: number;
  newListings7d: number;
  soldListings7d: number;
  psa10Pop: number;
  popGrowth30d: number;
  jpPrice?: number | null;
  usPrice?: number | null;
  sellerTopShare?: number;
};

export type Scores = {
  demand: number;
  scarcity: number;
  liquidity: number;
  collector: number;
  accumulation: number;
  breakout: number;
  risk: number;
  stage: Stage;
  stageLabel: string;
  volumeAccel7d: number;
  supplyAbsorption: number;
  daysInventory: number | null;
  demandSupplyRatio: number;
  dataQuality: "ESTIMATED";
  scoreQuality: "MODEL-INFERRED";
};

const STAGE: Record<Stage, string> = {
  0: "Dormant",
  1: "Early accumulation",
  2: "Demand acceleration",
  3: "Breakout",
  4: "Price discovery",
  5: "Mania",
  6: "Distribution / cooling",
};

function clamp(n: number) {
  return Math.max(0, Math.min(100, Math.round(n)));
}

export function volumeAccel(recent: number, previous: number) {
  if (previous <= 0) return recent > 0 ? 4 : 0;
  return recent / previous;
}

export function scoreCard(c: CardInput): Scores {
  const vol = volumeAccel(c.sales7d, c.salesPrev7d);
  const listingRatio = c.activeListings / Math.max(c.activeListings7dAgo, 1);
  const absorption = c.newListings7d <= 0 ? (c.soldListings7d > 0 ? 3 : 0) : c.soldListings7d / c.newListings7d;
  const daily = c.sales7d / 7;
  const days = daily > 0 ? c.activeListings / daily : null;
  const supplyAccel = listingRatio <= 0 ? 0.05 : listingRatio;
  const demandSupply = vol / supplyAccel;

  const demand = clamp(
    Math.min(vol, 3) / 3 * 45 +
    Math.min(c.sales7d, 40) / 40 * 35 +
    Math.min(c.uniqueBuyers7d, 25) / 25 * 20
  );

  const dist =
    c.distribution === "BOOSTER" ? 25 :
    c.distribution === "STORE_PROMO" ? 45 :
    c.distribution === "PROMO" || c.distribution === "CAMPAIGN" ? 70 :
    c.distribution === "EVENT_PROMO" || c.distribution === "LOTTERY" || c.distribution === "COLLABORATION" ? 85 :
    60;
  const scarcity = clamp(
    dist * 0.45 +
    (c.sealedStillPrinted ? 0 : 25) +
    (c.japanExclusive ? 12 : 0) +
    Math.max(0, 18 - c.popGrowth30d * 4)
  );

  const liquidity = clamp(
    Math.min(c.sales7d / 30, 1) * 70 +
    (days !== null && days < 21 ? 30 : days !== null && days < 60 ? 15 : 0)
  );

  const iconic = c.nickname ? 30 : 0;
  const collector = clamp(40 + iconic + (c.japanExclusive ? 10 : 0) + (c.illustrator ? 8 : 0));

  const priceFlat = Math.abs(c.priceChange7d) <= 12 ? 1 : Math.abs(c.priceChange7d) <= 25 ? 0.45 : 0.1;
  const inventoryDown = listingRatio < 1 ? 1 - listingRatio : 0;
  const accumulation = clamp(
    (Math.min(vol, 3) / 3) * 40 * priceFlat +
    inventoryDown * 35 +
    Math.min(absorption, 2.5) / 2.5 * 25
  );

  const popOk = c.popGrowth30d < 8 ? 1 : 0.4;
  const wallThin = days !== null && days < 10 ? 1 : days !== null && days < 20 ? 0.6 : 0.25;
  const cross = c.jpPrice && c.usPrice && c.jpPrice < c.usPrice * 0.85 ? 1 : 0.3;
  const momentum = Math.min(Math.abs(c.priceChange7d) / 30, 1);
  const breakout = clamp(
    demand * 0.20 +
    accumulation * 0.15 +
    liquidity * 0.15 +
    scarcity * 0.10 +
    collector * 0.10 +
    cross * 100 * 0.10 +
    popOk * 100 * 0.10 +
    wallThin * 100 * 0.05 +
    momentum * 100 * 0.05
  );

  const risk = clamp(
    (c.sellerTopShare ?? 0) * 40 +
    (c.sales7d < 4 ? 30 : 0) +
    (c.priceChange7d > 40 ? 25 : 0) +
    (c.sealedStillPrinted ? 15 : 0) +
    (c.popGrowth30d > 10 ? 20 : 0)
  );

  let stage: Stage = 0;
  if (c.priceChange30d > 80 && vol < 1) stage = 6;
  else if (c.priceChange30d > 60 && vol >= 1) stage = 5;
  else if (c.priceChange7d > 25 && vol >= 1.2) stage = 4;
  else if (c.priceChange7d > 15 && vol >= 1.4 && listingRatio < 1) stage = 3;
  else if (vol >= 1.6 && listingRatio < 0.9 && Math.abs(c.priceChange7d) < 20) stage = 2;
  else if (vol >= 1.25 && listingRatio <= 1 && Math.abs(c.priceChange7d) < 15) stage = 1;

  return {
    demand,
    scarcity,
    liquidity,
    collector,
    accumulation,
    breakout,
    risk,
    stage,
    stageLabel: STAGE[stage],
    volumeAccel7d: Math.round(vol * 100) / 100,
    supplyAbsorption: Math.round(absorption * 100) / 100,
    daysInventory: days === null ? null : Math.round(days * 10) / 10,
    demandSupplyRatio: Math.round(demandSupply * 100) / 100,
    dataQuality: "ESTIMATED",
    scoreQuality: "MODEL-INFERRED",
  };
}

export function whyFlagged(c: CardInput, s: Scores) {
  const lines = [
    `7D volume acceleration ${s.volumeAccel7d}x (${c.salesPrev7d} → ${c.sales7d})`,
    `listings ${c.activeListings7dAgo} → ${c.activeListings}`,
    `supply absorption ${s.supplyAbsorption}x (sold / new listings)`,
    `price ${c.priceChange7d >= 0 ? "+" : ""}${c.priceChange7d}% over 7D`,
    `${c.distribution.replaceAll("_", " ").toLowerCase()} · ${c.character}`,
  ];
  if (s.stage >= 5) lines.push("price already extended — do not chase");
  return lines;
}
