// Options for work, learning and building.
import { resWord } from '../perception.js';
import { sim } from '../../core/state.js';
import { pick } from '../../core/util.js';
import { BUILDABLES, BUSINESS_TYPES } from '../../data/economy.js';
import { SKILLS } from '../../data/skills.js';
import { bizPrice, marketOpen, marketPrice, staffPresent } from '../../economy/market.js';
import { usable } from '../../world/buildings.js';

// Work and money
export function optionsWorkAndMoney(npc, ctx) {
  for (const group of WORK_OPTIONS) group(npc, ctx);
}

function gatherOption(npc, { here, add }) {
if (here?.res && here.res.amount >= 1) {
  const mine = !here.owner || here.owner === npc.name || npc.job?.place === here.name || sim.findNpc(here.owner)?.spouse === npc.name;
  add(mine ? `Work: gather ${here.res.item} here` : `Take ${here.res.item} from ${here.owner}'s land`, mine ? `Collect ${here.res.item} (${resWord(here.res)}).` : `This is ${here.owner}'s land. Taking from it without permission is stealing.`, { type: 'gather' });
}
}

function jobOptions(npc, { here, add }) {
if (npc.job) {
  const jp = sim.findPlace(npc.job.place);
  if (jp?.biz) add(`Work your shift at the ${jp.name}`, `Earn ${npc.job.wage} coins working for ${npc.job.employer}.`, { type: 'produce', at: jp.name, shift: true, label: 'work a shift' });
  add(`Quit your job at the ${npc.job.place}`, 'Stop working there.', { type: 'quit' });
}
}

function ownBusinessOptions(npc, { here, add }) {
for (const b of sim.places.filter(p => p.biz?.owner === npc.name)) {
  const def = BUSINESS_TYPES[b.biz.kind] || b.biz.def;
  if (!def) continue;
  add(`${def.produce} at your ${b.name}`, `Run your business.${Object.keys(def.in).length ? ` Needs ${Object.entries(def.in).map(([k, v]) => `${v} ${k}`).join(', ')}.` : ''}`, { type: b.biz.kind === 'shop' ? 'stock' : 'produce', at: b.name, label: 'work' });
  if (b.biz.till > 0 && here === b) add(`Collect ${b.biz.till} coins from the till`, 'Take your earnings.', { type: 'collect' });
  if (here === b) {
    add('Raise your prices', `Currently ${Math.round(b.biz.priceMult * 100)}% of normal.`, { type: 'prices', dir: 1 });
    add('Lower your prices', 'Attract more customers.', { type: 'prices', dir: -1 });
  }
}
}

function shopOptions(npc, { here, add }) {
if (here?.biz && here.biz.owner !== npc.name) {
  const open = staffPresent(here) && usable(here);
  for (const [item, qty] of Object.entries(open ? here.biz.stock : {})) {
    const price = bizPrice(here, item);
    if (qty > 0 && npc.inv.coins >= price) add(`Buy ${item === 'meal' ? 'a hot meal' : item} here (${price} coins)`, `From ${here.biz.owner || 'the shop'}.`, { type: 'buyBiz', item });
  }
  const owner = sim.findNpc(here.biz.owner);
  if (here.biz.till > 0 && (!owner || sim.dist(owner, npc) > 150)) add(`Rob the till of the ${here.name}`, `The owner isn't here. Steal ${here.biz.till} coins. A crime.`, { type: 'robBiz' });
}
}

function marketOptions(npc, { here, add }) {
if (here?.market && marketOpen()) {
  const goods = [...new Set(['food', 'wood', 'herbs', 'bread', 'tool', 'remedy', ...Object.keys(npc.inv).filter(k => !['coins', 'relic', 'water'].includes(k))])];
  for (const item of goods) {
    if ((npc.inv[item] || 0) > (item === 'food' ? 1 : 0)) add(`Sell ${item} at the market`, `Market pays about ${Math.round(marketPrice(item) * 0.75)} coins each.`, { type: 'sell', item });
    if (sim.market[item] > 0 && npc.inv.coins >= marketPrice(item)) add(`Buy ${item} at the market (${marketPrice(item)} coins)`, `${sim.market[item]} available.`, { type: 'buy', item });
  }
}
}

const WORK_OPTIONS = [gatherOption, jobOptions, ownBusinessOptions, shopOptions, marketOptions];

// Learning
export function optionsLearning(npc, ctx) {
  const { here, add } = ctx;
  if (here?.books) {
    const target = SKILLS.find(s => (npc.goal || '').toLowerCase().includes(s)) || pick(SKILLS);
    add(`Study ${target} from books`, 'Read and learn.', { type: 'study', skill: target });
    add('Study scholarship from books', 'Read and learn.', { type: 'study', skill: 'scholarship' });
  }
  const school = sim.places.find(p => p.biz?.kind === 'school' && p.biz.owner !== npc.name);
  if (school && here === school) add('Attend a class (1 coin)', 'Learn with others.', { type: 'study', skill: 'scholarship' });
}

// Building
export function optionsBuilding(npc, ctx) {
  const { here, add } = ctx;
  const ownsHouse = sim.places.some(p => p.type === 'house' && p.owner === npc.name);
  const openGround = !here || ['square', 'road', 'forest', 'market'].includes(here.type);
  if (openGround) {
    for (const b of BUILDABLES) {
      if (b.kind === 'house' && ownsHouse) continue;
      if (b.kind === 'structure' && sim.places.some(p => p.name === b.name)) continue;
      if (b.kind === 'business' && sim.places.some(p => p.biz?.owner === npc.name && p.biz.kind === b.biz)) continue;
      if (b.needsBelief && !npc.belief) continue;
      const cost = Object.entries(b.cost).map(([k, v]) => `${v} ${k}`).join(', ');
      const can = Object.entries(b.cost).every(([k, v]) => (npc.inv[k] || 0) >= v);
      if (can) add(`Build ${b.kind === 'business' ? 'and open your own ' : b.kind === 'house' ? 'your own ' : 'a '}${b.name} here (${cost})`, b.desc, { type: 'build', b });
    }
  }
}
