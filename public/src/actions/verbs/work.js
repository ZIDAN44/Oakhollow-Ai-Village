// Work verbs: gathering, building, running a business, trading.
import { defineVerbs } from '../registry.js';
import { buyFromBusiness, buyFromMarket, gather, sellToMarket, treat } from '../trade.js';
import { chronicle, remember, say, witness } from '../../core/memory.js';
import { addItems, hasItems } from '../../core/skills.js';
import { sim } from '../../core/state.js';
import { clamp, theName } from '../../core/util.js';
import { BUSINESS_TYPES } from '../../data/economy.js';
import { addMod } from '../../social/relationships.js';
import { speak } from '../../social/speak.js';
import { judgeAction } from '../../village/laws.js';

export function verbGather(npc, act, { here, t, target }) {
  judgeAction(npc, `gathers ${here?.res?.item || 'things'} at ${here?.name || 'the fields'}`); return gather(npc, here);
}

export function verbBuild(npc, act, { here, t, target }) {
  const b = act.b;
  if (!hasItems(npc, b.cost)) { remember(npc, `You don't have enough to build a ${b.name}.`, null, 2); return; }
  addItems(npc, b.cost, -1);
  npc.action = { type: 'build', until: t + (b.kind === 'structure' ? 90 : 150), b, x: npc.x, y: npc.y, name: b.name };
  say(npc, `*starts building a ${b.name}*`, 4000, 'action');
  chronicle(`🔨 ${npc.name} started building a ${b.name}.`, npc);
  witness(npc, `${npc.name} started building a ${b.name}.`, `${npc.name} is building a ${b.name}`, { importance: 4 });
  return;
}

export function verbSell(npc, act, { here, t, target }) {
  return sellToMarket(npc, act.item);
}

export function verbBuy(npc, act, { here, t, target }) {
  return buyFromMarket(npc, act.item);
}

export function verbBuyBiz(npc, act, { here, t, target }) {
  return buyFromBusiness(npc, here, act.item);
}

export function verbProduce(npc, act, { here, t, target }) {
  const def = BUSINESS_TYPES[here?.biz?.kind] || here?.biz?.def;
  if (!def) return;
  if (!hasItems(npc, def.in)) { remember(npc, `You lacked the ingredients to ${def.produce.toLowerCase()}.`, null, 2); return; }
  addItems(npc, def.in, -1);
  npc.action = { type: 'do', until: t + 50, text: def.text, effect: 'produce', place: here.name, shift: act.shift };
  say(npc, `*${def.text}*`, 4000, 'action');
  return;
}

export function verbStock(npc, act, { here, t, target }) {
  const biz = here.biz;
  const moved = [];
  for (const item of BUSINESS_TYPES[biz.kind].sells) {
    const keep = item === 'food' ? 1 : 0;
    const n = Math.max(0, (npc.inv[item] || 0) - keep);
    if (n) { npc.inv[item] -= n; biz.stock[item] = (biz.stock[item] || 0) + n; moved.push(`${n} ${item}`); }
  }
  remember(npc, moved.length ? `You stocked your shop with ${moved.join(', ')}.` : 'You had nothing to stock.', null, 2);
  npc.action = { type: 'do', until: t + 20, text: 'arranges goods on the shelves' };
  return;
}

export function verbCollect(npc, act, { here, t, target }) {
  const biz = here.biz;
  npc.inv.coins += biz.till;
  remember(npc, `You collected ${biz.till} coins from ${theName(here.name)}.`, null, 3);
  biz.till = 0;
  npc.action = { type: 'wait', until: t + 5 };
  return;
}

export function verbPrices(npc, act, { here, t, target }) {
  here.biz.priceMult = clamp(here.biz.priceMult + (act.dir > 0 ? 0.25 : -0.25), 0.5, 2.5);
  remember(npc, `You ${act.dir > 0 ? 'raised' : 'lowered'} prices at ${theName(here.name)}.`, null, 2);
  witness(npc, `${npc.name} ${act.dir > 0 ? 'raised' : 'lowered'} the prices at ${theName(here.name)}.`, `prices at ${theName(here.name)} went ${act.dir > 0 ? 'up' : 'down'}`, { radius: 200, importance: 3 });
  npc.action = { type: 'wait', until: t + 5 };
  return;
}

export function verbQuit(npc, act, { here, t, target }) {
  const emp = sim.findNpc(npc.job?.employer);
  remember(npc, `You quit your job at the ${npc.job.place}.`, `${npc.name} quit working at the ${npc.job.place}`, 5);
  if (emp) { remember(emp, `${npc.name} quit working for you.`, null, 5); addMod(emp, npc.name, 'quit on me', { aff: -5 }, 72); }
  const p = sim.findPlace(npc.job.place);
  if (p?.biz) p.biz.employees = p.biz.employees.filter(e => e !== npc.name);
  npc.job = null;
  npc.action = { type: 'wait', until: t + 5 };
  return;
}

export function verbFire(npc, act, { here, t, target }) {
  const p = sim.findPlace(target.job?.place);
  if (p?.biz) p.biz.employees = p.biz.employees.filter(e => e !== target.name);
  target.job = null;
  speak(npc, target, { intent: 'argue', text: act.text || `I'm letting you go, ${target.name}. Don't come back to work.` });
  addMod(target, npc.name, 'fired me', { aff: -20 }, 168);
  npc.action = { type: 'talk', target: target.name, until: t + 6 };
  return;
}

export function verbTreat(npc, act, { here, t, target }) {
  return treat(npc, target);
}

export function verbRepair(npc, act, { here, t, target }) {
  const p = sim.findPlace(act.place);
  if (!p || (npc.inv.wood || 0) < 2) return;
  npc.inv.wood -= 2;
  npc.action = { type: 'do', until: t + 60, text: `repairs ${theName(p.name)}`, effect: 'repair', place: p.name, skill: 'crafting' };
  say(npc, `*repairs ${theName(p.name)}*`, 4000, 'action');
  return;
}

defineVerbs({
  'gather': verbGather,
  'build': verbBuild,
  'sell': verbSell,
  'buy': verbBuy,
  'buyBiz': verbBuyBiz,
  'produce': verbProduce,
  'stock': verbStock,
  'collect': verbCollect,
  'prices': verbPrices,
  'quit': verbQuit,
  'fire': verbFire,
  'treat': verbTreat,
  'repair': verbRepair,
});
