export type Stage = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export type CardSignal = {
  slug: string;
  name: string;
  set: string;
  number: string;
  language: "EN" | "JP" | "EU";
  distribution: string;
  price: number;
  priceChange7d: number;
  sales7d: number;
  salesPrev7d: number;
  activeListings: number;
  activeListings7dAgo: number;
  psa10Pop: number;
  popGrowth30d: number;
  stage: Stage;
  dataQuality: "LIVE" | "DELAYED" | "ESTIMATED" | "MODEL-INFERRED";
};
