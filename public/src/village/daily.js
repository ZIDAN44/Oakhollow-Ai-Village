// The village economy's daily rhythm: tills, taxes, trade, food spoiling.
import { chronicle, remember, worldEventAll } from '../core/memory.js';
import { sim } from '../core/state.js';
import { arrive } from '../life/arrivals.js';
import { addMod } from '../social/relationships.js';

export function collectTills() {
  // Business owners take the day's earnings home, leaving a float for wages.
  for (const p of sim.places) {
    const owner = p.biz && sim.findNpc(p.biz.owner);
    if (owner && p.biz.till > 10) {
      const take = p.biz.till - 10;
      owner.inv.coins += take; p.biz.till = 10;
      remember(owner, `You took ${take} coins home from the ${p.name}'s till.`, null, 3);
    }
  }
}

export function collectTaxes() {
  // Taxes
  if (sim.laws.includes('tax')) {
    let paid = 0;
    for (const n of sim.npcs) {
      if (n.age < 16 || n.name === sim.leader) continue;
      if (n.inv.coins >= 2) { n.inv.coins -= 2; paid += 2; remember(n, 'You paid 2 coins in tax.', null, 2); }
      else { remember(n, 'You could not pay the tax. The leader will not be pleased.', null, 4); if (sim.leader) addMod(n, sim.leader, 'taxes us into poverty', { aff: -5 }, 96); }
    }
    sim.treasury += paid;
    if (paid) chronicle(`💰 ${paid} coins collected in taxes.`, null, 'event');
  }
}

export function tradeSurplus() {
  // The market trades with the outside world: surplus goods are carted off and sold for coin.
  for (const item of ['food', 'wood', 'herbs', 'bread', 'tool', 'remedy']) {
    const extra = (sim.market[item] || 0) - 8;
    if (extra > 0) { sim.market[item] -= extra; sim.market.coins = (sim.market.coins || 0) + Math.round(extra * 1.5); }
  }
  sim.market.coins = Math.max(sim.market.coins || 0, 15);
}

export function dailyArrivalsAndShortages() {
  // Strangers (fewer come in winter)
  if (sim.settings.arrivals && sim.npcs.length < 18 && Math.random() < (sim.season() === 'Winter' ? 0.1 : 0.25)) arrive();

  const farm = sim.findPlace('Hale Farm');
  if (farm?.res && farm.res.amount < 8) worldEventAll('The fields are nearly bare. Food is getting scarce in Oakhollow.', 6);
}

// Food goes off: bread in days, grain and fish slower, herbs slowly. Stored stock too.
export function spoilFood() {
  const RATE = { food: 0.03, bread: 0.2, meal: 0.5, herbs: 0.06 }; // stored grain keeps; bread goes stale; cooked meals don't last
  const rot = (bag) => {
    for (const [item, r] of Object.entries(RATE)) {
      const have = bag[item] || 0;
      if (!have) continue;
      const lost = Math.floor(have * r + Math.random());
      bag[item] = Math.max(0, have - Math.min(have, lost));
    }
  };
  for (const n of sim.npcs) rot(n.inv);
  for (const p of sim.places) if (p.biz) rot(p.biz.stock);
  rot(sim.market);
}
