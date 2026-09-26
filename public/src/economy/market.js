// Prices, opening hours and whether a shop is staffed.
import { sim } from '../core/state.js';
import { clamp } from '../core/util.js';
import { BASE_PRICES } from '../data/economy.js';

// ------------------------------------------------------------------ Market prices (used in talk and economy)

export function marketPrice(item) {
  const base = BASE_PRICES[item] || 3;
  const stock = sim.market[item] || 0;
  let scarcity = clamp(1.7 - stock / 8, 0.6, 2.5);
  if (item === 'food') {
    const farm = sim.findPlace('Hale Farm');
    if (farm?.res && farm.res.amount < 10) scarcity += 0.5;
  }
  return Math.max(1, Math.round(base * scarcity));
}

export const marketOpen = () => sim.hour() >= 6 && sim.hour() < 20;

export function bizPrice(place, item) {
  return Math.max(1, Math.round((BASE_PRICES[item] || 3) * (place.biz?.priceMult || 1)));
}

export function staffPresent(place) {
  const biz = place?.biz;
  if (!biz) return false;
  const c = sim.center(place);
  return [biz.owner, ...(biz.employees || [])].some(n => { const p = sim.findNpc(n); return p && p.action?.type !== 'sleep' && sim.dist(p, c) < 150; });
}
