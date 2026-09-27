// Giving, gathering, buying, selling and healing.
import { breakLaw } from './crime.js';
import { chronicle, remember, say, wake, witness } from '../core/memory.js';
import { practice, skill } from '../core/skills.js';
import { sim } from '../core/state.js';
import { BASE_PRICES } from '../data/economy.js';
import { bizPrice, marketOpen, marketPrice, staffPresent } from '../economy/market.js';
import { recover } from '../life/health.js';
import { noteGift } from '../social/promises.js';
import { addMod } from '../social/relationships.js';
import { judgeAction } from '../village/laws.js';
import { usable } from '../world/buildings.js';
import { theName } from '../core/util.js';

// ------------------------------------------------------------------ Verbs

export function give(npc, target, item, amount, quiet) {
  amount = Math.min(amount, npc.inv[item] || 0);
  if (amount <= 0) return;
  npc.inv[item] -= amount;
  target.inv[item] = (target.inv[item] || 0) + amount;
  const what = item === 'relic' ? 'a glowing blue stone' : `${amount} ${item}`;
  noteGift(npc, target, item, amount);
  remember(npc, `You gave ${target.name} ${what}.`, null, 3);
  remember(target, `${npc.name} gave you ${what}.`, `${npc.name} gave ${target.name} ${what}`, 5);
  witness(npc, `${npc.name} gave ${target.name} ${what}.`, `${npc.name} gave ${target.name} ${what}`, { importance: 2, except: [target] });
  addMod(target, npc.name, `gave me ${item}`, { aff: 4 + Math.min(10, amount * (BASE_PRICES[item] || 2)), trust: 2 }, 120);
  if (!quiet) say(npc, `*hands ${target.name} ${what}*`, 3500, 'action');
  chronicle(`🎁 ${npc.name} gave ${target.name} ${what}.`, npc);
  target.owed = npc.name;
  wake(target);
  npc.action = { type: 'wait', until: sim.time + 5 };
}

export function gather(npc, here) {
  if (!here?.res) return;
  const res = here.res;
  if (res.amount < 1) { remember(npc, `There's nothing left to gather at ${here.name}.`, `${here.name} has been picked bare`, 4); return; }
  const trespass = here.owner && here.owner !== npc.name && npc.job?.place !== here.name && !isFamilyOf(npc, here.owner) && sim.findNpc(here.owner)?.spouse !== npc.name;
  npc.action = { type: 'gather', until: sim.time + 40, item: res.item, place: here.name, trespass };
  if (trespass) breakLaw(npc, `taking ${res.item} from ${here.owner}'s land without asking`, here.owner);
}

export function isFamilyOf(npc, name) {
  const o = sim.findNpc(name);
  return o && (npc.parents.includes(name) || o.parents.includes(npc.name));
}

export function sellToMarket(npc, item) {
  if (!marketOpen()) { remember(npc, 'The market is closed at this hour.', null, 1); return; }
  let qty = Math.min(npc.inv[item] || 0, item === 'wood' ? 3 : 2);
  const price = Math.max(1, Math.round(marketPrice(item) * 0.75 * (1 + skill(npc, 'trade') / 200)));
  qty = Math.min(qty, Math.floor((sim.market.coins || 0) / price));
  if (!qty) { remember(npc, 'The traders at the market have no coin left to buy with today.', 'the market traders have run out of coin', 3); return; }
  npc.inv[item] -= qty; npc.inv.coins += price * qty; sim.market.coins -= price * qty;
  judgeAction(npc, `sells ${item} at the market`);
  sim.market[item] = (sim.market[item] || 0) + qty;
  practice(npc, 'trade', 1);
  remember(npc, `You sold ${qty} ${item} at the market for ${price * qty} coins.`, null, 2);
  npc.action = { type: 'do', until: sim.time + 25, text: `haggles over the price of ${item}` };
  say(npc, `*sells ${qty} ${item}*`, 3000, 'action');
}

export function buyFromMarket(npc, item) {
  const price = marketPrice(item);
  if (npc.inv.coins < price || !sim.market[item]) return;
  if (!marketOpen()) return;
  npc.inv.coins -= price; npc.inv[item] = (npc.inv[item] || 0) + 1; sim.market[item]--; sim.market.coins = (sim.market.coins || 0) + price;
  remember(npc, `You bought 1 ${item} at the market for ${price} coins.`, null, 2);
  npc.action = { type: 'do', until: sim.time + 15, text: `buys ${item} at the market` };
}

export function buyFromBusiness(npc, place, item) {
  const biz = place?.biz;
  const price = bizPrice(place, item);
  if (!biz || !biz.stock[item] || npc.inv.coins < price) return;
  if (!staffPresent(place) || !usable(place)) { remember(npc, `Nobody is minding ${theName(place.name)} right now.`, null, 1); return; }
  npc.inv.coins -= price; biz.till += price; biz.stock[item]--;
  if (item === 'meal') { npc.needs.hunger = Math.max(0, npc.needs.hunger - 65); npc.action = { type: 'eat', until: sim.time + 20 }; }
  else { npc.inv[item] = (npc.inv[item] || 0) + 1; npc.action = { type: 'wait', until: sim.time + 8 }; }
  const owner = sim.findNpc(biz.owner);
  if (owner) addMod(owner, npc.name, 'is a good customer', { aff: 2 }, 96);
  remember(npc, `You bought ${item} at ${theName(place.name)} for ${price} coins.`, null, 2);
}

export function treat(healer, patient) {
  if (!patient) return;
  let ok = false;
  if (healer.inv.remedy > 0) { healer.inv.remedy--; ok = true; }
  else if (healer.inv.herbs >= 2) { healer.inv.herbs -= 2; ok = Math.random() < 0.3 + skill(healer, 'herbalism') / 100; }
  healer.action = { type: 'do', until: sim.time + 30, text: `tends to ${patient.name}` };
  say(healer, `*tends to ${patient.name}*`, 4000, 'action');
  practice(healer, 'herbalism', 3);
  if (ok) {
    recover(patient, `${healer.name}'s treatment`);
    patient.health = Math.min(100, patient.health + 20);
    addMod(patient, healer.name, 'healed me', { aff: 20, trust: 15 }, 240);
    chronicle(`🌿 ${healer.name} healed ${patient.name}.`, healer, 'life');
    if (patient.inv.coins >= 3) { patient.inv.coins -= 3; healer.inv.coins += 3; }
  } else remember(healer, `Your treatment of ${patient.name} didn't work.`, null, 3);
}
