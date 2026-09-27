// A RimWorld-style storyteller that stirs things up when life gets quiet.
import { remember, worldEventAll } from '../core/memory.js';
import { sim } from '../core/state.js';
import { pick } from '../core/util.js';
import { arrive } from '../life/arrivals.js';
import { fallSick } from '../life/health.js';
import { addProblem } from './problems-core.js';
import { damagePlace } from '../world/buildings.js';
import { changeWeather } from '../world/weather.js';

// ------------------------------------------------------------------ Storyteller
// Like RimWorld's Cassandra: when things have been calm for a while, something happens.

export function storyteller(force = false) {
  if (!force) {
    if (!sim.settings.storyteller) return;
    const quiet = sim.time - sim.lastStoryEvent;
    if (quiet < 6 * 60 || sim.tension > 25 || Math.random() > 0.35) return;
  }
  const events = [
    ['wolves', () => !sim.problem('wolves'), () => { addProblem('wolves'); worldEventAll('Wolves have been seen prowling in Whisperwood Forest! It is dangerous to go there alone.', 7, '🐺'); }],
    ['storm', () => sim.weather.kind !== 'storm' && sim.season() !== 'Winter', () => changeWeather('storm')],
    ['blizzard', () => sim.season() === 'Winter', () => { changeWeather('snow'); worldEventAll('A blizzard buries the village in snow. Anyone caught outside will freeze.', 6); }],
    ['sickness', () => sim.npcs.some(n => !n.sick && !n.immortal && sim.time > (n.immuneUntil || 0)), () => fallSick(pick(sim.npcs.filter(n => !n.sick && !n.immortal && sim.time > (n.immuneUntil || 0))), 'a bad fever')],
    ['traveller', () => sim.settings.arrivals && sim.npcs.length < 18, () => arrive()],
    ['caravan', () => true, () => { Object.assign(sim.market, { food: sim.market.food + 8, tool: (sim.market.tool || 0) + 2, herbs: (sim.market.herbs || 0) + 4, coins: (sim.market.coins || 0) + 40 }); worldEventAll('A merchant caravan passed through: the Market is well stocked, and the traders left coin to buy local goods.', 5); }],
    ['messenger', () => sim.findNpc('Sera'), () => worldEventAll('A royal messenger rides in, asking everyone about a runaway noblewoman named Seraphine Valcourt. There is a reward of 30 coins for news of her.', 8)],
    ['bounty', () => sim.season() !== 'Winter', () => { const f = sim.findPlace('Hale Farm'); if (f?.res) f.res.amount = f.res.max; worldEventAll('The crops have ripened all at once. Hale Farm is bursting with food!', 4); }],
    ['fire', () => sim.places.some(p => p.type === 'house' || p.biz), () => { const h = pick(sim.places.filter(p => p.type === 'house' || p.biz)); damagePlace(h, 40 + Math.random() * 30, 'a fire'); const o = sim.findNpc(h.owner || h.biz?.owner); if (o) { o.inv.food = Math.floor(o.inv.food / 2); remember(o, 'The fire destroyed half your food.', null, 7); } }],
    ['theft', () => sim.npcs.some(n => n.inv.coins > 10), () => strangerTheft()],
  ].filter(e => e[1]());
  if (!events.length) return;
  const [, , run] = pick(events);
  sim.lastStoryEvent = sim.time;
  run();
}

// A thief passing through on the road robs someone. (Villagers only steal when *they* choose to.)
export function strangerTheft() {
  const victim = pick(sim.npcs.filter(n => n.inv.coins > 10));
  const amount = Math.min(victim.inv.coins, 5 + Math.floor(Math.random() * 8));
  victim.inv.coins -= amount;
  remember(victim, `Someone stole ${amount} coins from you! You don't know who.`, `${victim.name} was robbed of ${amount} coins`, 8);
  worldEventAll(`${victim.name} has been robbed of ${amount} coins. Nobody knows who did it.`, 6, '🤫');
  if (!sim.problem('robbery')) addProblem('robbery', { culprit: null });
}
