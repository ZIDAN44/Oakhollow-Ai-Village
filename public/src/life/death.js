// Death: grief, inheritance and the funeral.
import { chronicle, remember } from '../core/memory.js';
import { sim } from '../core/state.js';
import { P } from '../identity/identity.js';
import { createGathering } from './gatherings.js';
import { opinion } from '../social/relationships.js';

// ------------------------------------------------------------------ Death, funerals, inheritance

export function die(n, cause) {
  if (!sim.npcs.includes(n)) return;
  sim.npcs.splice(sim.npcs.indexOf(n), 1);
  n.deathDay = sim.day();
  n.cause = cause;
  sim.dead.push(n);
  if (sim.selected === n) sim.selected = null;
  chronicle(`🕯️ ${n.name} (${n.age}) has died of ${cause}.`, n, 'life');

  const gy = sim.findPlace('Graveyard');
  if (gy) gy.graves = [...(gy.graves || []), n.name];
  passOnBelongings(n);
  for (const o of sim.npcs) { mourn(o, n, cause); loosenTies(o, n); }
  if (sim.leader === n.name) sim.leader = null;
  // The village gathers to bury them: tomorrow morning at the graveyard.
  if (gy && n.age >= 1) {
    const start = (Math.floor(sim.time / 1440) + 1) * 1440 + 10 * 60;
    createGathering({ kind: 'funeral', title: `${n.name}'s funeral`, place: gy.name, start, end: start + 180, about: n.name });
  }
}

// Inheritance: spouse, then children, then the village treasury.
function passOnBelongings(n) {
  const heir = sim.findNpc(n.spouse) || n.children.map(c => sim.findNpc(c)).find(c => c && c.age >= 12);
  if (!heir) { sim.treasury += n.inv.coins || 0; return; }
  for (const [k, v] of Object.entries(n.inv)) if (v) heir.inv[k] = (heir.inv[k] || 0) + v;
  remember(heir, `You inherited ${n.name}'s belongings.`, null, 6);
  for (const p of sim.places) {
    if (p.owner === n.name) p.owner = heir.name;
    if (p.biz?.owner === n.name) p.biz.owner = heir.name;
  }
}

function closeness(o, n) {
  const partner = o.spouse === n.name || o.partner === n.name ? 60 : 0;
  const family = o.parents.includes(n.name) || o.children.includes(n.name) ? 60 : 0;
  return opinion(o, n.name) + partner + family;
}

function mourn(o, n, cause) {
  const close = closeness(o, n);
  remember(o, `${n.name} has died (${cause}).`, `${n.name} died of ${cause}`, close > 30 ? 10 : 6);
  if (close <= 25) return;
  o.grief = { name: n.name, at: sim.time };
  o.moodScore = 0;
  o.lifeMemories.push(`${n.name} died on day ${sim.day()}. ${close > 60 ? `Part of me died with ${P(n).them}.` : `I will miss ${P(n).them}.`}`);
}

function loosenTies(o, n) {
  if (o.spouse === n.name) { o.spouse = null; o.partner = null; o.widowed = n.name; }
  if (o.partner === n.name) o.partner = null;
  if (o.guardian === n.name) o.guardian = null;
  o.requests = (o.requests || []).filter(r => r.from !== n.name);
  if (o.job?.employer === n.name) o.job = null;
}
