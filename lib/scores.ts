import type { CardSignal } from "./types";

export function volumeAcceleration(recent: number, previous: number) {
  if (previous <= 0) return recent > 0 ? 999 : 0;
  return recent / previous;
}

export function supplyAbsorption(sold: number, newlyListed: number) {
  if (newlyListed <= 0) return sold > 0 ? 999 : 0;
  return sold / newlyListed;
}

export function daysOfInventory(active: number, dailySales: number) {
  if (dailySales <= 0) return null;
  return active / dailySales;
}

// Demand acceleration / available-supply acceleration.
// > 1 means transactions are outrunning replenishment.
export function demandVsSupply(volumeAccel: number, listingChangeRatio: number) {
  const supplyAccel = listingChangeRatio <= 0 ? 0.01 : listingChangeRatio;
  return volumeAccel / supplyAccel;
}

export function breakoutScore(c: CardSignal) {
  const vol = Math.min(volumeAcceleration(c.sales7d, c.salesPrev7d), 4) / 4;
  const listingsRatio = c.activeListings / Math.max(c.activeListings7dAgo, 1);
  const absorb = listingsRatio < 1 ? 1 - listingsRatio : 0;
  const priceNotYet = Math.max(0, 1 - Math.abs(c.priceChange7d) / 40);
  const liquidity = Math.min(c.sales7d / 20, 1);
  const raw = 0.35 * vol + 0.25 * absorb + 0.2 * priceNotYet + 0.2 * liquidity;
  return Math.round(raw * 100);
}
